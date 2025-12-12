  $(function (){


	draw_empty_board();
	fill_board();
	$('#reset_board').click(reset_board());
  }
	

);

function draw_empty_board(){
	var t='<table id="board_table">';
	for(var i=1;i<31;i++) {
		t += '<tr>';
		for(var j=1;j<13;j++) {
			t += '<td class="board_square" id="square_'+i+'_'+j+'">' + i +','+j+'</td>'; 
		}
		t+='</tr>';
	}
	t+='</table>';
	
	$('#board').html(t);
}

function fill_board() {
	$.ajax(
		{	method: "get",
			url: "plakwto.php/board/" ,
		    dataType: "json",
 
		 	success: fill_board_by_data 
		 
		}
	);
}

function fill_board_by_data(data) {

    for (var i = 0; i < data.length; i++) {
        var o = data[i];
        var id = '#square_' + o.x + '_' + o.y;
         
		
		//console.log(o.piece_color+".png");

		 if (o.piece_color == 'B' || o.piece_color == 'W') {

            var im = '<img src="img/'+ o.piece_color +'.png" class="piece">';

            $(id).html(im);
        }
    }
}

function reset_board() {
	$.ajax(
		{method: 'post',
		 url: "plakwto.php/board/", 
		 success: fill_board_by_data 
		}
		);
}


  