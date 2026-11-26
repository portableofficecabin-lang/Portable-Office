# nginx: HTTP/2, Brotli and one-hop redirects for portableofficecabin.com

**Status: prepared, NOT applied.** Changing production nginx needs the owner's separate, explicit approval. That is a different approval from merging this PR, which only adds this runbook and a read-only check script.

**Who runs it:** root on the VPS. The laptop sessions have no SSH key. The owner pastes the commands; the laptop session runs the before/after checks from outside.

**What changes:** only the `portableofficecabin.com` server blocks, plus one snippet file. These stay as they are:
- the `proxy_pass` line(s) (the activation runbook's check A8, "exactly 1 `proxy_pass` to :3000", stays true);
- `conf.d/`, which stays empty;
- the PM2 processes, the app and its environment;
- the Built on Trust server block, with one exception: see the HTTP/2 note in step 3.

## 1. Measured before (26 Nov 2026, production at `4bb8be9`, legacy in-place deploy)

Edge check (`node scripts/seo/edge-check.mjs`):

| Check | Now | Target |
|---|---|---|
| TLS ALPN, portableofficecabin.com | **http/1.1** (TLS 1.3) | **h2** |
| TLS ALPN, builtontrustconstruction.com (same nginx) | http/1.1 | unchanged, or h2 (see step 3) |
| Homepage HTML | gzip, 94,540 bytes on the wire (727,662 uncompressed) | br |
| `/products/portable-cabin` HTML | gzip, 48,952 (337,455) | br |
| CSS / JS chunk | gzip, 829 / 54,364 bytes | br |
| `http://portableofficecabin.com/` | 1 hop | 1 hop |
| `http://www.portableofficecabin.com/` | **2 hops** (→ https://www → apex) | 1 hop |
| `https://www.portableofficecabin.com/` | 1 hop | 1 hop |
| `http://www.portableofficecabin.com/products/portable-cabin` | **2 hops** | 1 hop |
| `https://portableofficecabin.com/products/portable-cabin/` | 1 hop (308 from the app) | 1 hop (unchanged) |
| `http://www.portableofficecabin.com/products/portable-cabin/` | **3 hops** (301 → 308 → 301) | 1 hop |

Every page pulls 41–56 files from the site's own origin. Over HTTP/1.1 a browser opens at most 6 connections per origin and queues the rest; HTTP/2 sends them all over one connection.

Lighthouse 12.2.1 (performance only, median of 3 runs each; run from a laptop in India):

| Page | Form | Score | LCP | TBT | CLS | FCP | Speed Index | Transfer |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 76 (76/75/76) | 5.9 s | 60 ms | 0 | 2.3 s | 2.5 s | 791 KiB |
| `/products/portable-cabin` | mobile | 86 (85/86/88) | 3.9 s | 90 ms | 0 | 1.9 s | 1.9 s | 966 KiB |
| `/cities-we-serve/portable-cabin-kolar` | mobile | 83 (83/84/83) | 4.1 s | 190 ms | 0 | 1.7 s | 1.8 s | 1,550 KiB |
| `/` | desktop | 91 (91/91/91) | 1.4 s | 0 ms | 0.122 | 0.7 s | 1.1 s | 1,281 KiB |
| `/products/portable-cabin` | desktop | 98 (98/97/98) | 1.1 s | 0 ms | 0 | 0.7 s | 0.7 s | 1,266 KiB |
| `/cities-we-serve/portable-cabin-kolar` | desktop | 98 (97/98/98) | 1.1 s | 0 ms | 0 | 0.6 s | 0.6 s | 1,813 KiB |

Root document response time was 50–70 ms, so the server itself is fast. The gains here are in the transport.

Two findings outside this change, for later:
- The homepage HTML is 727 KB uncompressed, mostly the React payload.
- Desktop CLS on `/` is 0.122.

## 2. Before you start

- [ ] The owner has approved this nginx change by name (separately from any PR number).
- [ ] No GitHub Actions **Deploy** run is in progress, and none will start. Tell the laptop session first, so the peer sessions hold their merges.
- [ ] Have about 20 minutes, during a low-traffic hour.

## 3. Step 0: look (read-only), then send the output to the laptop session

```bash
nginx -v 2>&1
nginx -V 2>&1 | tr ' ' '\n' | grep -i -E 'brotli|http_v2'
ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ /etc/nginx/snippets/ /etc/nginx/modules-enabled/
cat /etc/nginx/sites-available/portableofficecabin.com
grep -n -E 'listen|server_name' /etc/nginx/sites-available/builtontrustconstruction.com
certbot certificates 2>/dev/null | sed -n '/portableofficecabin/,/Expiry/p'
. /etc/os-release; echo "$PRETTY_NAME"
apt-cache policy libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static | grep -E '^[a-z]|Candidate'
# Does the legacy deploy script ever rewrite the nginx site file? (It must not, or the change is lost on the next deploy.)
grep -n -i 'nginx\|sites-' /usr/local/bin/deploy-portable-office || echo "no nginx lines"
```

The laptop session then sends back the exact final site file, made from your current file and the template in step 4.

**STOP** and do not continue if any of these is true:
- the legacy deploy script writes the site file;
- the certificate does not list both `portableofficecabin.com` and `www.portableofficecabin.com`;
- `nginx -t` already fails.

How HTTP/2 is switched on depends on the `nginx -v` version:
- **nginx 1.25.1 or newer:** `http2 on;` inside our server blocks. This affects only our site.
- **Older nginx** (Ubuntu 22.04 ships 1.18; 24.04 ships 1.24): `listen 443 ssl http2;`. On these versions HTTP/2 is a property of the `IP:443` socket, so **Built on Trust gets HTTP/2 too** if it shares that address. That is normally harmless, since every current browser speaks HTTP/2. It is still a change to that site, so it is called out here.

Whether Brotli is available depends on `apt-cache policy`:
- **Ubuntu 24.04 / Debian 12:** the packages `libnginx-mod-http-brotli-filter` and `-static` are in the archive.
- **Candidate `(none)`:** skip Brotli. Do steps 1, 2 and 4 only, and keep today's gzip, which the app already sends.

## 4. The change

### 4.1 Backup (always first)

```bash
STAMP=$(date +%Y%m%d-%H%M%S); B=/root/nginx-backup-$STAMP; mkdir -p "$B"
cp -a /etc/nginx/sites-available/portableofficecabin.com "$B/"
tar -czf "$B/etc-nginx.tgz" -C / etc/nginx
curl -s https://portableofficecabin.com/api/build-info > "$B/build-info.json"; cat "$B/build-info.json"; echo
echo "backup in $B"
```

### 4.2 Brotli module (only if step 0 showed a Candidate)

```bash
apt-get install -y libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
nginx -t
```

The packages only load the module. Nothing is compressed with Brotli until the snippet below is included. Built on Trust is unaffected.

### 4.3 Compression snippet: `/etc/nginx/snippets/poc-compression.conf`

```nginx
# Portable Office Cabin — response compression. Included ONLY in the portableofficecabin.com
# server blocks (never globally), so no other site on this nginx changes.
# text/html is always compressed; text/x-component is the Next.js RSC payload.
brotli            on;
brotli_comp_level 5;
brotli_types      text/plain text/css text/xml text/x-component application/javascript
                  application/json application/xml application/rss+xml application/manifest+json
                  image/svg+xml font/ttf;
gzip              on;
gzip_comp_level   6;
gzip_vary         on;
gzip_proxied      any;
gzip_types        text/plain text/css text/xml text/x-component application/javascript
                  application/json application/xml application/rss+xml application/manifest+json
                  image/svg+xml font/ttf;
```

Without Brotli, delete the four `brotli*` lines and keep the gzip lines.

### 4.4 Site file template (the laptop session fills it from your step 0 output)

```nginx
# ── top of /etc/nginx/sites-available/portableofficecabin.com (http context) ──
# The request URI with any trailing slash removed (except "/"), query kept, so http:// and www.
# requests reach the final URL in ONE hop. The app (trailingSlash: false) would otherwise add a
# 308 after nginx's 301.
map $request_uri $poc_canonical_uri {
    default                                   $request_uri;
    "~^(?<poc_p>/[^?]*[^/?])/+(?<poc_q>\?.*)?$" $poc_p$poc_q;
}

# 1) http://  (apex and www) → https://portableofficecabin.com  — one hop
server {
    listen 80;
    listen [::]:80;
    server_name portableofficecabin.com www.portableofficecabin.com;
    # Keep certificate renewals working: copy the exact acme-challenge handling from the current
    # file here (certbot --nginx usually needs none; webroot setups need this location).
    # location ^~ /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://portableofficecabin.com$poc_canonical_uri; }
}

# 2) https://www → https://portableofficecabin.com — one hop
server {
    listen 443 ssl;            # older nginx: "listen 443 ssl http2;"
    listen [::]:443 ssl;       # older nginx: "listen [::]:443 ssl http2;"
    # http2 on;                # nginx ≥ 1.25.1 instead of the "http2" listen flag
    server_name www.portableofficecabin.com;
    # ← the SAME ssl_certificate / ssl_certificate_key / include options-ssl-nginx.conf /
    #   ssl_dhparam lines as the main block below (copied verbatim from the current file)
    return 301 https://portableofficecabin.com$poc_canonical_uri;
}

# 3) The site itself — the CURRENT main server block, with exactly these edits:
server {
    listen 443 ssl;            # + http2 as above
    listen [::]:443 ssl;       # + http2 as above
    # http2 on;                # nginx ≥ 1.25.1
    server_name portableofficecabin.com;          # www moved to block 2
    # … current ssl_* lines, unchanged …
    include /etc/nginx/snippets/poc-compression.conf;

    location / {
        # … the current proxy_pass and proxy_set_header lines, UNCHANGED …
        # Only with Brotli: ask the app for an uncompressed body so nginx can send br.
        # (Without this line the app's gzip passes straight through and Brotli never applies.)
        proxy_set_header Accept-Encoding "";
    }
    # … any other current location blocks, unchanged (add the same Accept-Encoding line to
    #   each one that proxy_passes to the app) …
}
```

### 4.5 Test, then reload gracefully (no dropped connections)

```bash
nginx -t && systemctl reload nginx
```

If `nginx -t` fails, **do not reload**: go to section 6, Rollback. The running nginx is still serving the old config.

## 5. Verify (straight after the reload)

On the VPS:

```bash
curl -sI --http2 https://portableofficecabin.com/ | head -1                                 # HTTP/2 200
curl -sI -H 'Accept-Encoding: br, gzip' https://portableofficecabin.com/ | grep -i content-encoding   # br (or gzip without Brotli)
curl -sI http://www.portableofficecabin.com/products/portable-cabin/ | grep -i -E '^(HTTP|location)'  # 301 + location https://portableofficecabin.com/products/portable-cabin
curl -sI https://www.portableofficecabin.com/ | grep -i -E '^(HTTP|location)'                       # 301 + location https://portableofficecabin.com/
curl -s https://portableofficecabin.com/api/build-info; echo                                         # same commit as the backup copy
curl -sI https://builtontrustconstruction.com/ | head -1                                             # same status as before
certbot renew --dry-run 2>&1 | tail -3                                                               # renewals still work
```

From the laptop, the session runs:
- `node scripts/seo/edge-check.mjs`. Expect ALPN `h2`, `br` on HTML/CSS/JS, and one hop for every redirect.
- The same 3 × 3 Lighthouse runs as section 1, for the after table.

**Roll back if:**
- the site or Built on Trust does not answer 200;
- `/api/build-info` changed;
- a redirect loops, or adds a hop;
- certificate renewal fails.

## 6. Rollback (about 1 minute)

```bash
B=/root/nginx-backup-<STAMP>                          # the folder printed in 4.1
cp -a "$B/portableofficecabin.com" /etc/nginx/sites-available/portableofficecabin.com
rm -f /etc/nginx/snippets/poc-compression.conf
nginx -t && systemctl reload nginx
curl -sI https://portableofficecabin.com/ | head -1   # 200 again
```

If `nginx -t` still fails, for example because of the Brotli module, either:
- remove the module: `apt-get remove -y libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static && nginx -t && systemctl reload nginx`;
- or restore the whole of `/etc/nginx`: `tar -xzf "$B/etc-nginx.tgz" -C / && nginx -t && systemctl reload nginx`.

## 7. Interaction with the release-based deploy activation

- The activation runbook (`docs/activation-runbook-2294a43`) later replaces the `proxy_pass` target with the `portable_office` upstream in `conf.d/`. This change leaves `proxy_pass` and `conf.d/` alone, so the two are independent and can run in either order.
- Its checks still hold: A8 ("exactly 1 `proxy_pass` to :3000; `conf.d/` empty; `nginx -t` OK"), and the deploy script's `nginx -t` pre-check.
- If both are scheduled, run them on different days, so a problem can be traced to one change.
