/* ============================================================
   EDIT THIS SECTION — your personal lists
   ============================================================ */

// The date you two count from. Change to your real start date.
const START_DATE = "2024-01-01";

// Photo filenames living in the /images folder (baked into the site for both of you).
const PHOTOS = [
  // "images/photo1.jpg",
  // "images/photo2.jpg",
];

// Song filenames living in the /music folder.
const SONGS = [
  // { title: "Our Song", file: "music/our-song.mp3" },
];

// Daily questions for the two of you.
const PROMPTS = [
  "What's one small thing I did this week that made you smile?",
  "If we could teleport anywhere right now, where would we go?",
  "What's a memory of us you think about often?",
  "What's something you're looking forward to?",
  "What's your favorite thing about today so far?",
  "If we picked a song for this week, what would it be?",
  "What's one thing you want to do together before the year ends?",
];

/* ============================================================
   Below this line is app logic — no need to edit
   ============================================================ */

const AppState = {
  currentTab: "home",
};

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initHome();
  initFloaters();
  initMusicPlayer();
});

/* ---------------- tabs ---------------- */
function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => switchTab(el.dataset.goto));
  });
}

function switchTab(tab) {
  AppState.currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `tab-${tab}`);
  });
  if (tab === "gallery" && window.Gallery) window.Gallery.render();
}

/* ---------------- home: day counter + clock + prompt ---------------- */
function initHome() {
  updateDayCount();
  updateClock();
  setInterval(updateClock, 1000 * 30);

  const promptText = document.getElementById("promptText");
  const newPromptBtn = document.getElementById("newPromptBtn");
  let lastIndex = -1;

  function showRandomPrompt() {
    if (!PROMPTS.length) {
      promptText.textContent = "Add your own questions to the PROMPTS list in app.js.";
      return;
    }
    let idx = Math.floor(Math.random() * PROMPTS.length);
    if (PROMPTS.length > 1) {
      while (idx === lastIndex) idx = Math.floor(Math.random() * PROMPTS.length);
    }
    lastIndex = idx;
    promptText.style.opacity = 0;
    setTimeout(() => {
      promptText.textContent = PROMPTS[idx];
      promptText.style.opacity = 1;
    }, 200);
  }

  promptText.style.transition = "opacity 0.2s ease";
  showRandomPrompt();
  newPromptBtn.addEventListener("click", showRandomPrompt);
}

function updateDayCount() {
  const start = new Date(START_DATE);
  const now = new Date();
  const diffMs = now - start;
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const el = document.getElementById("dayCount");
  animateNumber(el, 0, days, 900);
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function updateClock() {
  const el = document.getElementById("clock");
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  el.textContent = `${hh}:${mm}`;
}

/* ---------------- floating hearts on home ---------------- */
function initFloaters() {
  const field = document.getElementById("floaters");
  const glyphs = ["♥", "✦", "♥"];
  for (let i = 0; i < 12; i++) {
    const span = document.createElement("span");
    span.textContent = glyphs[i % glyphs.length];
    span.style.left = Math.random() * 100 + "%";
    span.style.animationDelay = Math.random() * 10 + "s";
    span.style.animationDuration = 8 + Math.random() * 6 + "s";
    span.style.color = i % 2 === 0 ? "var(--rose)" : "var(--gold)";
    field.appendChild(span);
  }
}

/* ---------------- music player ---------------- */
const MusicState = {
  index: 0,
  playing: false,
  shuffle: false,
  repeat: false,
};

function initMusicPlayer() {
  const audio = document.getElementById("audioPlayer");
  const playBtn = document.getElementById("playBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const repeatBtn = document.getElementById("repeatBtn");
  const seekBar = document.getElementById("seekBar");
  const curTime = document.getElementById("curTime");
  const durTime = document.getElementById("durTime");
  const npTitle = document.getElementById("npTitle");
  const disc = document.getElementById("disc");
  const playlistEl = document.getElementById("playlist");

  renderPlaylist();

  function renderPlaylist() {
    playlistEl.innerHTML = "";
    if (!SONGS.length) {
      playlistEl.innerHTML = `<li style="cursor:default;">Add songs to the SONGS list in app.js, and drop the mp3 files in /music.</li>`;
      return;
    }
    SONGS.forEach((song, i) => {
      const li = document.createElement("li");
      li.textContent = song.title;
      li.dataset.index = i;
      if (i === MusicState.index) li.classList.add("playing");
      li.addEventListener("click", () => loadSong(i, true));
      playlistEl.appendChild(li);
    });
  }

  function loadSong(i, autoplay) {
    if (!SONGS.length) return;
    MusicState.index = (i + SONGS.length) % SONGS.length;
    const song = SONGS[MusicState.index];
    audio.src = song.file;
    npTitle.textContent = song.title;
    [...playlistEl.children].forEach((li, idx) => {
      li.classList.toggle("playing", idx === MusicState.index);
    });
    if (autoplay) play();
  }

  function play() {
    if (!SONGS.length) return;
    if (!audio.src) loadSong(MusicState.index, false);
    audio.play();
    MusicState.playing = true;
    playBtn.textContent = "⏸";
    disc.classList.add("spinning");
  }
  function pause() {
    audio.pause();
    MusicState.playing = false;
    playBtn.textContent = "▶";
    disc.classList.remove("spinning");
  }

  playBtn.addEventListener("click", () => (MusicState.playing ? pause() : play()));
  nextBtn.addEventListener("click", () => {
    const next = MusicState.shuffle
      ? Math.floor(Math.random() * SONGS.length)
      : MusicState.index + 1;
    loadSong(next, true);
  });
  prevBtn.addEventListener("click", () => loadSong(MusicState.index - 1, true));
  shuffleBtn.addEventListener("click", () => {
    MusicState.shuffle = !MusicState.shuffle;
    shuffleBtn.style.color = MusicState.shuffle ? "var(--rose-soft)" : "";
  });
  repeatBtn.addEventListener("click", () => {
    MusicState.repeat = !MusicState.repeat;
    repeatBtn.style.color = MusicState.repeat ? "var(--rose-soft)" : "";
  });

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    seekBar.value = (audio.currentTime / audio.duration) * 100;
    curTime.textContent = formatTime(audio.currentTime);
    durTime.textContent = formatTime(audio.duration);
  });
  seekBar.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (seekBar.value / 100) * audio.duration;
  });
  audio.addEventListener("ended", () => {
    if (MusicState.repeat) {
      audio.currentTime = 0;
      audio.play();
    } else {
      nextBtn.click();
    }
  });

  function formatTime(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }
}
