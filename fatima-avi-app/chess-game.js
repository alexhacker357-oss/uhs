/* ============================================================
   Chess — full legal chess via chess.js (rules engine) and
   chessboard.js (drag/drop board UI), moves synced through Room.
   Whoever created the room plays white.
   ============================================================ */

const ChessGame = (() => {
  let game, board, myColor;

  function start(root) {
    root.innerHTML = `<div id="chessBoard"></div>`;
    game = new Chess();
    myColor = !Room.isConnected() ? null : Room.isHost ? "w" : "b";

    board = Chessboard("chessBoard", {
      draggable: true,
      position: "start",
      pieceTheme: "https://cdnjs.cloudflare.com/ajax/libs/chessboardjs/1.0.0/img/chesspieces/wikipedia/{piece}.png",
      onDragStart,
      onDrop,
      onSnapEnd: () => board.position(game.fen()),
      orientation: myColor === "b" ? "black" : "white",
    });

    updateStatus();
  }

  function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if (myColor && piece.search(myColor) !== 0) return false;
    if (myColor && game.turn() !== myColor) return false;
  }

  function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: "q" });
    if (move === null) return "snapback";
    if (Room.isConnected()) {
      Room.send({ type: "game-move", game: "chess", from: source, to: target, promotion: "q" });
    }
    updateStatus();
  }

  function onRemote(msg) {
    const move = game.move({ from: msg.from, to: msg.to, promotion: msg.promotion || "q" });
    if (move) board.position(game.fen());
    updateStatus();
  }

  function updateStatus() {
    let text = game.turn() === "w" ? "White to move" : "Black to move";
    if (game.in_checkmate()) text = (game.turn() === "w" ? "Black" : "White") + " wins by checkmate";
    else if (game.in_draw()) text = "Draw";
    else if (game.in_check()) text += " · check";
    if (myColor) text += myColor === game.turn() ? " (you)" : " (them)";
    GameHub.setStatus(text);
  }

  return { start, onRemote };
})();

window.ChessGame = ChessGame;
