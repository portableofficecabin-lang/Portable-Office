"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = "G-B0YKT0X980";

// Load Google Analytics only after the first user interaction (or a fallback delay
// for sessions that never interact). gtag.js is ~155 kB and executes on the main
// thread; deferring it until interaction keeps that third-party cost out of the
// initial load window (Total Blocking Time / "reduce third-party impact") while
// still tracking real, engaged visitors. The fallback timer ensures idle sessions
// are eventually counted too.
export function GoogleAnalytics() {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (load) return;

    let done = false;
    const trigger = () => {
      if (done) return;
      done = true;
      cleanup();
      setLoad(true);
    };

    const events: Array<keyof WindowEventMap> = [
      "scroll",
      "pointerdown",
      "keydown",
      "touchstart",
      "mousemove",
    ];
    const opts: AddEventListenerOptions = { once: true, passive: true };
    events.forEach((e) => window.addEventListener(e, trigger, opts));

    // Fallback: load after the page has settled even without interaction, so
    // bounce sessions are still recorded. Kept well past the initial load window.
    const timer = window.setTimeout(trigger, 5000);

    function cleanup() {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, trigger));
    }

    return cleanup;
  }, [load]);

  if (!load) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
