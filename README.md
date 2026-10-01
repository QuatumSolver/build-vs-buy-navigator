# Build vs Buy Navigator

A sales tool for Vena reps working deals where the prospect says they can build planning themselves.

- **Guided funnel**: answer five questions and get the persona, the Omega package, the questions still to ask, who to bring in, deal actions, and platform intel for the platform they are building on.
- **Full reference**: the whole cheat sheet.
- **Compare platforms**: Vena (Morpheo / Omega) rated against Snowflake, Databricks, Microsoft Fabric, Google, AWS, SAP and Palantir on 30 sourced criteria. Overview, head to heads, a filterable tool finder, a multi-platform matrix, build effort, caveats and 184 sources.
- **Platform glossary**: product names and planning terms by platform.
- **AI and data glossary**: vendor-neutral AI and data terms.

## Editing

`index.html` is generated. Edit the sources and rebuild:

- `src/page.html` page shell, funnel and reference
- `src/compare.js`, `src/compare.css` compare and glossary sections
- `data/compare.json` ratings, tools, talk tracks, sources
- `data/glossary.json`, `data/glossary_general.json` glossaries

```
python3 build.py
```

Research as of October 1, 2026. Vena Omega is treated as GA (November 17, 2026).
