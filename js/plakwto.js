  $(function (){


	draw_empty_board();
	fill_board();

	$('#reset_board').click(reset_board);

	$('#btn').on('click', function (e) {
        e.preventDefault();
        set_user();
		
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
function draw_empty_board() {
    let t = '<table id="board_table">';

    for (let r=1; r<=2; r++) {
        t += '<tr>';
        for (let c=1; c<=12; c++) {
            t += `<td id="stack_${r}_${c}" class="board_stack"></td>`;
        }
        t += '</tr>';
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





  