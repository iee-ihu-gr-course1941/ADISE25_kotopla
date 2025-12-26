<?php

//Almost same with the show_board...
function show_status() {
    global $mysqli;
	
    update_game_status();

	$sql = 'select * from game_status';
	$st = $mysqli->prepare($sql);

	$st->execute();
	$res = $st->get_result();

	header('Content-type: application/json');
	print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

function update_game_status() {
	global $mysqli;

	$sql = 'select * from game_status';
	$st = $mysqli->prepare($sql);
	$st->execute();
	$status = $st->get_result()->fetch_assoc();

	$new_status = $status['status'];
	$new_turn   = $status['p_turn'];

	// aborted players
	$st3=$mysqli->prepare(
	  'select count(*) as aborted from players 
	   WHERE last_action < (NOW() - INTERVAL 5 MINUTE)'
	);
	$st3->execute();
	$aborted = $st3->get_result()->fetch_assoc()['aborted'];

	if($aborted>0) {
		$mysqli->query(
		  "UPDATE players SET username=NULL, token=NULL 
		   WHERE last_action < (NOW() - INTERVAL 5 MINUTE)"
		);
		if($status['status']=='started') {
			$new_status='aborted';
		}
	}

	$sql = 'select count(*) as c from players where username is not null';
	$st = $mysqli->prepare($sql);
	$st->execute();
	$active_players = $st->get_result()->fetch_assoc()['c'];

	switch($active_players) {
		case 0: 
			$new_status='not active'; 
			$new_turn=null;
			break;
		case 1: 
			$new_status='initialized'; 
			$new_turn=null;
			break;
		case 2: 
			$new_status='started';
			if($status['p_turn']==null) {
				$new_turn='W';
			}
			break;
	}

	$sql = 'update game_status set status=?, p_turn=?';
	$st = $mysqli->prepare($sql);
	$st->bind_param('ss',$new_status,$new_turn);
	$st->execute();
}


function read_status() {
	global $mysqli;
	
	$sql = 'select * from game_status';
	$st = $mysqli->prepare($sql);

	$st->execute();
	$res = $st->get_result();
	$status = $res->fetch_assoc();
	return($status);
}

// Νέα συνάρτηση για ρίψη ζαριών 


function roll_dice($pid) {
    global $mysqli;

    // 1. Ελέγχουμε τίνος είναι η σειρά και αν έχουν ήδη ριχτεί ζάρια
    $sql = "SELECT p_turn, move_1 FROM game_status LIMIT 1";
    $st = $mysqli->prepare($sql);
    $st->execute();
    $res = $st->get_result();
    $row = $res->fetch_assoc();

    // Α. Έλεγχος Σειράς
    if ($row['p_turn'] != $pid) {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg' => "Δεν είναι η σειρά σου!"]);
        exit;
    }

    // Β. Έλεγχος αν έχει ήδη ρίξει
    if ($row['move_1'] != null) {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg' => "Έχεις ήδη ρίξει ζάρια!"]);
        exit;
    }

    // 2. Αν όλα καλά, ρίχνουμε τα ζάρια (Ο κώδικας που είχες)
    $d1 = rand(1, 6);
    $d2 = rand(1, 6);

    if ($d1 == $d2) {
        $m1 = $d1; $m2 = $d1; $m3 = $d1; $m4 = $d1;
    } else {
        $m1 = $d1; $m2 = $d2; $m3 = null; $m4 = null;
    }

    $sql_update = "UPDATE game_status SET move_1=?, move_2=?, move_3=?, move_4=?";
    $st2 = $mysqli->prepare($sql_update);
    $st2->bind_param('iiii', $m1, $m2, $m3, $m4);
    $st2->execute();

    header('Content-type: application/json');
    print json_encode(['d1' => $d1, 'd2' => $d2]);
}

?>