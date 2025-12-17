var me={};
var game_status={};
var board={};
  
  $(function (){


	draw_empty_board(null);
	fill_board();

	$('#reset_board').click(reset_board);

	$('#btn').on('click', function (e) {
        e.preventDefault();
        //set_user();
        login_to_game();
		
    });
  });

/*
function draw_empty_board() {
    let t = '<table id="board_table">';

    for (let row = 1; row <= 2; row++) {
        t += '<tr>';
        for (let col = 1; col <= 12; col++) {
            t += `
              <td class="board_stack" 
                  id="stack_${row}_${col}"
                  data-row="${row}"
                  data-col="${col}">
              </td>`;
        }
        t += '</tr>';
    }

    t += '</table>';
    $('#board').html(t);
}
*/
function draw_empty_board(p) {
	
    let t = '<table id="board_table">';
if(p=='W'){
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
else if(p==null){
    for (let r=1; r<=2; r++) {
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
 

/*
function fill_board_by_data(data) {

    $('.board_stack').empty();

    data.forEach(o => {

        if (o.piece_color && o.piece_count > 0) {
            const id = '#stack_' + o.row + '_' + o.col;

            for (let i = 0; i < o.piece_count; i++) {
               alert(o.piece_color_bottom);
                $(id).append(
                    `<img src="img/${o.piece_color}.png" class="piece">`
                );
            }
        }
    });
}
*/
function fill_board_by_data(data) {

    $('.board_stack').empty();

    data.forEach(s => {
        const id = `#stack_${s.row}_${s.col}`;
        s.pieces.forEach(color => {
            $(id).append(`<img src="img/${color}.png" class="piece">`);
        });
    });
}

function reset_board() {
	$.ajax(
		{method: 'post',
		 url: "plakwto.php/board/", 
		 success: fill_board
		}
		);
}
/*
function set_user(){
	var username = $('#username_field').val();
    var color = $("#color").val();
	$.ajax(
		{method: 'PUT',
		 url: 'plakwto.php/players/'+color+'/',
		 contentType: 'application/json',
         dataType: 'json',
		 data: JSON.stringify({
            "username": username
          }),
		 success: function (response) {
            console.log("OK", response);
			$('#username_field').val('');
			//$('#error-msg').val(response);
			
        },
        error: function (xhr) {
            console.log(xhr.responseText);
			$('#username_field').val('');
			//$('#error-msg').val(response);
        }
	 }
		 
		);
}
*/
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
	$('#game_info').html("I am Player: "+me.piece_color+", my name is "+me.username +'<br>Token='+me.token+'<br>Game state: '+game_status.status+', '+ game_status.p_turn+' must play now.');	
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
		setTimeout(function() { game_status_update();}, 15000);
	} else {
		// must wait for something
		$('#move_div').hide(1000);
		setTimeout(function() { game_status_update();}, 4000);
	} 
}



  