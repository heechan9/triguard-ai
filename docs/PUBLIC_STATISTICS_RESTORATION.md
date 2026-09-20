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
- PR #26 merged as `b3e5e1075c72f6c01e5e142fcddf85ed3ea8dd1e`.
- Existing Vercel project connected to the repository with explicit user approval.
- Production deployment `dpl_AuaCHLGsKznTUgcH1tw2ZHNUp6vQ` reached READY.
- Live https://triguard-ai.vercel.app/ displayed all 17 province controls.
- Verified Seoul pointer click, Gyeonggi/Gangwon keyboard selection, 2019/2025
  year changes, Jeju dropdown selection and separate shared-jurisdiction records.
- Mobile screenshot inspected: navy/cyan theme and two-column counts rendered.
- Blob-based download event could not be confirmed in the browser. Replaced it
  with seven direct downloadable CSV files, each verified against source counts.
- Browser end-to-end save confirmation for CSV remains unverified.

## Historical response guide

The operational recommendation strings predate this restoration: commit
`8815c71` (2026-06-13, `add visualize module`) already contains them.
Current `app.py` connects `render_response_guide(result_df)` to the Streamlit
fourth tab. Current historical `web/` does not render those recommendation
strings. Their historical presence in every production Vercel deployment has
not been established.
