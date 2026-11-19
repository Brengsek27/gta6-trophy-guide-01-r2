# Leonida Trophy Atlas

[![GTA VI Trophy Guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounties/gta6-trophy-guide-01) [![Rank](https://make.fun/badge/gta6-trophy-guide-01/Brengsek27/gta6-trophy-guide-01-r2/rank.svg)](https://make.fun/leaderboard/gta6-trophy-guide-01) [![Reward](https://make.fun/badge/gta6-trophy-guide-01/Brengsek27/gta6-trophy-guide-01-r2/reward.svg)](https://make.fun/leaderboard/gta6-trophy-guide-01)

An offline-first static guide and progress tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5. Trophy descriptions are preserved as published; the accompanying notes stay within what those descriptions support.

## Run

Serve `app/` with any static file server and open its `index.html`. For example, from the repository root run `python3 -m http.server 8000 --directory app`, then visit `http://localhost:8000`. The app loads only its local JSON file, and progress is saved in browser storage.

Use a shareable tracker URL with `?earned=2,5,9&open=9` to pre-mark trophy IDs and open one guide. The hash views `#view=roadmap` and `#view=missables` link directly to planning views. Export and import move progress as JSON.

The earned ID list is applied on top of locally saved progress; toggles and filters remain local to the current browser session.

The tracker includes progress counters for counted trophies, sorting, and per-stage roadmap completion.

The `main.ts` hand-in program copies the app and screenshots to `MAKEFUN_OUTPUT_DIR` (or `/output`) and writes the competition dossier.

---

[make.fun](https://make.fun)
