# Staging

`main` deploys to the live site staff use: https://sidewalk-academy.pages.dev

`staging` deploys to its own separate preview address. Cloudflare Pages builds
every branch automatically, so this branch gets a URL of the form:

    https://staging.sidewalk-academy.pages.dev

Work happens here first. Nothing reaches staff until staging looks right and
the change is merged into `main`.

Note: staging points at the same database as live. It is a safe place to test
how the app *looks and behaves*, not a place to create throwaway data.
