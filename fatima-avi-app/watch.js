/* ============================================================
   Watch — loads a YouTube video and keeps play/pause/seek in sync
   between both sides of the room using Room.send / Room.on.
   ============================================================ */

const Watch = (() => {
  let player = null;
  let apiReady = false;
  let ignoreNextEvent = false; // true while we're applying a remote sync
  let pendingVideoId = null;

  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      apiReady = true;
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      if (pendingVideoId) createPlayer(pendingVideoId);
    };
  }

  function extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  function createPlayer(videoId) {
    document.getElementById("ytEmpty").style.display = "none";
    if (player) {
      player.loadVideoById(videoId);
      return;
    }
    player = new YT.Player("ytPlayer", {
      videoId,
      playerVars: { rel: 0, playsinline: 1 },
      events: {
        onStateChange: onPlayerStateChange,
      },
    });
  }

  function onPlayerStateChange(e) {
    if (ignoreNextEvent) {
      ignoreNextEvent = false;
      return;
    }
    if (e.data === YT.PlayerState.PLAYING) {
      Room.send({ type: "watch-sync", action: "play", time: player.getCurrentTime() });
    } else if (e.data === YT.PlayerState.PAUSED) {
      Room.send({ type: "watch-sync", action: "pause", time: player.getCurrentTime() });
    }
  }

  function loadAndShare(url) {
    const id = extractVideoId(url);
    if (!id) {
      alert("That doesn't look like a YouTube link.");
      return;
    }
    Room.send({ type: "watch-load", videoId: id });
    if (apiReady) createPlayer(id);
    else {
      pendingVideoId = id;
      loadYouTubeAPI();
    }
  }

  function init() {
    loadYouTubeAPI();

    Room.on("watch-load", (msg) => {
      if (apiReady) createPlayer(msg.videoId);
      else {
        pendingVideoId = msg.videoId;
        loadYouTubeAPI();
      }
    });

    Room.on("watch-sync", (msg) => {
      if (!player) return;
      ignoreNextEvent = true;
      const drift = Math.abs(player.getCurrentTime() - msg.time);
      if (drift > 1.2) player.seekTo(msg.time, true);
      if (msg.action === "play") player.playVideo();
      if (msg.action === "pause") player.pauseVideo();
    });

    document.getElementById("loadVideoBtn").addEventListener("click", () => {
      const url = document.getElementById("ytUrlInput").value;
      loadAndShare(url);
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", () => Watch.init());
