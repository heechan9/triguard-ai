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
- Git integration is now connected to `heechan9/triguard-ai`. Root Directory was saved and rechecked as `public-data-demo`; Framework Preset is Other; files outside the root remain excluded.


## Git deployment workflow

The Vercel GitHub App now has selected-repository access to Triguard, and the separate project is connected. Keep Root Directory set to `public-data-demo`; do not deploy the repository root. The original Triguard project remains separate.

Edit assets in `public-demo-src/`, run the generator and validation commands above, and commit the resulting `public-data-demo/` files. Pull requests can create previews; merging deployment-folder changes into `main` triggers production deployment. Changes outside the deployment root may be skipped. Git connection alone does not prove that a particular build succeeded: check Vercel Ready status and the live page after each release.
