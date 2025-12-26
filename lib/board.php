<?php
/*
function show_board() {
  global $mysqli;

	$sql = 'select * from board';
	$st = $mysqli->prepare($sql); //Αυτό βελτιώνει την ασφάλεια και την απόδοση.
	$st->execute();  
	$res = $st->get_result();
	header('Content-type: application/json'); //επιστρεφουμε JSON
	print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}
*/
function show_board() {
  global $mysqli;

	$sql = "
SELECT b.row, b.col, s.piece_index, s.piece_color
FROM board b
LEFT JOIN stack s
ON s.row=b.row AND s.col=b.col
ORDER BY b.row, b.col, s.piece_index
";
$st = $mysqli->prepare($sql);
$st->execute(); 
$res = $st->get_result();

$board = [];

while ($r = $res->fetch_assoc()) {

    $key = $r['row'].'_'.$r['col'];

    if (!isset($board[$key])) {
        $board[$key] = [
            'row' => (int)$r['row'],
            'col' => (int)$r['col'],
            'pieces' => []
        ];
    }

    if ($r['piece_color']) {
        $board[$key]['pieces'][] = $r['piece_color'];
    }
}

echo json_encode(array_values($board));
}
// καθαρισμος του board και επανεκκινηση
/*
function reset_board() {
	global $mysqli;
	
	$sql = 'call clean_board()';
	$mysqli->query($sql);
	show_board();
}
	*/
function reset_board() {
	global $mysqli;

	$mysqli->query("CALL reset_game()");
	show_board();
	//echo json_encode(['status'=>'reset']);
}

function move_piece($x,$y,$x2,$y2,$token) {

    $headers = getallheaders();
    $token = $headers['App-Token'] ?? null;
	echo ($token);

    if(!$token){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'No token given']);
        exit;
    }

    // ποιος παίκτης είμαι
    $color = current_color($token);
    if($color == null){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'You are not a player of this game']);
        exit;
    }

    // κατάσταση παιχνιδιού
    $status = read_status();

    if($status['status'] != 'started'){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'Game is not started']);
        exit;
    }

    // έλεγχος σειράς
    if($status['p_turn'] != $color){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'It is not your turn']);
        exit;
    }

    // όλα ΟΚ → κάνε κίνηση
    do_move($x,$y,$x2,$y2);
}

function show_piece($x,$y) {
	global $mysqli;
	
	$sql = 'select * from stack where row=? and col=?';
	$st = $mysqli->prepare($sql);
	$st->bind_param('ii',$x,$y);
	$st->execute();
	$res = $st->get_result();
	header('Content-type: application/json');
	print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

function do_move($x,$y,$x2,$y2) {
	global $mysqli;
	$sql = 'call `move_piece`(?,?,?,?);';
	$st = $mysqli->prepare($sql);
	$st->bind_param('iiii',$x,$y,$x2,$y2 );
	$st->execute();

	//Lecture 4 1st stage
	show_board();
	//Lecture 4 2nd stage
	//header('Content-type: application/json');
	//print json_encode(read_board(), JSON_PRETTY_PRINT);
}


?>