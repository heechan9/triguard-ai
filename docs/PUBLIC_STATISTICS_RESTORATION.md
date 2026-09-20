# Public statistics map restoration

This restores the existing navy/cyan TriGuard visual theme and interactive
province geometry as a descriptive public-statistics surface. It is not a
restoration of the military operational assessment/recommendation workflow.

## Scope

- `public-statistics/`: standalone deployable static surface.
- Map selection, keyboard selection, and an equivalent province dropdown.
- 2019–2025 Military Manpower Administration examination statistics, retained
  as published counts, without ranking, scoring, or operational recommendations.
- Shared jurisdictions are shown as office-level records, never allocated to
  individual provinces. Gyeonggi and Gangwon show two offices separately.
- Original source filename, date limitation, repository CSV link and yearly CSV
  export. Official dataset landing page and current reuse terms remain unverified.
- Historical `web/`, `app.py`, modules and raw data are retained unchanged.

## Reproduce

```sh
python3 scripts/export_public_statistics.py
python3 scripts/build_public_statistics.py
node --check public-statistics/app.js
```

The build clears its generated `dist/` directory and copies only this surface.
It does not copy the historical risk snapshot or operational UI.

## Verification

- 105 source rows: 7 years × (14 local offices + national total).
- All six numeric columns are direct source counts.
- Every national total reconciles with the 14 office counts for each year/field.
- JavaScript syntax check passed.
- Production deployment and browser verification are pending.
