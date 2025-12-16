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

$res = $mysqli->query($sql);

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

?>