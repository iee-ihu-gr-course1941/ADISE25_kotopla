<?php
function show_board() {
  global $mysqli;
	
	$sql = 'select * from board';
	$st = $mysqli->prepare($sql); //Αυτό βελτιώνει την ασφάλεια και την απόδοση.
	$st->execute();
	$res = $st->get_result();
	header('Content-type: application/json'); //επιστρεφουμε JSON
	print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}
// καθαρισμος του board και επανεκκινηση
function reset_board() {
	global $mysqli;
	
	$sql = 'call clean_board()';
	$mysqli->query($sql);
	show_board();
}

?>