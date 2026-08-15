# Fatima & Avi 💕

Your private app: live voice/video calls, screen sharing, synced YouTube
watching, in-room chat, a photo gallery (Avi-only uploads), a music player,
and games — two-player synced (Tic-Tac-Toe, Connect 4, Chess, Uno) and solo
(Word Search, Candy Match, Memory Match, Would You Rather).

## Files
- `index.html` — the whole page structure and tabs
- `style.css` — all styling and animations
- `app.js` — day counter, daily prompts, music player, **edit your PHOTOS / SONGS / PROMPTS / START_DATE here**
- `connect.js` — the room: create/join, video/audio, screen share, chat, and the shared message bus every other file uses
- `watch.js` — synced YouTube watching
- `gallery.js` — photo gallery + Avi's passcode gate (**edit AVI_PASSCODE here**)
- `games.js` — the games hub, tic-tac-toe, Connect 4, Uno, word search, candy match, memory match, would-you-rather
- `chess-game.js` — chess, using the chess.js and chessboard.js libraries
- `script.js` — registers the service worker and shows an "Install this app" button when the browser offers it
- `sw.js` — service worker, caches the app shell so it opens even with a flaky connection and makes it properly installable
- `manifest.json` — app name, colors, and icon used when installed to a home screen or packaged as an APK
- `images/`, `music/` — put your photo/song files here (also holds `icon.svg`, the app icon)

## First things to edit
1. Open `app.js` — set `START_DATE` to when you two started, add your photo
   filenames to `PHOTOS`, your mp3 filenames to `SONGS`, and your own
   questions to `PROMPTS`.
2. Open `gallery.js` and change `AVI_PASSCODE` to something only Avi knows.
3. Drop your actual photo/mp3 files into the `images` and `music` folders,
   and reference them as `images/yourfile.jpg` / `music/yourfile.mp3`.

## How the Room works
It uses a free service called PeerJS — your two browsers talk directly to
each other (peer-to-peer) for video, audio, chat, synced YouTube, and every
game move. No server, no signup, no ongoing cost.

- One of you clicks **Create a room** on the Room tab — you get a short code.
- The other clicks **Join**, types that code in.
- Once connected: both video feeds appear, mic/camera/screen-share buttons
  light up, chat works, and any game you open under the Games tab syncs
  moves automatically.
- Whoever **creates** the room plays first (X, red, white).

**Being upfront about limits:**
- This is peer-to-peer calling — similar in spirit to Zoom under the hood,
  but on PeerJS's free public broker, meant for exactly this kind of
  personal, low-volume use. Very restrictive networks (strict corporate or
  school wifi) can sometimes block peer-to-peer; home wifi or mobile data
  is fine.
- Camera/mic/screen-share only work over HTTPS — GitHub Pages gives you
  that automatically.
- If the call drops, just create/join again.

## The Avi-only photo gallery
Photos added through the gallery's uploader (after entering the passcode)
are saved to that browser's local storage — so they only show up on the
device/browser they were added from. For photos you want *both* of you to
always see, add the real image files to the `images` folder and list them
in `app.js`'s `PHOTOS` array before publishing.

The passcode is a simple front-end gate, not real security — it's there to
stop accidental changes, not a determined look.

## Making changes later
- **Add a song or photo** → edit the `SONGS` / `PHOTOS` arrays in `app.js`,
  drop the file into `music/` or `images/`, re-upload to GitHub.
- **Add a daily question** → add a line to `PROMPTS` in `app.js`.
- **Change the gallery passcode** → edit `AVI_PASSCODE` in `gallery.js`.
- **Tweak colors/animations** → everything lives in `style.css` under the
  `:root` variables at the top.
- **Add another game** → follow the pattern in `games.js`: an object with a
  `start(root)` method and, for synced games, an `onRemote(msg)` method,
  then add a button for it in `index.html`'s game grid.

After any edit: re-upload the changed file(s) to your GitHub repo (or use
GitHub's built-in file editor) — the live site updates within about a
minute.

## Hosting it for free, "forever" — GitHub Pages
1. Create a free GitHub account at github.com if you don't have one.
2. Click **New repository**, name it, set it **Public**, create it.
3. Upload every file in this folder (including `images` and `music` with
   your files inside) via **Add file → Upload files**.
4. Go to **Settings → Pages**. Under "Build and deployment," set Source to
   "Deploy from a branch," branch `main`, folder `/ (root)`, then Save.
5. Wait about a minute, refresh — you'll get a live link like
   `https://yourusername.github.io/reponame/`. That's your permanent link,
   free for as long as the repo exists.

## Installing it like a real app
Because of `manifest.json` and `sw.js`, once it's live on GitHub Pages most
browsers will offer to install it — you'll see an "Install this app" card
on the Home tab, or an install icon in the address bar. Installed, it opens
in its own window with no browser bar, and keeps working briefly offline.

## Turning it into an APK (Android app) for free
Once your GitHub Pages link is live and working in a normal browser tab:
1. Go to pwabuilder.com and paste in that link.
2. Click "Package for Stores" → Android.
3. Download the generated APK and install it on the phone (allow "install
   from unknown sources" when prompted, since it's not from the Play Store).

Video calling inside the wrapped APK generally still works since it's just
showing your website, but camera/mic permission prompts can behave
differently across wrapper tools — test it once before relying on it.
