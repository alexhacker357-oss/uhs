/* ============================================================
   Games — hub navigation, plus every game's logic.
   Two-player games (ttt, connect4, uno, chess) sync through
   Room.send({type:'game-move', game, ...}) and Room.on('game-move', ...).
   Chess lives in chess-game.js since it needs the chess.js/chessboard.js libs.
   ============================================================ */

const GameHub = (() => {
  let activeGame = null;

  function init() {
    document.querySelectorAll(".game-card").forEach((card) => {
      card.addEventListener("click", () => open(card.dataset.game));
    });
    document.getElementById("backToHubBtn").addEventListener("click", closeGame);

    Room.on("game-move", (msg) => {
      if (activeGame && activeGame.key === msg.game && activeGame.onRemote) {
        activeGame.onRemote(msg);
      }
    });
  }

  function open(key) {
    document.getElementById("gameHub").hidden = true;
    const stage = document.getElementById("gameStage");
    stage.hidden = false;
    const board = document.getElementById("gameBoard");
    board.innerHTML = "";
    document.getElementById("gameStatus").textContent = "";

    const games = {
      ttt: TicTacToe,
      connect4: Connect4,
      uno: Uno,
      chess: window.ChessGame,
      wordsearch: WordSearch,
      candy: CandyMatch,
      memory: MemoryMatch,
      wyr: WouldYouRather,
    };
    activeGame = games[key];
    if (!activeGame) return;
    activeGame.key = key;
    activeGame.start(board);
  }

  function closeGame() {
    if (activeGame && activeGame.stop) activeGame.stop();
    activeGame = null;
    document.getElementById("gameHub").hidden = false;
    document.getElementById("gameStage").hidden = true;
  }

  function setStatus(text) {
    document.getElementById("gameStatus").textContent = text;
  }

  return { init, setStatus };
})();

document.addEventListener("DOMContentLoaded", () => GameHub.init());

/* ============================================================
   Tic-Tac-Toe
   ============================================================ */
const TicTacToe = (() => {
  let board, turn, mySymbol, cells;

  function mySide() {
    return Room.isConnected() ? (Room.isHost ? "X" : "O") : null;
  }

  function start(root) {
    board = Array(9).fill(null);
    turn = "X";
    mySymbol = mySide();
    render(root);
    updateStatus();
  }

  function render(root) {
    const grid = document.createElement("div");
    grid.className = "ttt-grid";
    cells = [];
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("div");
      cell.className = "ttt-cell";
      cell.addEventListener("click", () => tryMove(i));
      grid.appendChild(cell);
      cells.push(cell);
    }
    root.appendChild(grid);
    const resetBtn = document.createElement("button");
    resetBtn.className = "btn ghost";
    resetBtn.textContent = "Restart";
    resetBtn.style.marginTop = "1rem";
    resetBtn.addEventListener("click", () => {
      board = Array(9).fill(null);
      turn = "X";
      cells.forEach((c) => (c.textContent = ""));
      updateStatus();
      Room.send({ type: "game-move", game: "ttt", action: "reset" });
    });
    root.appendChild(resetBtn);
  }

  function tryMove(i) {
    if (board[i]) return;
    if (mySymbol && turn !== mySymbol) return;
    place(i, turn);
    if (Room.isConnected()) Room.send({ type: "game-move", game: "ttt", action: "move", index: i, symbol: turn });
    advanceTurn();
  }

  function place(i, symbol) {
    board[i] = symbol;
    cells[i].textContent = symbol === "X" ? "✕" : "○";
  }

  function advanceTurn() {
    const winner = checkWinner();
    if (winner) {
      GameHub.setStatus(winner === "draw" ? "It's a draw." : `${winner} wins!`);
      return;
    }
    turn = turn === "X" ? "O" : "X";
    updateStatus();
  }

  function updateStatus() {
    if (!Room.isConnected()) {
      GameHub.setStatus(`${turn}'s turn (pass the device)`);
    } else {
      GameHub.setStatus(turn === mySymbol ? "Your turn" : "Their turn");
    }
  }

  function checkWinner() {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    if (board.every((v) => v)) return "draw";
    return null;
  }

  function onRemote(msg) {
    if (msg.action === "reset") {
      board = Array(9).fill(null);
      turn = "X";
      cells.forEach((c) => (c.textContent = ""));
      updateStatus();
      return;
    }
    if (msg.action === "move") {
      place(msg.index, msg.symbol);
      advanceTurn();
    }
  }

  return { start, onRemote };
})();

/* ============================================================
   Connect 4
   ============================================================ */
const Connect4 = (() => {
  const ROWS = 6, COLS = 7;
  let board, turn, mySymbol, cellEls;

  function mySide() {
    return Room.isConnected() ? (Room.isHost ? "red" : "yellow") : null;
  }

  function start(root) {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    turn = "red";
    mySymbol = mySide();
    render(root);
    updateStatus();
  }

  function render(root) {
    const grid = document.createElement("div");
    grid.className = "c4-grid";
    cellEls = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "c4-cell";
        cell.addEventListener("click", () => tryDrop(c));
        grid.appendChild(cell);
        cellEls[r][c] = cell;
      }
    }
    root.appendChild(grid);
    const resetBtn = document.createElement("button");
    resetBtn.className = "btn ghost";
    resetBtn.textContent = "Restart";
    resetBtn.style.marginTop = "1rem";
    resetBtn.addEventListener("click", () => {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      turn = "red";
      cellEls.flat().forEach((c) => (c.className = "c4-cell"));
      updateStatus();
      Room.send({ type: "game-move", game: "connect4", action: "reset" });
    });
    root.appendChild(resetBtn);
  }

  function lowestOpenRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) if (!board[r][col]) return r;
    return -1;
  }

  function tryDrop(col) {
    if (mySymbol && turn !== mySymbol) return;
    const row = lowestOpenRow(col);
    if (row === -1) return;
    drop(col, turn);
    if (Room.isConnected()) Room.send({ type: "game-move", game: "connect4", action: "drop", col, symbol: turn });
    advanceTurn();
  }

  function drop(col, symbol) {
    const row = lowestOpenRow(col);
    if (row === -1) return;
    board[row][col] = symbol;
    cellEls[row][col].classList.add(symbol);
  }

  function advanceTurn() {
    const winner = checkWinner();
    if (winner) {
      GameHub.setStatus(`${winner} wins!`);
      return;
    }
    turn = turn === "red" ? "yellow" : "red";
    updateStatus();
  }

  function updateStatus() {
    if (!Room.isConnected()) {
      GameHub.setStatus(`${turn}'s turn (pass the device)`);
    } else {
      GameHub.setStatus(turn === mySymbol ? "Your turn" : "Their turn");
    }
  }

  function checkWinner() {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const symbol = board[r][c];
        if (!symbol) continue;
        for (const [dr, dc] of dirs) {
          let count = 0;
          for (let k = 0; k < 4; k++) {
            const rr = r + dr * k, cc = c + dc * k;
            if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === symbol) count++;
            else break;
          }
          if (count === 4) return symbol;
        }
      }
    }
    return null;
  }

  function onRemote(msg) {
    if (msg.action === "reset") {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      turn = "red";
      cellEls.flat().forEach((c) => (c.className = "c4-cell"));
      updateStatus();
      return;
    }
    if (msg.action === "drop") {
      drop(msg.col, msg.symbol);
      advanceTurn();
    }
  }

  return { start, onRemote };
})();

/* ============================================================
   Uno (simplified, 2-player, host-authoritative)
   ============================================================ */
const Uno = (() => {
  const COLORS = ["red", "yellow", "green", "blue"];
  const COLOR_HEX = { red: "#E24B4A", yellow: "#EF9F27", green: "#639922", blue: "#378ADD", wild: "#2C2C2A" };
  let state, root, isHostSide;

  function buildDeck() {
    const deck = [];
    let id = 0;
    COLORS.forEach((color) => {
      deck.push({ id: id++, color, value: "0" });
      for (let n = 1; n <= 9; n++) {
        deck.push({ id: id++, color, value: String(n) });
        deck.push({ id: id++, color, value: String(n) });
      }
      ["skip", "reverse", "draw2"].forEach((v) => {
        deck.push({ id: id++, color, value: v });
        deck.push({ id: id++, color, value: v });
      });
    });
    for (let i = 0; i < 4; i++) {
      deck.push({ id: id++, color: "wild", value: "wild" });
      deck.push({ id: id++, color: "wild", value: "wild4" });
    }
    return shuffle(deck);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newGame() {
    const deck = buildDeck();
    const hostHand = deck.splice(0, 7);
    const guestHand = deck.splice(0, 7);
    let discard = deck.shift();
    while (discard.color === "wild") {
      deck.push(discard);
      discard = deck.shift();
    }
    return {
      deck,
      hostHand,
      guestHand,
      discard: [discard],
      currentColor: discard.color,
      turn: "host",
    };
  }

  function start(rootEl) {
    root = rootEl;
    isHostSide = Room.isHost;
    if (!Room.isConnected()) {
      root.innerHTML = `<p style="color:var(--mauve); max-width:360px; text-align:center;">Uno needs both of you connected in the Room tab first — create or join a room, then come back here.</p>`;
      return;
    }
    if (isHostSide) {
      state = newGame();
      broadcastState();
    } else {
      GameHub.setStatus("Waiting for the host to deal the cards…");
    }
    renderShell();
  }

  function renderShell() {
    root.innerHTML = `
      <div style="text-align:center;">
        <div class="uno-pile">
          <div>
            <p class="kicker">draw pile</p>
            <div class="uno-card" id="unoDraw" style="background:#2C2C2A;">🂠</div>
          </div>
          <div>
            <p class="kicker">discard</p>
            <div class="uno-card" id="unoDiscard"></div>
          </div>
        </div>
        <p class="hint" id="unoOppCount"></p>
        <div class="uno-hand" id="unoHand"></div>
      </div>
    `;
    document.getElementById("unoDraw").addEventListener("click", () => act({ action: "draw" }));
  }

  function renderState() {
    if (!state || !root) return;
    const myHand = isHostSide ? state.hostHand : state.guestHand;
    const oppCount = isHostSide ? state.guestHand.length : state.hostHand.length;
    const top = state.discard[state.discard.length - 1];

    const discardEl = document.getElementById("unoDiscard");
    if (discardEl) {
      discardEl.textContent = labelFor(top);
      discardEl.style.background = COLOR_HEX[state.currentColor] || COLOR_HEX[top.color];
    }
    const oppEl = document.getElementById("unoOppCount");
    if (oppEl) oppEl.textContent = `they have ${oppCount} card${oppCount === 1 ? "" : "s"}`;

    const handEl = document.getElementById("unoHand");
    if (handEl) {
      handEl.innerHTML = "";
      myHand.forEach((card) => {
        const div = document.createElement("div");
        div.className = "uno-card";
        div.style.background = COLOR_HEX[card.color];
        div.textContent = labelFor(card);
        div.addEventListener("click", () => playCard(card));
        handEl.appendChild(div);
      });
    }

    const mySide = isHostSide ? "host" : "guest";
    GameHub.setStatus(state.turn === mySide ? "Your turn" : "Their turn");
  }

  function labelFor(card) {
    const map = { skip: "⊘", reverse: "⟲", draw2: "+2", wild: "★", wild4: "+4" };
    return map[card.value] || card.value;
  }

  function isLegal(card, s) {
    const top = s.discard[s.discard.length - 1];
    if (card.color === "wild") return true;
    return card.color === s.currentColor || card.value === top.value;
  }

  function playCard(card) {
    const mySide = isHostSide ? "host" : "guest";
    if (state.turn !== mySide) return;
    if (!isLegal(card, state)) return;
    let chosenColor = card.color;
    if (card.color === "wild") {
      chosenColor = prompt("Choose a color: red, yellow, green, blue", "red");
      if (!COLORS.includes(chosenColor)) chosenColor = "red";
    }
    act({ action: "play", cardId: card.id, chosenColor });
  }

  function act(payload) {
    if (isHostSide) {
      applyAction("host", payload);
    } else {
      Room.send({ type: "game-move", game: "uno", to: "host", ...payload });
    }
  }

  function applyAction(actor, payload) {
    const handKey = actor === "host" ? "hostHand" : "guestHand";
    const opponent = actor === "host" ? "guest" : "host";

    if (payload.action === "draw") {
      drawCards(actor, 1);
      state.turn = opponent;
    } else if (payload.action === "play") {
      const hand = state[handKey];
      const idx = hand.findIndex((c) => c.id === payload.cardId);
      if (idx === -1) return;
      const card = hand[idx];
      if (!isLegal(card, state)) return;
      hand.splice(idx, 1);
      state.discard.push(card);
      state.currentColor = card.color === "wild" ? payload.chosenColor : card.color;

      if (hand.length === 0) {
        broadcastState();
        renderState();
        GameHub.setStatus((actor === (isHostSide ? "host" : "guest") ? "You" : "They") + " win! 🎉");
        return;
      }

      if (["skip", "reverse"].includes(card.value)) {
        state.turn = actor; // in 2-player, skip/reverse just goes again
      } else if (card.value === "draw2") {
        drawCards(opponent, 2);
        state.turn = actor;
      } else if (card.value === "wild4") {
        drawCards(opponent, 4);
        state.turn = actor;
      } else {
        state.turn = opponent;
      }
    }
    broadcastState();
    renderState();
  }

  function drawCards(side, n) {
    const handKey = side === "host" ? "hostHand" : "guestHand";
    for (let i = 0; i < n; i++) {
      if (state.deck.length === 0) reshuffleDiscardIntoDeck();
      const card = state.deck.shift();
      if (card) state[handKey].push(card);
    }
  }

  function reshuffleDiscardIntoDeck() {
    const top = state.discard.pop();
    state.deck = shuffle(state.discard);
    state.discard = [top];
  }

  function broadcastState() {
    if (!isHostSide) return;
    Room.send({ type: "game-move", game: "uno", action: "state", state });
    renderState();
  }

  function onRemote(msg) {
    if (isHostSide && msg.to === "host") {
      applyAction("guest", msg);
      return;
    }
    if (!isHostSide && msg.action === "state") {
      state = msg.state;
      renderState();
    }
  }

  return { start, onRemote };
})();

/* ============================================================
   Word Search (solo)
   ============================================================ */
const WordSearch = (() => {
  const WORDS = ["LOVE", "HEART", "TOGETHER", "FOREVER", "SWEET", "HUG", "KISS", "DREAM"];
  const SIZE = 12;
  let grid, root, cellEls, found, selecting, selection;

  function start(rootEl) {
    root = rootEl;
    found = new Set();
    build();
    render();
    GameHub.setStatus("Click-drag across letters to find a word.");
  }

  function build() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1]];
    WORDS.forEach((word) => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        const r0 = Math.floor(Math.random() * SIZE);
        const c0 = Math.floor(Math.random() * SIZE);
        const r1 = r0 + dr * (word.length - 1);
        const c1 = c0 + dc * (word.length - 1);
        if (r1 < 0 || r1 >= SIZE || c1 < 0 || c1 >= SIZE) continue;
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i;
          if (grid[r][c] && grid[r][c] !== word[i]) ok = false;
        }
        if (!ok) continue;
        for (let i = 0; i < word.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i;
          grid[r][c] = word[i];
        }
        break;
      }
    });
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  function render() {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    const gridEl = document.createElement("div");
    gridEl.className = "ws-grid";
    gridEl.style.gridTemplateColumns = `repeat(${SIZE}, 32px)`;
    cellEls = [];
    selecting = false;
    selection = [];

    for (let r = 0; r < SIZE; r++) {
      cellEls.push([]);
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "ws-cell";
        cell.textContent = grid[r][c];
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.addEventListener("mousedown", () => beginSelect(r, c));
        cell.addEventListener("mouseenter", () => extendSelect(r, c));
        gridEl.appendChild(cell);
        cellEls[r].push(cell);
      }
    }
    document.addEventListener("mouseup", finishSelect);
    wrap.appendChild(gridEl);

    const wordsEl = document.createElement("div");
    wordsEl.className = "ws-words";
    WORDS.forEach((w) => {
      const span = document.createElement("span");
      span.className = "ws-word";
      span.textContent = w;
      span.dataset.word = w;
      wordsEl.appendChild(span);
    });
    wrap.appendChild(wordsEl);
    root.appendChild(wrap);
  }

  function beginSelect(r, c) {
    selecting = true;
    selection = [[r, c]];
    paintSelection();
  }
  function extendSelect(r, c) {
    if (!selecting) return;
    const [r0, c0] = selection[0];
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0);
    const len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    const path = [];
    for (let i = 0; i < len; i++) path.push([r0 + dr * i, c0 + dc * i]);
    selection = path;
    paintSelection();
  }
  function paintSelection() {
    cellEls.flat().forEach((c) => c.classList.remove("selecting"));
    selection.forEach(([r, c]) => cellEls[r][c].classList.add("selecting"));
  }
  function finishSelect() {
    if (!selecting) return;
    selecting = false;
    const letters = selection.map(([r, c]) => grid[r][c]).join("");
    const reversed = [...letters].reverse().join("");
    const match = WORDS.find((w) => (w === letters || w === reversed) && !found.has(w));
    if (match) {
      found.add(match);
      selection.forEach(([r, c]) => {
        cellEls[r][c].classList.remove("selecting");
        cellEls[r][c].classList.add("found");
      });
      const label = [...root.querySelectorAll(".ws-word")].find((el) => el.dataset.word === match);
      if (label) label.classList.add("found");
      if (found.size === WORDS.length) GameHub.setStatus("Found them all! 💕");
    } else {
      cellEls.flat().forEach((c) => c.classList.remove("selecting"));
    }
    selection = [];
  }

  function stop() {
    document.removeEventListener("mouseup", finishSelect);
  }

  return { start, stop };
})();

/* ============================================================
   Candy Match (solo match-3)
   ============================================================ */
const CandyMatch = (() => {
  const SIZE = 6;
  const CANDIES = ["🍬", "🍭", "🍫", "🍩", "🍪", "🍡"];
  let grid, root, cellEls, selected, score;

  function start(rootEl) {
    root = rootEl;
    score = 0;
    selected = null;
    grid = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, randCandy));
    resolveMatchesLoop();
    render();
  }

  function randCandy() {
    return CANDIES[Math.floor(Math.random() * CANDIES.length)];
  }

  function render() {
    root.innerHTML = "";
    const gridEl = document.createElement("div");
    gridEl.className = "candy-grid";
    cellEls = [];
    for (let r = 0; r < SIZE; r++) {
      cellEls.push([]);
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "candy-cell";
        cell.textContent = grid[r][c];
        cell.addEventListener("click", () => handleClick(r, c));
        gridEl.appendChild(cell);
        cellEls[r].push(cell);
      }
    }
    root.appendChild(gridEl);
    GameHub.setStatus(`Score: ${score}`);
  }

  function handleClick(r, c) {
    if (!selected) {
      selected = [r, c];
      cellEls[r][c].classList.add("selected");
      return;
    }
    const [r0, c0] = selected;
    cellEls[r0][c0].classList.remove("selected");
    const adjacent = Math.abs(r - r0) + Math.abs(c - c0) === 1;
    if (adjacent) {
      swap(r0, c0, r, c);
      const matches = findMatches();
      if (matches.length) {
        resolveMatchesLoop();
        render();
      } else {
        swap(r0, c0, r, c); // revert
        render();
      }
    }
    selected = null;
  }

  function swap(r0, c0, r1, c1) {
    const tmp = grid[r0][c0];
    grid[r0][c0] = grid[r1][c1];
    grid[r1][c1] = tmp;
  }

  function findMatches() {
    const matched = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 2; c++) {
        if (grid[r][c] && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
          matched.push([r, c], [r, c + 1], [r, c + 2]);
        }
      }
    }
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 2; r++) {
        if (grid[r][c] && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
          matched.push([r, c], [r + 1, c], [r + 2, c]);
        }
      }
    }
    return matched;
  }

  function resolveMatchesLoop() {
    let matches = findMatches();
    let guard = 0;
    while (matches.length && guard < 20) {
      score += matches.length;
      matches.forEach(([r, c]) => (grid[r][c] = null));
      for (let c = 0; c < SIZE; c++) {
        let write = SIZE - 1;
        for (let r = SIZE - 1; r >= 0; r--) {
          if (grid[r][c] !== null) {
            grid[write][c] = grid[r][c];
            if (write !== r) grid[r][c] = null;
            write--;
          }
        }
        for (let r = write; r >= 0; r--) grid[r][c] = randCandy();
      }
      matches = findMatches();
      guard++;
    }
  }

  return { start };
})();

/* ============================================================
   Memory Match (solo)
   ============================================================ */
const MemoryMatch = (() => {
  const EMOJI = ["💖", "🌙", "⭐", "🌸", "🎵", "🍩", "🎮", "☕"];
  let cards, flipped, matchedCount, root, cellEls, busy, moves;

  function start(rootEl) {
    root = rootEl;
    cards = shuffle([...EMOJI, ...EMOJI]);
    flipped = [];
    matchedCount = 0;
    moves = 0;
    busy = false;
    render();
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function render() {
    root.innerHTML = "";
    const gridEl = document.createElement("div");
    gridEl.className = "memory-grid";
    cellEls = [];
    cards.forEach((emoji, i) => {
      const cell = document.createElement("div");
      cell.className = "memory-card";
      cell.dataset.index = i;
      cell.addEventListener("click", () => flip(i));
      gridEl.appendChild(cell);
      cellEls.push(cell);
    });
    root.appendChild(gridEl);
    updateStatus();
  }

  function updateStatus() {
    GameHub.setStatus(`Moves: ${moves} · Pairs found: ${matchedCount}/${EMOJI.length}`);
  }

  function flip(i) {
    if (busy || flipped.includes(i) || cellEls[i].classList.contains("matched")) return;
    cellEls[i].textContent = cards[i];
    cellEls[i].classList.add("flipped");
    flipped.push(i);
    if (flipped.length === 2) {
      moves++;
      busy = true;
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        cellEls[a].classList.add("matched");
        cellEls[b].classList.add("matched");
        matchedCount++;
        flipped = [];
        busy = false;
        updateStatus();
        if (matchedCount === EMOJI.length) GameHub.setStatus("All matched! 💕");
      } else {
        setTimeout(() => {
          cellEls[a].textContent = "";
          cellEls[b].textContent = "";
          cellEls[a].classList.remove("flipped");
          cellEls[b].classList.remove("flipped");
          flipped = [];
          busy = false;
          updateStatus();
        }, 850);
      }
    }
  }

  return { start };
})();

/* ============================================================
   Would You Rather (solo)
   ============================================================ */
const WouldYouRather = (() => {
  const PAIRS = [
    ["Travel the world together", "Build our dream home together"],
    ["Watch movies all weekend", "Go on a spontaneous road trip"],
    ["Cook every meal together", "Try a new restaurant every week"],
    ["Get a pet together", "Learn a new skill together"],
    ["Slow, quiet evenings", "Adventurous, busy weekends"],
    ["Never argue but grow slowly", "Argue sometimes but grow fast"],
  ];
  let index, root;

  function start(rootEl) {
    root = rootEl;
    index = 0;
    render();
  }

  function render() {
    root.innerHTML = "";
    const [a, b] = PAIRS[index];
    const wrap = document.createElement("div");
    wrap.className = "wyr-card";
    wrap.innerHTML = `
      <p class="kicker">would you rather…</p>
      <div class="wyr-options">
        <button class="wyr-opt btn secondary" id="optA">${a}</button>
        <button class="wyr-opt btn secondary" id="optB">${b}</button>
      </div>
      <button class="btn ghost" id="nextWyr" style="margin-top:1.5rem;">Next question →</button>
    `;
    root.appendChild(wrap);
    document.getElementById("optA").addEventListener("click", () => choose("optA"));
    document.getElementById("optB").addEventListener("click", () => choose("optB"));
    document.getElementById("nextWyr").addEventListener("click", () => {
      index = (index + 1) % PAIRS.length;
      render();
    });
    GameHub.setStatus(`Question ${index + 1} of ${PAIRS.length}`);
  }

  function choose(which) {
    document.getElementById(which).style.borderColor = "var(--rose)";
    document.getElementById(which).style.color = "var(--rose-soft)";
  }

  return { start };
})();
