/**
 * SCREENSHOT + LAYOUT CHECK — drives the locally-installed Chrome over the DevTools Protocol.
 *
 *   node scripts/screenshot.mjs <url> [--out=docs/screenshots] [--label=page]
 *
 * ── WHY THIS EXISTS RATHER THAN `npm i -D playwright` ───────────────────────────────────────
 * Playwright downloads ~300 MB of browsers and adds a dependency to a repo whose brief is
 * explicitly "do not add new packages unless genuinely necessary". Chrome is already installed on
 * this machine and every CI image that runs a browser has one; Node 22+ ships a WebSocket client
 * in core. That is everything the DevTools Protocol needs, so this file has NO imports beyond
 * node builtins.
 *
 * ── WHAT IT CHECKS, NOT JUST CAPTURES ───────────────────────────────────────────────────────
 * A screenshot proves what a page looked like; it does not prove the layout is sound. Chrome's
 * `--screenshot` flag CLIPS content wider than the window, so horizontal overflow looks
 * identical to a correct narrow layout. So each viewport is also measured:
 *
 *   documentScrollWidth  vs  innerWidth   → horizontal overflow (the mobile killer)
 *   the widest offending element          → named, so the fix is obvious
 *
 * Exits non-zero when a viewport overflows, so this can gate a build.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error("No Chrome/Edge found. Set CHROME_PATH to a browser binary.");
  process.exit(1);
}

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
if (!url) {
  console.error("Usage: node scripts/screenshot.mjs <url> [--out=dir] [--label=name]");
  process.exit(1);
}
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const outDir = resolve(opt("out", "docs/screenshots"));
const label = opt("label", "page");
/** Screenshots are capped to this height unless --full is passed. See the capture call below. */
const MAX_CAPTURE_HEIGHT = Number(opt("max-height", "4000"));
const fullPage = args.includes("--full");
mkdirSync(outDir, { recursive: true });

/** The viewports the brief names, plus the two that break layouts most often. */
const VIEWPORTS = [
  { name: "mobile-390", width: 390, height: 844, mobile: true, scale: 2 },
  { name: "mobile-320", width: 320, height: 640, mobile: true, scale: 2 },
  { name: "tablet-768", width: 768, height: 1024, mobile: true, scale: 2 },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false, scale: 1 },
];

const port = 9222 + Math.floor(Math.random() * 200);
const userDataDir = join(process.env.TEMP || "/tmp", `poc-shot-${port}`);

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--hide-scrollbars",
  "--window-size=1600,1200",
  `--user-data-dir=${userDataDir}`,
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function debuggerUrl() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("Chrome did not expose a debugging port.");
}

/** Minimal CDP client over the built-in WebSocket. */
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const events = new Map();
  let nextId = 1;

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method && events.has(msg.method)) {
      events.get(msg.method).forEach((fn) => fn(msg.params));
    }
  });

  const ready = new Promise((res, rej) => {
    ws.addEventListener("open", res);
    ws.addEventListener("error", () => rej(new Error("CDP socket failed")));
  });

  return {
    ready,
    send(method, params = {}, sessionId) {
      const id = nextId++;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    on(method, fn) {
      if (!events.has(method)) events.set(method, []);
      events.get(method).push(fn);
    },
    close: () => ws.close(),
  };
}

/**
 * Measure horizontal overflow and name the widest offender.
 *
 * `scrollWidth > innerWidth` is the definition of a page that scrolls sideways. The element
 * walk then finds what is actually sticking out, because "the page overflows by 40px" is not
 * actionable and "this <table> is 430px wide" is.
 */
const OVERFLOW_PROBE = `(() => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const scrollWidth = Math.max(doc.scrollWidth, document.body.scrollWidth);

  /* Report where the overflow ORIGINATES, not every descendant that inherits it.
   *
   * An element counts only if IT sticks out while its PARENT does not — that is the boundary
   * where the layout first breaks, and it is the element whose CSS needs the fix. Listing every
   * child as well buries the answer under its own descendants. Each hit also records whether an
   * ancestor clips it, because a wide table inside overflow-x-auto is deliberate design rather
   * than a bug, and the two need telling apart. */
  const clippedBy = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") {
        return n.tagName.toLowerCase() + "." + String(n.className || "").split(" ").slice(0, 3).join(".");
      }
    }
    return null;
  };

  const offenders = [];
  if (scrollWidth > vw + 1) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 1) continue;
      const parent = el.parentElement;
      if (parent && parent !== document.body) {
        const pr = parent.getBoundingClientRect();
        if (pr.right > vw + 1) continue; // the parent already breaks out; report that instead
      }
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 100),
        right: Math.round(r.right),
        width: Math.round(r.width),
        clipped: clippedBy(el),
        text: (el.textContent || "").trim().slice(0, 50),
      });
    }
    offenders.sort((a, b) => b.right - a.right);
  }
  /* DIAGNOSTIC: the single widest extent in the document, ignoring clipping entirely, plus the
   * widest SCROLL CONTAINER. When scrollWidth exceeds the viewport but no unclipped element does,
   * the cause is usually a scroll container that is itself too wide. */
  let maxRight = 0, maxEl = null;
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > maxRight) { maxRight = r.right; maxEl = el; }
  }
  const widest = maxEl ? {
    tag: maxEl.tagName.toLowerCase(),
    cls: String(maxEl.className || "").slice(0, 110),
    right: Math.round(maxRight),
    width: Math.round(maxEl.getBoundingClientRect().width),
  } : null;

  const bodyRect = document.body.getBoundingClientRect();
  return JSON.stringify({
    vw,
    scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    docScrollWidth: doc.scrollWidth,
    bodyWidth: Math.round(bodyRect.width),
    widest,
    offenders: offenders.slice(0, 8),
  });

})()`;

async function main() {
  const wsUrl = await debuggerUrl();
  const client = connect(wsUrl);
  await client.ready;

  console.log("connected to CDP");
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });

  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);

  let overflowFailures = 0;
  const results = [];

  for (const vp of VIEWPORTS) {
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: vp.width,
        screenHeight: vp.height,
      },
      sessionId,
    );

    const loaded = new Promise((res) => {
      const off = () => res();
      client.on("Page.loadEventFired", off);
      setTimeout(off, 25000); // never hang the run on a stalled asset
    });
    console.log("   navigating " + vp.name + " …");
    await client.send("Page.navigate", { url }, sessionId);
    await loaded;

    /* RE-APPLY the metrics after load. A navigation resets the emulation override in headless
     * Chrome, so an override set only beforehand silently reverts and every "mobile" capture
     * comes back at the default window width — which looks like a correct narrow layout and is
     * how a real overflow would slip through this check unnoticed. */
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: vp.width,
        screenHeight: vp.height,
      },
      sessionId,
    );
    // Let fonts settle and the lazy workspace island mount before measuring or capturing.
    await sleep(2000);

    /* Trigger lazy loading before measuring or capturing.
     *
     * captureBeyondViewport renders the full page height but does NOT scroll, so every
     * below-the-fold image with loading="lazy" stays unloaded and the screenshot shows a column
     * of empty grey boxes. That is a picture of the tool's behaviour, not the page's — and it
     * would send someone hunting a rendering bug that does not exist. Stepping down the page and
     * back to the top loads them, and costs a couple of seconds. */
    await client.send(
      "Runtime.evaluate",
      {
        expression: `(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
          await new Promise((r) => setTimeout(r, 400));
        })()`,
        awaitPromise: true,
      },
      sessionId,
    );
    await sleep(1200);

    const probe = await client.send(
      "Runtime.evaluate",
      { expression: OVERFLOW_PROBE, returnByValue: true },
      sessionId,
    );
    const measured = JSON.parse(probe.result.value);

    /* The width the browser reports must be the width we asked for. If it is not, the capture is
     * of some other viewport and every conclusion drawn from it is wrong — fail loudly. */
    if (Math.abs(measured.vw - vp.width) > 1) {
      console.error(
        `FAIL ${vp.name}: emulation did not apply — asked for ${vp.width}px, browser reports ${measured.vw}px`,
      );
      overflowFailures += 1;
      continue;
    }
    const overflow = measured.scrollWidth - measured.vw;
    const ok = overflow <= 1;
    if (!ok) overflowFailures += 1;

    results.push({ viewport: vp.name, ...measured, overflow, ok });

    console.log("   capturing " + vp.name + " …");
    /* Capture the top MAX_CAPTURE_HEIGHT px rather than the whole document.
     *
     * This page runs to ~16,000px on desktop and ~24,000px on mobile. Encoding that is slow
     * enough to look like a hang, and the resulting PNG is unreadable when scaled to fit — the
     * useful artefact is the top of the page. The OVERFLOW MEASUREMENT above is unaffected: it
     * reads scrollWidth from the live document, not from the image. Pass --full to override. */
    const fullHeight = Math.round(
      (
        await client.send(
          "Runtime.evaluate",
          { expression: "document.documentElement.scrollHeight", returnByValue: true },
          sessionId,
        )
      ).result.value,
    );
    const captureHeight = fullPage ? fullHeight : Math.min(fullHeight, MAX_CAPTURE_HEIGHT);

    const shot = await client.send(
      "Page.captureScreenshot",
      {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: vp.width, height: captureHeight, scale: 1 },
      },
      sessionId,
    );
    const file = join(outDir, `${label}-${vp.name}.png`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));

    console.log(
      `${ok ? "ok  " : "FAIL"} ${vp.name.padEnd(13)} viewport ${String(measured.vw).padStart(4)}px  ` +
        `scrollWidth ${String(measured.scrollWidth).padStart(4)}px  ` +
        `${ok ? "no horizontal overflow" : `OVERFLOWS BY ${overflow}px`}  → ${file}`,
    );
    if (!ok) {
      console.log(`        DIAG doc=${measured.docScrollWidth} body=${measured.bodyScrollWidth} bodyWidth=${measured.bodyWidth}`);
      if (measured.widest) {
        console.log(`        WIDEST <${measured.widest.tag} class="${measured.widest.cls}"> right=${measured.widest.right}px width=${measured.widest.width}px`);
      }
    }
    for (const o of measured.offenders) {
      console.log(`        ↳ <${o.tag} class="${o.cls}"> right=${o.right}px width=${o.width}px clippedBy=${o.clipped ?? "NOTHING"}  "${o.text}"`);
    }
  }

  client.close();
  chrome.kill();

  console.log(`\n${results.length} viewports captured, ${overflowFailures} with horizontal overflow.`);
  process.exit(overflowFailures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  chrome.kill();
  process.exit(1);
});
