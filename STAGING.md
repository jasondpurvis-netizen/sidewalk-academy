# Staging

`main` deploys to the live site staff use: https://sidewalk-academy.pages.dev

`staging` deploys to its own separate preview address. Cloudflare Pages builds
every branch automatically, so this branch gets a URL of the form:

    https://staging.sidewalk-academy.pages.dev

Work happens here first. Nothing reaches staff until staging looks right and
the change is merged into `main`.

Note: staging points at the same database as live. It is a safe place to test
how the app *looks and behaves*, not a place to create throwaway data.

## Releasing a change

The seven `<script src="js/*.js?v=...">` tags in `index.html` carry a version, and
`BUILD` in `js/core.js` carries the same string. **Bump both together on every release.**

A browser caches `js/core.js` by its URL. Without the version, a phone can end up running
the current `index.html` with month-old JavaScript underneath it — the page says one thing,
the code does another, and two devices disagree with nothing to explain why. That happened,
and it cost most of a day. A new query string is a new URL, so a stale copy cannot answer
for it.

Settings shows the running `BUILD`, so any device can say which version it actually has.
