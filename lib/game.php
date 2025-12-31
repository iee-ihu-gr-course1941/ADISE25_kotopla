<?php

// Επιστρέφει την κατάσταση του παιχνιδιού (status) σε μορφή JSON
function show_status() {
    global $mysqli;
    
    // Πρώτα ενημερώνουμε την κατάσταση (timeout παικτών, κλήρωση σειράς κτλ.)
    update_game_status();

    $sql = 'select * from game_status';
    $st = $mysqli->prepare($sql);

    $st->execute();
    $res = $st->get_result();

    header('Content-type: application/json');
    print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

// Διαχειρίζεται την κατάσταση (started, aborted) και τους ενεργούς παίκτες
function update_game_status() {
    global $mysqli;

    // 1. Ανάκτηση τρέχουσας κατάστασης
    $sql = 'select * from game_status';
    $st = $mysqli->prepare($sql);
    $st->execute();
    $status = $st->get_result()->fetch_assoc();

    $new_status = $status['status'];
    $new_turn   = $status['p_turn'];

    // 2. Timeout: Αφαίρεση παικτών ανενεργών για > 5 λεπτά
    $st3=$mysqli->prepare(
       'select count(*) as aborted from players 
        WHERE last_action < (NOW() - INTERVAL 5 MINUTE)'
    );
    $st3->execute();
    $aborted = $st3->get_result()->fetch_assoc()['aborted'];

    if($aborted > 0) {
        $mysqli->query(
          "UPDATE players SET username=NULL, token=NULL 
           WHERE last_action < (NOW() - INTERVAL 5 MINUTE)"
        );
        if($status['status']=='started') {
            $new_status='aborted';
        }
    }

    // 3. Καταμέτρηση ενεργών παικτών
    $sql = 'select count(*) as c from players where username is not null';
    $st = $mysqli->prepare($sql);
    $st->execute();
    $active_players = $st->get_result()->fetch_assoc()['c'];

    // 4. Λογική Κατάστασης & Έναρξη
    switch($active_players) {
        case 0: 
            $new_status='not active'; 
            $new_turn=null;
            $mysqli->query("UPDATE game_status SET score_W=0, score_B=0");
            break;
        case 1: 
            $new_status='initialized'; 
            $new_turn=null;
            break;
        default: // >= 2 παίκτες
            $new_status='started';
            
            // Κλήρωση πρώτου παίκτη αν δεν έχει οριστεί σειρά
            if(empty($new_turn)) {
                $random_start = rand(0, 1);
                $new_turn = ($random_start == 0) ? 'W' : 'B';
            }
            break;
    }

    // 5. Αποθήκευση νέας κατάστασης
    $sql = 'update game_status set status=?, p_turn=?';
    $st = $mysqli->prepare($sql);
    $st->bind_param('ss',$new_status,$new_turn);
    $st->execute();
}

// Βοηθητική συνάρτηση ανάγνωσης status (επιστρέφει array)
function read_status() {
    global $mysqli;
    
    $sql = 'select * from game_status';
    $st = $mysqli->prepare($sql);

    $st->execute();
    $res = $st->get_result();
    $status = $res->fetch_assoc();
    return($status);
}

// Λογική ρίψης ζαριών (RNG & Ενημέρωση βάσης)
function roll_dice($pid) {
    global $mysqli;

    // 1. Έλεγχοι εγκυρότητας (Σειρά & αν έχει ήδη ρίξει)
    $sql = "SELECT p_turn, move_1 FROM game_status LIMIT 1";
    $st = $mysqli->prepare($sql);
    $st->execute();
    $res = $st->get_result();
    $row = $res->fetch_assoc();

    if ($row['p_turn'] != $pid) {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg' => "Δεν είναι η σειρά σου!"]);
        exit;
    }

    if ($row['move_1'] != null) {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg' => "Έχεις ήδη ρίξει ζάρια!"]);
        exit;
    }

    // 2. Ρίψη (1-6)
    $d1 = rand(1, 6);
    $d2 = rand(1, 6);

    // Διαχείριση διπλών (4 κινήσεις)
    if ($d1 == $d2) {
        $m1 = $d1; $m2 = $d1; $m3 = $d1; $m4 = $d1;
    } else {
        $m1 = $d1; $m2 = $d2; $m3 = null; $m4 = null;
    }

    // 3. Ενημέρωση διαθέσιμων κινήσεων στη βάση
    $sql_update = "UPDATE game_status SET move_1=?, move_2=?, move_3=?, move_4=?";
    $st2 = $mysqli->prepare($sql_update);
    $st2->bind_param('iiii', $m1, $m2, $m3, $m4);
    $st2->execute();

    header('Content-type: application/json');
    print json_encode(['d1' => $d1, 'd2' => $d2]);
}

// Αλλαγή σειράς (καλεί Stored Procedure)
function change_turn() {
    global $mysqli;

    $sql = "CALL change_turn()";
    $st = $mysqli->prepare($sql);

    if (!$st->execute()) {
        header("HTTP/1.1 500 Internal Server Error");
        print json_encode(['errormesg' => 'Failed to change turn']);
        return;
    }

    header('Content-type: application/json');
    print json_encode(['status' => 'ok']);
}
?>