# 🏆 Retreat Awards Night

A voting and ceremony app for the team retreat awards, Legal & Contracts Edition.

- **`/`**: phone-first ballot. Pick your name, swipe through the 10 awards, then lock in your votes.
- **`/results`** (or **`/presentation`**): the ceremony screen for the projector. It shows live turnout and per-award tallies, which stay hidden until you click "Peek at tallies". Stage mode steps through the awards, and **Reveal Winner** plays a 3-second drumroll countdown, then fanfare and confetti. Ties show joint winners.
- **`/admin`**: passcode `awards2026`. Shows who has voted and a "Scan to vote" QR code, exports the tally to CSV, and resets all votes (asks you to confirm first).

## Try it on your own computer (step by step)

You only need to do steps 1–3 once.

1. **Install Node.js.** Go to <https://nodejs.org>, download the **LTS** version and install it like any other app.
2. **Get the code.** On GitHub, switch to the branch `claude/retreat-awards-voting-m25lps`, click the green **Code** button, then **Download ZIP**. Unzip it somewhere easy, like your Desktop.
3. **Open a terminal in the app folder.**
   - Mac: open the **Terminal** app, type `cd ` (with a space after it), drag the `retreat-awards` folder into the window, and press Enter.
   - Windows: open the `retreat-awards` folder, click the address bar, type `cmd` and press Enter.

   Then type this and press Enter. It downloads what the app needs and takes a minute or two:
   ```bash
   npm install
   ```
4. **Start the app:**
   ```bash
   npm run dev
   ```
   Leave this window open. Closing it stops the app.
5. **Open the ceremony screen.** In your browser, go to <http://localhost:3000/results>.
6. **Cast a test vote.** Open a **private/incognito window** and go to <http://localhost:3000>. Pick a name and vote on all 10 awards. Within a couple of seconds, the ceremony screen changes from "0 of 8" to "1 of 8".
   - Why a private window? The app remembers on each device who has already voted. A private window acts like a fresh phone, so you can vote again as a different person.
7. **Try it on your phone.** If your phone is on the same Wi-Fi as your computer, scan the **Scan to vote** QR code on the ceremony screen.
8. **Rehearse the ceremony.** Click **Stage**, then **Reveal Winner!** Turn your sound on for the drumroll.
9. **Clear the test votes before the real night.** Go to <http://localhost:3000/admin>, enter `awards2026`, click **Reset All Votes** and confirm.

To stop the app, click in the terminal window and press `Ctrl + C`.

## Getting phones connected on the night

The app runs on one laptop, and everyone's phone has to be able to reach that laptop. There are three ways to do that.

### Option A: same Wi-Fi (simplest)

Connect the laptop and the phones to the same Wi-Fi, run `npm run dev`, and show the **Scan to vote** QR code.

⚠️ Hotel, venue and office guest Wi-Fi networks often block devices from seeing each other. If phones can't open the page after scanning, use option B or C.

### Option B: phone hotspot

Turn on the personal hotspot on one phone, then connect the laptop and the other phones to it. This counts as "the same Wi-Fi", and it uses very little data. Most phones allow about 5–10 connected devices, so check yours. Several people can also share one phone to vote, since they pick their name first.

### Option C: a share link that works on mobile data (no shared Wi-Fi needed)

Start the app with `npm run dev`. Then open a **second** terminal in the same folder and run:

```bash
npm run share
```

After a few seconds it prints a link like `https://some-random-words.trycloudflare.com`. That link works on any phone, including on 4G/5G.

- Open the ceremony screen using **that link** with `/results` added on the end. The QR code then shows the share link automatically.
- The laptop needs internet access, and both terminal windows must stay open.
- You get a new link each time you run it, so start it shortly before the event.
- It uses Cloudflare's free "quick tunnel", which needs no account.

**Whichever option you pick:** keep the laptop plugged in, and stop it going to sleep during the event.

### Production build

For the night itself, this runs a bit faster than `npm run dev`:

```bash
npm run build && npm start
```

## How it works

| Piece | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS v4 (pastel "sticker" theme), lucide-react icons, canvas-confetti with emoji confetti |
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
