# 🏆 Retreat Awards Night

A voting and ceremony app for the team retreat awards, Legal & Contracts Edition.

- **`/`**: phone-first ballot. Pick your name, swipe through the 10 awards, then lock in your votes.
- **`/results`** (or **`/presentation`**): the ceremony screen for the projector. It shows live turnout and per-award tallies, which stay hidden until you click "Show tallies". Stage mode steps through the awards, and **Reveal Winner** plays a 3-second drumroll countdown, then fanfare and confetti. Ties show joint winners.
- **`/admin`**: passcode `awards2026`. Shows who has voted, exports the tally to CSV, and resets all votes (asks you to confirm first).

## Run it

```bash
cd retreat-awards
npm install
npm run dev
```

Then open <http://localhost:3000>. The server listens on `0.0.0.0`, so phones on the same Wi-Fi can vote at `http://<your-laptop-ip>:3000`. To find the IP: `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux.

For the night itself, the production build is faster:

```bash
npm run build && npm start
```

## How it works

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS v4, lucide-react icons, canvas-confetti |
| Storage | JSON file at `data/votes.json` (created on first run, git-ignored). There is no database to set up |
| Live updates | SWR polls `/api/results` every 2 s |
| Sound | Synthesised in the browser with Web Audio, so there are no audio files. Toggle it with the speaker icon |

### Rules enforced by the server

- One ballot per voter. Names are matched case-insensitively, so a second ballot from the same name is rejected with a 409.
- Every award needs a pick, and the pick has to be one of the 8 colleagues.
- You can't vote for yourself.
- People who aren't on the roster can enter their name as a guest. Guest ballots count, and they're shown separately from the "x of 8" turnout.

### Voter experience

- Picks are saved as a draft in `localStorage`, so an accidental refresh mid-ballot loses nothing.
- After submitting, a refresh still shows "Votes Submitted! See you on the red carpet ✨". If an admin resets the votes, the phone notices within about 10 s and goes back to the start.

### Ceremony controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next award (there's a "Hall of Fame" finale after award 10) |
| Space / Enter | Reveal the winner, or advance once it's revealed |
| F | Toggle fullscreen |

The ceremony screen remembers which awards have been revealed, so refreshing it won't spoil anything.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `ADMIN_PASSCODE` | `awards2026` | Admin passcode |
| `DATA_DIR` | `./data` | Where `votes.json` lives |

Nominees and award copy are in `lib/data.ts`.
