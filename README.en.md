# Homeless Society

> An open-source virtual visit notebook for first-time home buyers in Korea. It is also useful for renters comparing homes.

[한국어](README.md) · [Short Korean entry](README.ko.md) · [Detailed Korean guide](docs/GETTING_STARTED.ko.md)

Source: https://github.com/halo-sw/homeless-society

## What is this project?

Homeless Society helps users prepare before an actual visit through three steps: prepare, take a virtual visit, and review and compare. Users choose viewpoints, record observations for up to two homes, and leave with a checklist and reusable records. The app runs locally in the browser and has no hosted site at present.

Two Korean words help explain the background. **Jeonse** is a Korean rental contract with a large refundable deposit. **Imjang** means visiting a home and its neighborhood to observe daily life. This app does not replace that visit; it helps users decide what to look at beforehand.

## Who is it for?

| Audience | What they get |
|---|---|
| First-time buyers | Organized viewpoints, candidates, and visit materials |
| Renters and companions | Side-by-side notes for two candidate homes |
| Careful planners | Printable and exportable visit records |

The practical role is deliberately narrow: help users observe, write questions, and compare two homes. It does not prevent fraud, guarantee safety, replace licensed real-estate services, or predict prices. It makes no measured-impact claim.

## Core flow

| Step | User action | Result |
|---|---|---|
| Prepare | Choose up to 3 priorities and confirm addresses | Clear viewpoints and candidates |
| Virtual visit | Record three stops for each home | Notes, questions, and sources |
| Review and compare | Save memos and export records | Checklist and reusable files |

The three stops are the surroundings, daily routes, and building entrance. There is no automatic recommendation or ranking. Before changing homes or stops, press **기록 추가** to save the draft.

## Screenshot

![Fictional demo schematic comparing two imaginary houses, not real street view](docs/images/virtual-visit.png)

*The image is a fictional schematic from the working demo. It is not real street view.*

## Prerequisites

Git and Node.js tested against 22.22.3 are required. The engine requirement is `>=22.12`, and npm comes with Node.js. Install the official Git and Node.js first. Behavior was checked on macOS. No API key or `.env` file is needed for the fresh demo, and the demo itself makes no paid AI calls.

## Quickstart

```sh
git clone https://github.com/halo-sw/homeless-society.git
cd homeless-society
npm ci
npm run dev
```

Then open http://127.0.0.1:5173 in the browser. Choose **가상 예시로 체험** (“Try the fictional example”). Two fictional houses appear without entering an address. No real map, photo, or walking-time calculation is included.

Press `Ctrl+C` in the terminal to stop. Real-address mode is called **내 주소로 시작** (“Start with my address”). The address form is visible immediately: enter the primary address with an optional nickname and an optional second candidate, choose priorities, check the address on the official map link, tick the confirmation box, and then start.

`LIVE` means own-address mode, not live verified data. Manual notes still work without map keys.

## Saving work

Records stay in the same device, browser, and origin. Refresh restores them, and there is no cloud sync. Development and production origins use separate storage, so export before switching. Export produces `homeless-society-session.json`, import validates the file and restores the saved stage, printing uses the browser print dialog, and checklist export produces `visit-checklist.txt`.

## Optional Muse role and privacy

The optional model is `muse-spark-1.3` only. The button **Muse에게 다음 확인 질문 받기** sends the selected home only, including its address, that home’s observations and visit memos, and the chosen priorities and initial questions. The request goes through your local server to Meta. The other home is not sent, and images are not sent automatically.

It returns up to three evidence-linked next questions. Without an API key or an authenticated CLI plus budget, the app shows local guidance labelled as pre-AI help. That text is a local template, not model output. Check Meta eligibility and charges in your own account.

## Map connection status

Map and road-view connection code is implemented, but verification with an actual provider key has not been carried out yet. Data availability and capture dates are unknown, and unknown dates are shown as unknown. See the [detailed Korean guide](docs/GETTING_STARTED.ko.md) for key names and origin settings.

## Limits and links

One neighborhood, up to two homes, and three observation stops are supported. There is no listing discovery, social feed, or price explanation, and no investment, legal, or financial advice. A completion mark means the user wrote it, not that an outside party verified it. App code is MIT; map and provider data follow their own terms.

Read more:

- [Detailed Korean guide](docs/GETTING_STARTED.ko.md)
- [Architecture](docs/architecture.md)
- [Data sources](docs/data-sources.md)
- [Backend](docs/BACKEND.md)
- [Provenance](docs/PROVENANCE.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [License](LICENSE)

Behavior checked on 2026-10-27: 45 unit/integration tests and 11 Playwright tests passed with a clean build.
