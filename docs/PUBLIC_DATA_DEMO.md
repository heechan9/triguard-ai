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
