var me = {}; // Αποθηκεύει πληροφορίες τρέχοντος παίκτη (username, token, χρώμα)
var game_status = {}; // Αποθηκεύει την τρέχουσα κατάσταση παιχνιδιού από τον server
var board = {}; // Τοπική αναπαράσταση του ταμπλό
var diceValues = []; // Πίνακας με τις διαθέσιμες τιμές ζαριών
var selectedStack = null; // Η επιλεγμένη θέση στο ταμπλό
var isProcessing = false; // Σημαία για αποτροπή πολλαπλών κλικ κατά την εκτέλεση
var scores = { W: 0, B: 0 }; // Καταγράφει τα σκορ για Λευκά και Μαύρα
var gameEnded = false; // Σημαία που δείχνει αν το παιχνίδι τελείωσε
let manualTurnChange = false; // Σημαία για τη λογική χειροκίνητης αλλαγής σειράς
var resigned = false; // Σημαία για κατάσταση παραίτησης
var resignedBy = null; // Αποθηκεύει ποιος παραιτήθηκε
var winByBearOff = false; // Σημαία για νίκη μέσω μαζέματος
var turnStartTime = null; // Χρονοσφραγίδα για τη διάρκεια του γύρου

/* ==========================================================================
   1) ΣΥΝΑΡΤΗΣΕΙΣ BACKEND / AJAX
   ========================================================================== */

// Ανακτά την τρέχουσα κατάσταση του ταμπλό από τον server
function fill_board() {
  return $.ajax({
    method: "get",
    url: "plakwto.php/board/",
    headers: { "App-Token": me.token },
    dataType: "json",
    success: fill_board_by_data,
  });
}

// Επαναφέρει το ταμπλό και την κατάσταση παιχνιδιού στον server
function reset_board(winner = null) {
  $.ajax({
    method: "post",
    url: "plakwto.php/board/",
    headers: { "App-Token": me.token },
    contentType: "application/json",
    data: JSON.stringify({ winner: winner }),
    success: function (data) {
      $("#winner_alert").hide();
      $("#game_initializer").hide();
      gameEnded = false;
      fill_board();
      game_status_update();
    },
  });
}

// Επανεκκινεί το παιχνίδι μετά από νίκη
function restart_game(winner = null) {
  manualTurnChange = true;
  gameEnded = false;
  resigned = false;
  resignedBy = null;

  $.ajax({
    method: "put",
    url: "plakwto.php/board/",
    headers: { "App-Token": me.token },
    contentType: "application/json",
    data: JSON.stringify({ winner: winner }),
    success: function () {
      $("#winner_alert").hide();
      manualTurnChange = false;
      fill_board();
      game_status_update();
    },
  });
}

// Ζητάει ενημερώσεις κατάστασης παιχνιδιού από τον server (Polling)
function game_status_update() {
  $.ajax({
    url: "plakwto.php/status/",
    headers: { "App-Token": me.token },
    cache: false,
    success: update_status,
  });
}

// Ενεργοποιεί χειροκίνητα την αλλαγή σειράς στον server
function game_status_update_manual() {
  manualTurnChange = true;
  $("#die1").html("");
  $("#die2").html("");
  diceValues = [];

  $.ajax({
    method: "POST",
    url: "plakwto.php/change_turn/",
    headers: { "App-Token": me.token },
    dataType: "json",
    success: function (data) {
      console.log("Η σειρά άλλαξε επιτυχώς.");
      game_status_update();
      manualTurnChange = false;
    },
    error: function (xhr, status, error) {
      console.error("Σφάλμα στην αλλαγή σειράς:", error);
      manualTurnChange = false;
    },
  });
}

/* ==========================================================================
   2) ΣΥΝΑΡΤΗΣΕΙΣ ΤΑΜΠΛΟ (ΓΡΑΦΙΚΑ)
   ========================================================================== */

// Σχεδιάζει τον αρχικό άδειο πίνακα HTML για το ταμπλό
function draw_empty_board(p) {
  let t = '<table id="board_table">';
  if (p == "W" || p == null) {
    for (let r = 1; r <= 2; r++) {
      t += "<tr>";
      for (let c = 1; c <= 12; c++) {
        t += `<td id="stack_${r}_${c}" class="board_stack"></td>`;
      }
      t += "</tr>";
    }
  } else if (p == "B") {
    for (let r = 2; r >= 1; r--) {
      t += "<tr>";
      for (let c = 1; c <= 12; c++) {
        t += `<td id="stack_${r}_${c}" class="board_stack"></td>`;
      }
      t += "</tr>";
    }
  }
  t += "</table>";
  $("#board").html(t);
}

// Γεμίζει το ταμπλό με πούλια βάσει των δεδομένων του server
function fill_board_by_data(data) {
  board = {};
  $(".board_stack").empty();
  $(".board_stack").removeClass("selected valid-target valid-bear-off");

  data.forEach((s) => {
    const r = s.row;
    const c = s.col;

    if (!board[r]) board[r] = {};
    if (!board[r][c]) board[r][c] = [];

    board[r][c] = [...s.pieces];

    let piecesToShow = s.pieces;
    if (
      (me.piece_color === "B" && r === 1) ||
      (me.piece_color === "W" && r === 2)
    ) {
      piecesToShow = s.pieces.slice().reverse();
    }

    piecesToShow.forEach((color, i) => {
      const zIndex = 10 + i;
      $(`#stack_${r}_${c}`).append(
        `<img src="img/${color}.png" class="piece" style="z-index: ${zIndex}; position: relative;">`
      );
    });
  });

  console.log("BOARD STATE:", board);
  checkForWin();
}

/* ==========================================================================
   3) ΣΥΝΑΡΤΗΣΕΙΣ ΚΙΝΗΣΕΩΝ (ΛΟΓΙΚΗ & ΕΚΤΕΛΕΣΗ)
   ========================================================================== */

// Διαχειρίζεται τη ρίψη ζαριών μέσω αιτήματος στον server
async function rollDice() {
  const messageArea = document.getElementById("message_area");
  const dieElement1 = document.getElementById("die1");
  const dieElement2 = document.getElementById("die2");
  const diceIcons = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  messageArea.innerHTML = "Ρίξιμο ζαριών...";

  try {
    const myColor = me.piece_color;
    const response = await fetch("plakwto.php/game/roll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: myColor }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errormesg || "Network response was not ok");
    }

    const dieValue1 = Number(data.d1);
    const dieValue2 = Number(data.d2);
    diceValues = [dieValue1, dieValue2];

    if (dieValue1 === dieValue2) {
      diceValues = [dieValue1, dieValue1, dieValue1, dieValue1];
    }

    dieElement1.innerHTML = diceIcons[dieValue1 - 1];
    dieElement2.innerHTML = diceIcons[dieValue2 - 1];

    if (dieValue1 === dieValue2) {
      messageArea.innerHTML =
        "Φέρατε Διπλές! (" + dieValue1 + "-" + dieValue2 + ")";
      messageArea.style.color = "darkred";
    } else {
      messageArea.innerHTML = "Αποτέλεσμα: " + dieValue1 + " - " + dieValue2;
      messageArea.style.color = "#333";
    }

    if (!checkRemainingMoves()) {
        setTimeout(function () {
        game_status_update_manual();},800);
        diceValues = [];
      if (!gameEnded) {
        setTimeout(function () {
          alert(
            "Δεν έχετε διαθέσιμες κινήσεις, η σειρά περνάει στον αντίπαλο!"
          );
        }, 1000);
      } else {
        game_status_update_manual();
      }
    }
  } catch (error) {
    console.error("Error rolling dice:", error);
    messageArea.innerHTML = error.message;
    messageArea.style.color = "red";
  }
}

// Κύριος διαχειριστής για κλικ στις θέσεις του ταμπλό (επιλογή/κίνηση)
function onStackClick() {
  if (isProcessing) {
    console.warn("Click blocked because isProcessing = true. Please wait.");
    return;
  }

  if (game_status.p_turn !== me.piece_color) {
    alert("Δεν είναι η σειρά σου!");
    return;
  }

  let parts = this.id.split("_");
  let row = parseInt(parts[1]);
  let col = parseInt(parts[2]);

  let clickedStack = $(`#stack_${row}_${col}`);

  if (selectedStack === null) {
    if (!isMyTopPiece(row, col)) return;

    clearSelection();
    clearHighlights();

    selectedStack = { row: row, col: col };
    clickedStack.addClass("selected");

    highlightValidTargets(row, col);
  } else {
    let moveFrom = { row: selectedStack.row, col: selectedStack.col };
    let dieUsed = parseInt(clickedStack.data("die"));

    if (clickedStack.hasClass("valid-bear-off")) {
      isProcessing = true;
      if (!useDie(dieUsed)) {
        isProcessing = false;
        return;
      }

      clearSelection();
      clearHighlights();
      attemptMove(moveFrom, { row: 0, col: 0 }, dieUsed);
    } else if (clickedStack.hasClass("valid-target")) {
      isProcessing = true;
      if (!useDie(dieUsed)) {
        isProcessing = false;
        return;
      }

      clearSelection();
      clearHighlights();
      attemptMove(moveFrom, { row: row, col: col }, dieUsed);
    } else {
      clearSelection();
      clearHighlights();
    }
  }
}

// Εκτελεί μια κίνηση στον server
function attemptMove(from, to, dieUsed) {
  console.log("Attempting move...", from, to, dieUsed);

  $.ajax({
    url: `plakwto.php/board/piece/${from.row}/${from.col}`,
    headers: { "App-Token": me.token },
    method: "PUT",
    data: JSON.stringify({ x: to.row, y: to.col }),

    success: function () {
      fill_board().then(function () {
        if (diceValues.length === 0) {
          console.log("Dice finished. Changing turn...");
          game_status_update();
        } else {
          if (!checkRemainingMoves()) {
            game_status_update_manual();
            diceValues = [];
            if (!gameEnded) {
              setTimeout(function () {
                alert(
                  "Δεν έχετε διαθέσιμες κινήσεις, η σειρά περνάει στον αντίπαλο!"
                );
              }, 1000);
            } else {
              game_status_update_manual();
            }
          }
        }
        isProcessing = false;
      });
    },
    error: function (e) {
      console.error("Move failed:", e);
      alert("Η κίνηση απέτυχε.");
      diceValues.push(dieUsed);
      fill_board();
      isProcessing = false;
    },
  });
}

// Ελέγχει τις διαθέσιμες κινήσεις για τα τρέχοντα ζάρια
function checkRemainingMoves() {
  if (!me.piece_color) return false;
  if (game_status.p_turn !== me.piece_color) return false;
  if (diceValues.length === 0) return false;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 12; c++) {
      if (!isMyTopPiece(r, c)) continue;

      for (let d of diceValues) {
        let die = parseInt(d);

        if (isBearOffMoveValid(r, c, die)) {
          console.log(`Found bear-off move at ${r},${c} with die ${die}`);
          return true;
        }

        let target = getTargetFromDie({ row: r, col: c }, die);

        if (!target) continue;

        if (
          target.col >= 1 &&
          target.col <= 12 &&
          isPlayableTarget(target.row, target.col)
        ) {
          console.log(
            `Found normal move at ${r},${c} -> ${target.row},${target.col} with die ${die}`
          );
          return true;
        }
      }
    }
  }

  return false;
}

// Ελέγχει αν το πάνω πούλι μιας στήλης ανήκει στον τρέχοντα παίκτη
function isMyTopPiece(row, col) {
  let stack = board[row][col];
  if (!stack || stack.length === 0) return false;
  return stack[stack.length - 1] === me.piece_color;
}

// Υπολογίζει την απόσταση μεταξύ θέσεων
function distance(from, to) {
  if (me.piece_color === "B") {
    if (from.row === to.row) {
      return from.col - to.col;
    }
    if (from.row === 1 && to.row === 2) {
      return from.col - 1 + to.col;
    }
  }
  if (me.piece_color === "W") {
    if (from.row === to.row) {
      return from.col - to.col;
    }
    if (from.row === 2 && to.row === 1) {
      return from.col - 1 + to.col;
    }
  }
  return -1;
}

// Καθαρίζει το τρέχον επιλεγμένο πούλι
function clearSelection() {
  $(".board_stack").removeClass("selected");
  selectedStack = null;
}

// Καθαρίζει τους φωτισμούς έγκυρων κινήσεων
function clearHighlights() {
  $(".board_stack").removeClass("valid-target");
  $(".board_stack").removeClass("valid-bear-off");
}

// Φωτίζει τις έγκυρες θέσεις στόχους για το επιλεγμένο πούλι
function highlightValidTargets(row, col) {
  clearHighlights();

  let startRow = parseInt(row);
  let startCol = parseInt(col);

  diceValues.forEach((d) => {
    let die = parseInt(d);

    if (isBearOffMoveValid(startRow, startCol, die)) {
      $(`#stack_${startRow}_${startCol}`)
        .addClass("valid-bear-off")
        .data("die", die);
    }

    let target = getTargetFromDie({ row: startRow, col: startCol }, die);

    if (
      target &&
      target.col <= 12 &&
      isPlayableTarget(target.row, target.col)
    ) {
      $(`#stack_${target.row}_${target.col}`)
        .addClass("valid-target")
        .data("die", die);
    }
  });
}

// Ελέγχει αν μια θέση στόχος μπορεί να παιχτεί
function isPlayableTarget(row, col) {
  let stack = board[row][col];
  if (!stack || stack.length === 0) return true;
  let top = stack[stack.length - 1];
  let count = stack.length;
  if (top === me.piece_color) return true;
  if (top !== me.piece_color && count === 1) return true;
  return false;
}

// Υπολογίζει τις συντεταγμένες στόχου βάσει της ζαριάς
function getTargetFromDie(from, d) {
  let startRow = parseInt(from.row);
  let startCol = parseInt(from.col);
  let die = parseInt(d);
  let targetRow = startRow;
  let targetCol;

  if (me.piece_color === "B") {
    if (startRow === 1) {
      targetCol = startCol - die;
      if (targetCol < 1) {
        targetRow = 2;
        targetCol = die - (startCol - 1);
      }
    } else {
      targetCol = startCol + die;
    }
  }
  if (me.piece_color === "W") {
    if (startRow === 2) {
      targetCol = startCol - die;
      if (targetCol < 1) {
        targetRow = 1;
        targetCol = die - (startCol - 1);
      }
    } else {
      targetCol = startCol + die;
    }
  }

  if (targetCol < 1 || targetCol > 12) return null;
  return { row: targetRow, col: targetCol };
}

// Ελέγχει αν υπάρχει έγκυρη κίνηση για ένα συγκεκριμένο ζάρι
function hasAnyLegalMoveForDie(die) {
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 12; c++) {
      if (!isMyTopPiece(r, c)) continue;
      if (isBearOffMoveValid(r, c, die)) return true;
      let target = getTargetFromDie({ row: r, col: c }, die);
      if (!target) continue;
      if (isPlayableTarget(target.row, target.col)) return true;
    }
  }
  return false;
}

// Χρησιμοποιεί ένα ζάρι από τα διαθέσιμα
function useDie(value) {
  let val = parseInt(value);
  const index = diceValues.findIndex((d) => d == val);
  if (index === -1) {
    console.error(
      "ΣΦΑΛΜΑ: Το ζάρι " + val + " δεν βρέθηκε στα διαθέσιμα:",
      diceValues
    );
    return false;
  }
  diceValues.splice(index, 1);
  console.log("Επιτυχής χρέωση ζαριού:", val, "| Έμειναν:", diceValues);
  return true;
}

/* ==========================================================================
   4) ΣΥΝΑΡΤΗΣΕΙΣ ΜΑΖΕΜΑΤΟΣ (ΛΟΓΙΚΗ ΣΥΛΛΟΓΗΣ)
   ========================================================================== */

// Ελέγχει αν ο παίκτης μπορεί να αρχίσει να μαζεύει πούλια
function canBearOff(playerColor) {
  let piecesOnBoard = 0;
  let piecesInHome = 0;
  let isAnyPiecePinned = false;
  let homeRow = playerColor === "W" ? 1 : 2;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 12; c++) {
      let stack = board[r][c];
      if (stack && stack.length > 0) {
        if (stack.includes(playerColor)) {
          if (stack[stack.length - 1] !== playerColor) {
            isAnyPiecePinned = true;
          }
        }
        stack.forEach((piece) => {
          if (piece === playerColor) {
            piecesOnBoard++;
            if (r === homeRow && c >= 7 && c <= 12) {
              piecesInHome++;
            }
          }
        });
      }
    }
  }
  if (isAnyPiecePinned) return false;
  return piecesOnBoard > 0 && piecesOnBoard === piecesInHome;
}

// Επαληθεύει τις κινήσεις μαζέματος
function isBearOffMoveValid(fromRow, fromCol, die) {
  if (!canBearOff(me.piece_color)) return false;
  let homeRow = me.piece_color === "W" ? 1 : 2;
  if (fromRow !== homeRow || fromCol < 7) return false;
  let distanceToExit = 13 - fromCol;

  if (distanceToExit === die) return true;

  if (die > distanceToExit) {
    for (let c = 7; c < fromCol; c++) {
      if (isMyTopPiece(homeRow, c)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

/* ==========================================================================
   5) ΣΥΝΑΡΤΗΣΕΙΣ ΠΑΙΚΤΩΝ
   ========================================================================== */

// Συνδέει τον παίκτη στο παιχνίδι
function login_to_game() {
  if ($("#username_field").val() == "") {
    alert("You have to set a username");
    return;
  }
  var p_color = $("#color").val();
  draw_empty_board(p_color);
  fill_board();

  $.ajax({
    url: "plakwto.php/players/" + p_color + "/",
    headers: { "App-Token": me.token },
    method: "PUT",
    dataType: "json",
    contentType: "application/json",
    data: JSON.stringify({
      username: $("#username_field").val(),
      piece_color: p_color,
    }),
    success: login_result,
    error: login_error,
  });
}

// Διαχειρίζεται την επιτυχημένη σύνδεση
function login_result(data) {
  $("#username_field").val("");
  $("#score_board").show();
  me = data[0];
  $("#game_initializer").hide();
  update_info();
  game_status_update();
}

// Ενημερώνει το UI με πληροφορίες παίκτη και παιχνιδιού
function update_info() {
  let html = "";
  let turnMessage = "";

  html += `
    <div class="player-info">
        <div class="player-avatar">
            ${me.username ? me.username.charAt(0) : "?"}
        </div>
        <span class="player-name">${me.username || ""}</span>
        <div class="player-color ${
          me.piece_color === "W" ? "white" : "black"
        }"></div>
    </div>`;

  if (game_status.status == "initialized") {
    html += `<div>Αναμονή γιά αντίπαλο...</div>`;
  } else {
    html += `<div>Game ${game_status.status}</div>`;
  }

  if (game_status.p_turn === "W") {
    turnMessage = "⚪ Τα Λευκά παίζουν τώρα.";
  } else if (game_status.p_turn === "B") {
    turnMessage = "⚫ Τα Μάυρα παίζουν τώρα.";
  } else {
    turnMessage = "🎲 Rolling dice for first player...";
  }

  html += `
        <div style="margin-top:8px; font-weight:bold; font-size:1.1em;">
            ${turnMessage}
        </div>
    `;

  $("#game_info").html(html);
}

// Διαχειρίζεται σφάλματα σύνδεσης
function login_error(data, y, z, c) {
  var x = data.responseJSON;
  alert(x.errormesg);
  $("#username_field").val("");
}

/* ==========================================================================
   6) ΛΟΓΙΚΗ ΠΑΙΧΝΙΔΙΟΥ / ΛΕΙΤΟΥΡΓΙΑ
   ========================================================================== */

// Αρχικοποιεί τους listeners όταν φορτώσει το έγγραφο
$(function () {
  $("#move_div").hide();
  $("#score_board").hide();
  draw_empty_board(null);
  fill_board();

  $("#resign").click(function () {
    if (!me.piece_color) return;
    if (!confirm("Είστε σίγουρος ότι θέλετε να παραιτηθείτε;")) return;

    const winner = me.piece_color === "W" ? "B" : "W";
    show_resignation_message(winner);
    restart_game(winner);
  });

  $("#refresh_game").click(fill_board);
  $("#reset_board").click(reset_board);
  $("#btn").on("click", function (e) {
    e.preventDefault();
    login_to_game();
  });

  $(document).on("click", ".board_stack", onStackClick);
});

// Επεξεργάζεται τις ενημερώσεις κατάστασης από τον server
function update_status(data) {
  const new_status = data[0];
  const old_status = game_status || {};

  if (new_status.status === "started") {
    if (turnStartTime === null || old_status.status === "initialized") {
      turnStartTime = Date.now();
    }
  }

  const oldW = parseInt(scores["W"]);
  const oldB = parseInt(scores["B"]);
  const newW = parseInt(new_status.score_w);
  const newB = parseInt(new_status.score_b);

  if (old_status.score_w !== undefined && (newW > oldW || newB > oldB)) {
    if (!winByBearOff) {
      const winner = newW > oldW ? "W" : "B";
      turnStartTime = Date.now();

      if (!gameEnded) {
        gameEnded = true;
        show_resignation_message(winner);
      }
    } else {
      winByBearOff = false;
    }
  }

  $("#score_W").text(new_status.score_w);
  $("#score_B").text(new_status.score_b);

  scores["W"] = parseInt(new_status.score_w);
  scores["B"] = parseInt(new_status.score_b);

  const turnChanged =
    old_status.p_turn && new_status.p_turn !== old_status.p_turn;

  if (turnChanged) {
    turnStartTime = Date.now();
  }

  const statusChanged = new_status.status !== old_status.status;

  if (turnChanged || statusChanged) {
    fill_board();
  }

  game_status = new_status;
  update_info();

  if (gameEnded && manualTurnChange) {
    return;
  }

  if (!gameEnded && game_status.p_turn === me.piece_color && me.piece_color) {
    $("#move_div").show();
    $("#reset_board").prop("disabled", false);
    $("#resign").prop("disabled", false);
  } else {
    $("#move_div").hide();
    $("#reset_board").prop("disabled", true);
    $("#resign").prop("disabled", true);
  }

  if (!manualTurnChange) {
    checkAutoTurnChange();
  }

  if (!manualTurnChange) {
    setTimeout(game_status_update, 1000);
  }
}

// Ελέγχει τοπικά για συνθήκες νίκης
function checkForWin() {
  let piecesW = 0;
  let piecesB = 0;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 12; c++) {
      if (board[r] && board[r][c]) {
        board[r][c].forEach((piece) => {
          if (piece === "W") piecesW++;
          if (piece === "B") piecesB++;
        });
      }
    }
  }

  if (piecesW > 0 && piecesB > 0) {
    gameEnded = false;
    return;
  }

  if (gameEnded) return;
  if (piecesW === 0 && piecesB === 0) return;

  let winner = null;
  let winnerName = "";

  if (piecesW === 0) {
    winner = "W";
    winnerName = "Λευκός";
  } else if (piecesB === 0) {
    winner = "B";
    winnerName = "Μαύρα";
  }

  if (winner) {
    gameEnded = true;
    winByBearOff = true;
    let msg = `🎉 Ο παίκτης ${winnerName} (${winner}) ΚΕΡΔΙΣΕ! 🎉<br>Επαναφορά σε 3"...`;
    $("#winner_alert").html(msg).show();
    $("#move_div").hide();

    setTimeout(function () {
      $("#winner_alert").hide();
    }, 3000);

    if (me.piece_color === winner) {
      setTimeout(function () {
        restart_game(winner);
      }, 3000);
    }
  }
}

// Εμφανίζει μήνυμα κατά την παραίτηση
function show_resignation_message(winnerColor) {
  turnStartTime = Date.now();
  let winnerName = winnerColor === "W" ? "White" : "Black";
  let msg = `🏳️ Ο αντίπαλος παραιτήθηκε! <br> Νικητής: ${winnerName} (+1 Πόντος)`;

  if (me.piece_color === winnerColor) {
    msg = `🏳️ Ο αντίπαλος παραιτήθηκε! Κέρδισες! 🎉`;
  } else if (me.piece_color && me.piece_color !== winnerColor) {
    msg = `🏳️ Παραιτηθήκατε. Ο παίκτης ${winnerName} κερδίζει.`;
  }

  $("#winner_alert").html(msg).fadeIn();
  setTimeout(function () {
    $("#winner_alert").fadeOut();
  }, 4000);
}

// Παρακολουθεί το χρονόμετρο γύρου και αλλάζει αυτόματα σειρά στη λήξη
function checkAutoTurnChange() {
  if (gameEnded || !me.piece_color || game_status.p_turn !== me.piece_color) {
    $("#move_div").hide();
    return;
  }

  if (game_status.status === "initialized" || turnStartTime === null) {
    $("#move_div").hide();
    return;
  }

  let timeLimit = 60000;
  let timeElapsed = Date.now() - turnStartTime;
  let timeRemaining = timeLimit - timeElapsed;
  let secondsLeft = Math.ceil(timeRemaining / 1000);

  if (secondsLeft >= 0) {
    let moveDiv = $("#move_div");
    moveDiv.show();
    moveDiv.html(`
            <div>H σειρά σου να παίξεις!</div>
            <div style="font-size: 1.5em; font-weight: bold; margin-top: 5px;">
                ⏱️ ${secondsLeft}s
            </div>
        `);

    if (secondsLeft <= 10) {
      moveDiv.removeClass("alert-warning").addClass("alert-danger");
    } else {
      moveDiv.removeClass("alert-danger").addClass("alert-warning");
    }
  }

  if (timeElapsed > timeLimit) {
    console.warn("⏳ Ο χρόνος (1 λεπτό) παρήλθε. Αυτόματη αλλαγή σειράς.");
    $("#winner_alert")
      .html("⏳ Ο χρόνος σας τελείωσε! Η σειρά περνάει στον αντίπαλο.")
      .show();

    setTimeout(function () {
      $("#winner_alert").fadeOut();
    }, 3000);

    $("#move_div").hide();
    game_status_update_manual();
    turnStartTime = Date.now();
  }
}