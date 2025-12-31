<?php

require_once "lib/game.php";

// Διαχειριστής αιτημάτων (Router) για παίκτες
function handle_user($method, $b, $input) {
    if($method=='GET') {
        show_user($b);
    } else if($method=='PUT') { 
        set_user($b,$input);
    }
}

// Επιστρέφει τα στοιχεία συγκεκριμένου παίκτη (βάσει χρώματος)
function show_user($b) {
    global $mysqli;
    $sql = 'select username,piece_color from players where piece_color=?';
    $st = $mysqli->prepare($sql);
    $st->bind_param('s',$b);
    $st->execute();
    $res = $st->get_result();
    header('Content-type: application/json');
    print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

// Επιστρέφει λίστα με όλους τους παίκτες
function show_users() {
    global $mysqli;
    $sql = 'select username,piece_color from players';
    $st = $mysqli->prepare($sql);
    $st->execute();
    $res = $st->get_result();
    header('Content-type: application/json');
    print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

// Login παίκτη: Έλεγχος διαθεσιμότητας & Δημιουργία Token
function set_user($b,$input) {
    // 1. Έλεγχος εισόδου (Username)
    if(!isset($input['username']) || $input['username']=='') {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg'=>"No username given."]);
        exit;
    }
    $username=$input['username'];
    global $mysqli;

    // 2. Έλεγχος αν το χρώμα είναι πιασμένο από ενεργό παίκτη (timeout 1 λεπτό)
    $sql = 'select count(*) as c 
            from players 
            where piece_color=? 
            and username is not null
            and last_action > (NOW() - INTERVAL 1 MINUTE)';
    $st = $mysqli->prepare($sql);
    $st->bind_param('s',$b);
    $st->execute();
    $res = $st->get_result();
    $r = $res->fetch_all(MYSQLI_ASSOC);
    
    if($r[0]['c']>0) {
        header("HTTP/1.1 400 Bad Request");
        print json_encode(['errormesg'=>"Player $b is already set. Please select another color."]);
        exit;
    }

    // 3. Ενημέρωση παίκτη & παραγωγή MD5 Token
    $sql = 'update players 
            set username=?, 
            token=md5(CONCAT( ?, NOW()))
            where piece_color=?';
    $st2 = $mysqli->prepare($sql);
    $st2->bind_param('sss',$username,$username,$b);
    $st2->execute();

    // 4. Ενημέρωση κατάστασης παιχνιδιού & επιστροφή στοιχείων
    update_game_status();

    $sql = 'select * from players where piece_color=?';
    $st = $mysqli->prepare($sql);
    $st->bind_param('s',$b);
    $st->execute();
    $res = $st->get_result();
    header('Content-type: application/json');
    print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

// Authentication: Εύρεση χρώματος παίκτη βάσει Token
function current_color($token) {
    global $mysqli;
    if($token==null) {return(null);}
    $sql = 'select * from players where token=?';
    $st = $mysqli->prepare($sql);
    $st->bind_param('s',$token);
    $st->execute();
    $res = $st->get_result();
    if($row=$res->fetch_assoc()) {
        return($row['piece_color']);
    }
    return(null);
}

?>