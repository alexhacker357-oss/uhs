/* ============================================================
   Room — shared peer-to-peer connection used by watch.js, games.js,
   chess-game.js, and the in-room chat. Everything talks through
   Room.send(obj) and Room.on(type, handler).
   ============================================================ */

const Room = (() => {
  let peer = null;
  let dataConn = null;
  let mediaCall = null;
  let localStream = null;
  let cameraTrack = null;
  let isHost = false;
  let connected = false;

  const handlers = {}; // type -> [callbacks]

  function on(type, cb) {
    (handlers[type] = handlers[type] || []).push(cb);
  }

  function emit(type, payload) {
    (handlers[type] || []).forEach((cb) => cb(payload));
  }

  function send(obj) {
    if (dataConn && dataConn.open) {
      dataConn.send(obj);
    }
  }

  function setStatus(text, on) {
    document.getElementById("statusText").textContent = text;
    document.getElementById("statusDot").classList.toggle("on", !!on);
  }

  async function getLocalMedia() {
    if (localStream) return localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById("localVideo").srcObject = localStream;
      cameraTrack = localStream.getVideoTracks()[0];
    } catch (e) {
      appendChatSystem("Couldn't access camera/mic — you can still chat and watch together.");
      localStream = new MediaStream();
    }
    return localStream;
  }

  function wireDataConn(conn) {
    dataConn = conn;
    dataConn.on("open", () => {
      connected = true;
      setStatus("connected", true);
      document.getElementById("callControls").hidden = false;
      appendChatSystem("Connected. Say hi!");
      emit("room-connected", { isHost });
    });
    dataConn.on("data", (msg) => {
      if (!msg || !msg.type) return;
      emit(msg.type, msg);
    });
    dataConn.on("close", () => {
      connected = false;
      setStatus("not connected", false);
      appendChatSystem("They left the room.");
      document.getElementById("remoteEmpty").style.display = "flex";
      document.getElementById("remoteVideo").srcObject = null;
    });
  }

  function wireIncomingCall() {
    peer.on("call", async (call) => {
      const stream = await getLocalMedia();
      call.answer(stream);
      mediaCall = call;
      call.on("stream", (remoteStream) => {
        document.getElementById("remoteVideo").srcObject = remoteStream;
        document.getElementById("remoteEmpty").style.display = "none";
      });
    });
  }

  function makeRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
    let code = "fa-";
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    return code;
  }

  async function create() {
    setStatus("opening room…", false);
    const roomCode = makeRoomCode();
    peer = new Peer(roomCode);
    isHost = true;
    peer.on("open", async (id) => {
      document.getElementById("roomCodeDisplay").hidden = false;
      document.getElementById("codeBox").textContent = id.replace("fa-", "").toUpperCase();
      setStatus("waiting for them to join…", false);
      await getLocalMedia();
      wireIncomingCall();

      peer.on("connection", (conn) => {
        wireDataConn(conn);
      });
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        appendChatSystem("That room code was just taken — creating a new one…");
        create();
      } else {
        appendChatSystem("Connection error: " + err.type);
      }
    });
  }

  async function join(codeRaw) {
    const code = (codeRaw || "").trim();
    if (!code) return;
    setStatus("joining…", false);
    peer = new Peer();
    isHost = false;
    peer.on("open", async () => {
      const remoteId = "fa-" + code.toLowerCase().replace(/^fa-/, "");
      const stream = await getLocalMedia();
      const conn = peer.connect(remoteId);
      wireDataConn(conn);
      const call = peer.call(remoteId, stream);
      mediaCall = call;
      call.on("stream", (remoteStream) => {
        document.getElementById("remoteVideo").srcObject = remoteStream;
        document.getElementById("remoteEmpty").style.display = "none";
      });
      document.getElementById("callControls").hidden = false;
      wireIncomingCall();
    });
    peer.on("error", (err) => appendChatSystem("Couldn't connect — check the code. (" + err.type + ")"));
  }

  function hangup() {
    if (dataConn) dataConn.close();
    if (mediaCall) mediaCall.close();
    if (peer) peer.destroy();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    peer = null;
    dataConn = null;
    mediaCall = null;
    localStream = null;
    connected = false;
    setStatus("not connected", false);
    document.getElementById("roomCodeDisplay").hidden = true;
    document.getElementById("callControls").hidden = true;
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;
    document.getElementById("remoteEmpty").style.display = "flex";
  }

  function toggleMic() {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    document.getElementById("micBtn").classList.toggle("active-off", !track.enabled);
  }

  function toggleCam() {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    document.getElementById("camBtn").classList.toggle("active-off", !track.enabled);
  }

  async function shareScreen() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      replaceOutgoingVideoTrack(screenTrack);
      screenTrack.onended = () => {
        if (cameraTrack) replaceOutgoingVideoTrack(cameraTrack);
      };
    } catch (e) {
      /* user cancelled the picker */
    }
  }

  function replaceOutgoingVideoTrack(newTrack) {
    if (!mediaCall || !mediaCall.peerConnection) return;
    const sender = mediaCall.peerConnection.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender) sender.replaceTrack(newTrack);
    document.getElementById("localVideo").srcObject = new MediaStream([newTrack, ...(localStream ? localStream.getAudioTracks() : [])]);
  }

  function appendChatSystem(text) {
    const log = document.getElementById("chatLog");
    const div = document.createElement("div");
    div.className = "chat-msg";
    div.innerHTML = `<span class="sys">${text}</span>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  return {
    create,
    join,
    hangup,
    toggleMic,
    toggleCam,
    shareScreen,
    send,
    on,
    isConnected: () => connected,
    get isHost() {
      return isHost;
    },
  };
})();

/* ---------------- wire up the Room tab UI ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createRoomBtn").addEventListener("click", () => {
    Room.create();
  });
  document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const code = document.getElementById("joinCodeInput").value;
    Room.join(code);
  });
  document.getElementById("micBtn").addEventListener("click", () => Room.toggleMic());
  document.getElementById("camBtn").addEventListener("click", () => Room.toggleCam());
  document.getElementById("screenBtn").addEventListener("click", () => Room.shareScreen());
  document.getElementById("hangupBtn").addEventListener("click", () => Room.hangup());

  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    Room.send({ type: "chat", text });
    appendChat(text, "me");
    chatInput.value = "";
  }
  chatSendBtn.addEventListener("click", sendChat);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChat();
  });
  Room.on("chat", (msg) => appendChat(msg.text, "them"));

  function appendChat(text, who) {
    const log = document.getElementById("chatLog");
    const div = document.createElement("div");
    div.className = "chat-msg " + who;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }
});
