var me={};
var game_status={};
var board={};
var diceValues = [];
var selectedStack = null; 
  
  $(function (){
     $('#move_div').hide();
   
	draw_empty_board(null);
	fill_board();

	$('#reset_board').click(reset_board);
    $('#refresh_game').click(fill_board);
	$('#btn').on('click', function (e) {
        e.preventDefault();
        //set_user();
        login_to_game();
		});

  $(document).on('click', '.board_stack', onStackClick);
  });



function draw_empty_board(p) {
	
    let t = '<table id="board_table">';
if(p=='W' || p==null){
    for (let r=1; r<=2; r++) {
        t += '<tr>';
        for (let c=1; c<=12; c++) {
            t += `<td id="stack_${r}_${c}" class="board_stack"></td>`;
        }
        t += '</tr>';
    }
}
else if(p=='B'){
for (let r=2; r>=1; r--) {
        t += '<tr>';
        for (let c=1; c<=12; c++) {
            t += `<td id="stack_${r}_${c}" class="board_stack"></td>`;
        }
        t += '</tr>';
    }

}
t += '</table>';
    $('#board').html(t);
}


function fill_board() {
    $.ajax({
        method: "get",
        url: "plakwto.php/board/",
        dataType: "json",
        success: fill_board_by_data
    });
}
 


function fill_board_by_data(data) {

    // 🔁 reset board state
    board = {};

    $('.board_stack').empty();

    data.forEach(s => {
        const r = s.row;
        const c = s.col;

        if(!board[r]) board[r] = {};
        if(!board[r][c]) board[r][c] = [];

       
        board[r][c] = [...s.pieces];

       
        s.pieces.forEach((color, i) => { 
            
          
            const zIndex = 10 + i;

         
            $(`#stack_${r}_${c}`).append(
                `<img src="img/${color}.png" class="piece" style="z-index: ${zIndex}; position: relative;">`
            );
        });
    });

  
    console.log("BOARD STATE:", board);
}


function reset_board() {
	$.ajax(
		{method: 'post',
		 url: "plakwto.php/board/", 
		 success: fill_board
		}
		);
}

function login_to_game() {
	if($('#username_field').val()=='') {
		alert('You have to set a username');
		return;
	}
	var p_color = $('#color').val();
	draw_empty_board(p_color);
	fill_board();
	
	$.ajax({
		url: "plakwto.php/players/"+p_color+"/", 
		method: 'PUT',
		dataType: "json",
		contentType: 'application/json',
		headers: {"App-Token": me.token},			
		data: JSON.stringify( {username: $('#username_field').val(), piece_color: p_color}),
		success: login_result,
		error: login_error
	});
}

function login_result(data) {
    $('#username_field').val('');
	me = data[0];
	$('#game_initializer').hide();
	update_info();
	game_status_update();
}

function update_info(){
	$('#game_info').html("I am Player: "+me.piece_color+",<br> my name is "+me.username +'<br>Token='+me.token+'<br>Game state: '+game_status.status+',<br> '+ game_status.p_turn+' must play now.');	
}

function login_error(data,y,z,c) {
	var x = data.responseJSON;
	alert(x.errormesg);
     $('#username_field').val('');
}

function game_status_update() {
	//1st stage
	$.ajax({url: "plakwto.php/status/", success: update_status });
	//lecture 4
    //2nd Stage with token in header
	/* $.ajax({
	 	url: "chess.php/status/", 
	 	headers: {"App-Token": me.token},
	 	success: update_status
	});*/
}

function update_status(data) {
	if (game_status.p_turn==null ||  data[0].p_turn != game_status.p_turn ||  data[0].status != game_status.status) {
		fill_board();
	}
	game_status=data[0];
	update_info();
	if(game_status.p_turn==me.piece_color &&  me.piece_color!=null) {
		// do play
		$('#move_div').show(1000);
		setTimeout(function() { game_status_update();}, 1000);
	} else {
		// must wait for something
		$('#move_div').hide(1000);
		setTimeout(function() { game_status_update();}, 1000);
	} 
}


function do_move() {
	var s = $('#the_move').val();
	
	var a = s.trim().split(/[ ]+/); //Για να δουλεύει και με περισσότερα εσωτερικά κενα. π.χ. 2   2 3   2 θα δουλέψει!
	if(a.length!=4) {
		alert('Must give 4 numbers seperated by space');
		return;
	}
	$.ajax({url: "plakwto.php/board/piece/"+a[0]+'/'+a[1], 
			method: 'PUT',
			dataType: "json",
			contentType: 'application/json',
			//Lecture 4 1st stage token in body
			//data: JSON.stringify( {x: a[2], y: a[3], token: me.token}), // token: me.token --> Προσωρινά, αφού θα το στέλνουμε τελικά στο headers
			//Lecture 4 2nd stage token in header
			headers: {"App-Token": me.token},
			data: JSON.stringify({x: a[2], y: a[3]}),

			success: move_result,
			error: login_error});
}

function move_result(data) {
    clearSelection();
    fill_board();   // ΞΑΝΑΚΑΝΕ GET /board
	fill_board_by_data(data);
	$('#move_div').hide(1000); //Κρύψε όλο το div διαχείρισης κίνησης
	$('#the_move').val(''); //Άδειασε το κείμενο από το input συντεταγμένων
}


function onStackClick() {

	 let idtemp = $(this).attr('id');
    console.log("CLICKED:", idtemp);

    if(game_status.p_turn !== me.piece_color) { 
		console.log(me);
		alert("you cannot play its your opponent's turn!");
		return;
	}

    let [_, row, col] = this.id.split('_').map(Number);

    if(selectedStack === null) {
        if(!isMyTopPiece(row,col)) return;
        clearSelection();
        clearHighlights();

        selectedStack = {row, col};
		$(`#stack_${row}_${col}`).addClass('selected');

		highlightValidTargets(row,col); 
        //highlight(row,col);
    } else {
        let targetStack = $(`#stack_${row}_${col}`);
        if (targetStack.hasClass("valid-target")) {

        let dieUsed = targetStack.data('die');
        if (!dieUsed) return;

    attemptMove(selectedStack, { row, col }, dieUsed);
    clearSelection();

         
        }else{
            clearSelection();
            clearHighlights();
        }
        
    }
}

function isMyTopPiece(row,col){
    let stack = board[row][col];
    if(!stack || stack.length === 0) return false;
    return stack[stack.length-1] === me.piece_color;
}

function distance(from, to) {

    // 🖤 ΜΑΥΡΑ
    if (me.piece_color === 'B') {

        // ίδια γραμμή
        if (from.row === to.row) {
            return from.col - to.col;
        }

        // row 1 -> row 2
        if (from.row === 1 && to.row === 2) {
            return (from.col - 1) + to.col;
        }
    }

    // 🤍 ΛΕΥΚΑ
    if (me.piece_color === 'W') {

        // ίδια γραμμή (ίδια φορά!)
        if (from.row === to.row) {
            return from.col - to.col;
        }

        // row 2 -> row 1
        if (from.row === 2 && to.row === 1) {
            return (from.col - 1) + to.col;
        }
    }

    return -1;
}

function attemptMove(from, to, dieUsed) {

    $.ajax({
        url: `plakwto.php/board/piece/${from.row}/${from.col}`,
        method: 'PUT',
        headers: {"App-Token": me.token},
        data: JSON.stringify({ x: to.row, y: to.col }),

        success: function () {

            useDie(dieUsed);     

            fill_board();
            clearHighlights();

            // καθάρισε ζάρια που δεν έχουν πλέον legal moves
            diceValues = diceValues.filter(d => hasAnyLegalMoveForDie(d));
        },
        error: function (e) {
            alert(e.responseJSON.errormesg);
        }
    });
}

function clearSelection() {
    $('.board_stack').removeClass('selected');
    selectedStack = null;
}

function clearHighlights(){
    $('.board_stack').removeClass('valid-target');
}
function highlightValidTargets(row, col) {
    clearHighlights();

    diceValues.forEach(d => {

        // υπολόγισε στόχο με βάση ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ ζάρι
        let target = getTargetFromDie({ row, col }, d);
        if (!target) return;

        // blocked στήλη → ΟΥΤΕ highlight
        if (!isPlayableTarget(target.row, target.col)) return;

        const id = `#stack_${target.row}_${target.col}`;

        $(id)
            .addClass('valid-target')
            .data('die', d);   // αποθηκεύουμε ποιο ζάρι χρησιμοποιείται
    });
}

function isPlayableTarget(row, col) {
    let stack = board[row][col];

    // άδεια στήλη
    if (!stack || stack.length === 0) return true;

    let top = stack[stack.length - 1];
    let count = stack.length;

    // δικά μου πούλια
    if (top === me.piece_color) return true;

    // 1 αντίπαλο → χτύπημα
    if (top !== me.piece_color && count === 1) return true;

    // >=2 αντίπαλα → block
    return false;
}

function getTargetFromDie(from, d) {
    let targetRow = from.row;
    let targetCol;

    if (me.piece_color === 'B') {
        if (from.row === 1) {
            targetCol = from.col - d;
            if (targetCol < 1) {
                targetRow = 2;
                targetCol = d - (from.col - 1);
            }
        } else {
            targetCol = from.col + d;
        }
    }

    if (me.piece_color === 'W') {
        if (from.row === 2) {
            targetCol = from.col - d;
            if (targetCol < 1) {
                targetRow = 1;
                targetCol = d - (from.col - 1);
            }
        } else {
            targetCol = from.col + d;
        }
    }

    if (targetCol < 1 || targetCol > 12) return null;

    return { row: targetRow, col: targetCol };
}

function hasAnyLegalMoveForDie(die) {
    for (let r = 1; r <= 2; r++) {
        for (let c = 1; c <= 12; c++) {

            if (!isMyTopPiece(r, c)) continue;

            let target = getTargetFromDie({ row: r, col: c }, die);
            if (!target) continue;

            if (isPlayableTarget(target.row, target.col)) {
                return true;
            }
        }
    }
    return false;
}

function useDie(value) {
    const index = diceValues.indexOf(value);
    if (index === -1) return false;

    diceValues.splice(index, 1);
    return true;
}

async function rollDice() {
    const messageArea = document.getElementById('message_area');
    const dieElement1 = document.getElementById('die1');
    const dieElement2 = document.getElementById('die2');
    const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    messageArea.innerHTML = "Ρίξιμο ζαριών...";

    try {
        const myColor = me.piece_color; 

        // 1. Στέλνουμε το αίτημα στον Server
        const response = await fetch('plakwto.php/game/roll', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ color: myColor })
        });

        const data = await response.json();

        // 2. Έλεγχος για λάθη από τον Server (π.χ. "Δεν είναι η σειρά σου")
        if (!response.ok) {
            throw new Error(data.errormesg || 'Network response was not ok');
        }

        // 3. Λήψη των τιμών από την απάντηση
        const dieValue1 = data.d1;
        const dieValue2 = data.d2;
        
        diceValues = [dieValue1, dieValue2];

        // αν είναι διπλές:
        if (dieValue1 === dieValue2) {
        diceValues = [dieValue1, dieValue1, dieValue1, dieValue1];
        }

        // 4. ΕΝΗΜΕΡΩΣΗ ΤΗΣ ΟΘΟΝΗΣ 
        dieElement1.innerHTML = diceIcons[dieValue1 - 1];
        dieElement2.innerHTML = diceIcons[dieValue2 - 1];

        // 5. Εμφάνιση μηνύματος αποτελέσματος
        if (dieValue1 === dieValue2) {
            messageArea.innerHTML = "Φέρατε Διπλές! (" + dieValue1 + "-" + dieValue2 + ")";
            messageArea.style.color = "darkred";
        } else {
            messageArea.innerHTML = "Αποτέλεσμα: " + dieValue1 + " - " + dieValue2;
            messageArea.style.color = "#333";
        }


    } catch (error) {
        console.error('Error rolling dice:', error);
        messageArea.innerHTML = error.message; // Εμφάνιση του λάθους στον χρήστη
        messageArea.style.color = "red";
    }
}