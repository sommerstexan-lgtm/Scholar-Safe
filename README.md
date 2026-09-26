# ScholarSafe v1.0.0

Local-only PWA for finding official scholarship doors and spotting common scams.

Data stays in the browser. Export is the only backup. There is no master password.

## Before first family use

1. Edit `version.json` and set `reportEmail` to the address that should receive “Report a problem” mail.
2. Push, then open the GitHub Pages URL.
3. Hard-refresh so `sw.js?v=1.0.0` loads.
4. Chromebook test, then send the Pages URL to dad.

## Pages

In the repo: Settings → Pages → Deploy from branch `main` / root.

Live path after Pages is on:

`https://sommerstexan-lgtm.github.io/scholarsafe/`

## Update

Bump `APP_VERSION` in `app.js`, `index.html` title, `sw.js`, `manifest.webmanifest` start_url, and `version.json`. Add a user-language note in `whats-new.json`.
