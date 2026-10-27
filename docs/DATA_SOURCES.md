# Data sources — canonical

## Housing transactions

- Implemented: `GET /api/housing?kind=regions&q=...` and `GET /api/housing?kind=trades&lawd_cd=11440&deal_ymd=202609&asset=apartment`.
- Shared implementation: `server/housing.ts`, reused by local Express and `api/housing.ts` on Vercel.
- Fixed upstream origin: `https://k-skill-proxy.nomadamas.org`, documented by `https://github.com/NomaDamas/k-skill`.
- Ultimate source: MOLIT reported transactions, `https://rt.molit.go.kr/pt/xls/xls.do`, accessed through the k-skill proxy.
- Mapped assets: `apartment`, `officetel`, `villa`, `single-house`.
- Actually live-validated: only `apartment`, on 2026-10-27, Mapo September 2026 with 84 valid rows. Other asset paths are wired but upstream responses may fail strict validation. Failures are reported honestly. No automatic mock substitution.
- Returned fields when available: apartment name, district, area, floor, reported price, date, build year, deal type when available.
- Limits: at most 100 upstream rows, at most 20 stored rows. Summaries use only the validated sample. A sample median is not a district market estimate.
- Units: upstream API uses 10,000 KRW. UI transaction price in millions equals upstream price divided by 100.
- Query privacy: only district, month, and asset are sent upstream. Notes and finances are never sent.
- Reliability: third-party availability can fail. Safeguards are 12-second deadline, 1MB bound, redirect rejection, query allowlist, strict validation, and public `s-maxage=300` for non-personal queries.
- License note: the k-skill repository code is MIT. That does not guarantee MIT for the data or proxy. Provider terms apply.
- No upstream secret is currently needed for the housing proxy.

## Manual references only

Schools, commute, legal and title detail, flood maps, news, and building-register checks are manual references. They are not automatically fetched or verified.

- SchoolInfo, national: `https://www.schoolinfo.go.kr/`
- Seoul school catchment links are Seoul-only: `https://map.seoul.go.kr/smgis2/short/6OIN3`
- Seoul policy maps: `https://map.seoul.go.kr/nsmgis/policy`
- Public data portal example: `https://www.data.go.kr/data/15134735/openapi.do`

## Design research only

- Mapbox isochrone playground, `https://docs.mapbox.com/playground/isochrone/`, and Seoul maps were interactive design research and inspiration. No embedded Mapbox and no paid map API are used.
- `real-estate-search` skill was consulted. `building-register-search` was researched but not integrated.
- No copied private social content. Facebook and Instagram ingestion or training is not implemented.

## Evidence meaning

Linked and self-reported are evidence-coverage labels, not independently verified truth. Missing and unverified remain explicit. Home factor evidence is stored per home.
