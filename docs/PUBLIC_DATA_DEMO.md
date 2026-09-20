# Independent public-data metadata demo

Existing `app.py`, `modules/`, `web/` and the root Vercel configuration are preserved.
The general security changes in PRs #17 and #18 remain in main; their presence in
the existing hosted app is not verified.

The new standalone UI is in `public-demo-src/`. Generate its isolated deploy
folder with `python3 scripts/build_public_catalog.py`.

Only `public-data-demo/` may be used for this new deployment, in a separate Vercel
project. Do not deploy the repository root or repoint the existing project's
production alias. The bundle consists of index.html, styles.css, app.js,
catalog.json and vercel.json. It includes only metadata from public-health and
population CSVs, not source rows, regional scores or operational recommendations.

Validation:

```
python3 scripts/build_public_catalog.py
python3 -m unittest discover -s tests -p test_public_catalog.py -v
node --check public-data-demo/app.js
```

The catalog records filename-based publisher labels, byte counts and SHA-256.
It does not certify source authenticity, licensing, freshness or row accuracy.
The source commit identifies the repository used to read the source files, not a
deployed version. Deployment and live browser verification remain separate gates.

## Live deployment (2026-09-20)

- Public URL: https://triguard-public-data.vercel.app/
- Vercel project: `triguard-public-data`
- Deployment method: Vercel Drop; only the five files in `public-data-demo/` were uploaded.
- Browser verification: 5 files / 2 publisher labels; population search returns 1; health publisher filter returns 4; no-match search returns 0; reset restores 5.
- Git integration is **not connected**. The Vercel GitHub repository picker currently exposes only `fabguard-ai`, not `triguard-ai`. Merging code does not update this deployment.

To enable future Git deployment, the account owner must grant the Vercel GitHub App access to `heechan9/triguard-ai`. Before connecting it to this separate project, set Root Directory to `public-data-demo`, Framework Preset to Other, and leave Build Command unset. Do not connect with the repository root as the build root. Confirm those settings and verify a preview before promoting any new deployment.

Until then, regenerate and validate the isolated folder using the commands above, then upload only that folder to this project's dashboard. Source assets live in `public-demo-src/`; changes there require regenerating the deployment folder.
