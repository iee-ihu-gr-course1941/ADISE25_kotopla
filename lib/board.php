<?php

function show_board() {
    global $mysqli;

    // Ανάκτηση δεδομένων: Ενώνει τον πίνακα θέσεων (board) με τα πούλια (stack)
    // και τα ταξινομεί ώστε να χτιστεί σωστά η στοίβα.
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

    // Μετατροπή των 'flat' αποτελεσμάτων της SQL σε ιεραρχική μορφή JSON (Board -> Stack -> Pieces)
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

function reset_board() {
    global $mysqli;

    // Hard Reset: Μηδενισμός σκορ και πλήρης επαναφορά του παιχνιδιού μέσω Procedure
    $mysqli->query("UPDATE game_status SET score_W = 0, score_B = 0");
    
    $mysqli->query("CALL reset_game()");
    show_board();
    //echo json_encode(['status'=>'reset']);
}

function move_piece($x,$y,$x2,$y2,$token) {

    $headers = getallheaders();
    $token = $headers['App-Token'] ?? null;
    echo ($token);

    // 1. Έλεγχος Authentication (αν υπάρχει Token)
    if(!$token){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'No token given']);
        exit;
    }

    // 2. Έλεγχος Authorization (αν το Token ανήκει σε παίκτη)
    $color = current_color($token);
    if($color == null){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'You are not a player of this game']);
        exit;
    }

    // 3. Έλεγχος Κατάστασης (αν το παιχνίδι έχει ξεκινήσει)
    $status = read_status();

    if($status['status'] != 'started'){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'Game is not started']);
        exit;
    }

    // 4. Έλεγχος Σειράς (αν είναι η σειρά του συγκεκριμένου χρώματος)
    if($status['p_turn'] != $color){
        header("HTTP/1.1 400 Bad Request");
        echo json_encode(['errormesg'=>'It is not your turn']);
        exit;
    }

    // Αν όλα είναι έγκυρα, προχωράμε στην εκτέλεση της κίνησης
    do_move($x,$y,$x2,$y2);
}

function restart_game() {
    global $mysqli;

    // Λήψη νικητή από το αίτημα (JSON body) για ενημέρωση σκορ
    $input = json_decode(file_get_contents('php://input'), true);
    $winner = isset($input['winner']) ? $input['winner'] : null;

   if ($winner == 'W') {
        $mysqli->query("UPDATE game_status SET score_w = score_w + 1");
    } elseif ($winner == 'B') {
        $mysqli->query("UPDATE game_status SET score_b = score_b + 1");
    }

    // Κλήση της SQL Procedure για καθαρισμό του ταμπλό
    $mysqli->query("CALL restart_game()");

    // Διαχείριση σειράς:
    if ($winner == 'W' || $winner == 'B') {
        // Περίπτωση Νίκης: Ο νικητής παίζει πρώτος στον επόμενο γύρο
        $sql = "UPDATE game_status SET p_turn=?, status='started', move_1=NULL, move_2=NULL, move_3=NULL, move_4=NULL";
        $st = $mysqli->prepare($sql);
        $st->bind_param('s', $winner);
        $st->execute();
    } else {
        // Περίπτωση Χειροκίνητου Reset (Παραίτηση/Ισοπαλία): Τυχαία επιλογή σειράς
        $mysqli->query("UPDATE game_status SET p_turn=NULL, status='started', move_1=NULL, move_2=NULL, move_3=NULL, move_4=NULL");
        
        update_game_status(); // Κλήρωση
    }

    show_board();
}

function show_piece($x,$y) {
    global $mysqli;
    
    // Ανάκτηση πληροφοριών για συγκεκριμένο κελί/στοίβα
    $sql = 'select * from stack where row=? and col=?';
    $st = $mysqli->prepare($sql);
    $st->bind_param('ii',$x,$y);
    $st->execute();
    $res = $st->get_result();
    header('Content-type: application/json');
    print json_encode($res->fetch_all(MYSQLI_ASSOC), JSON_PRETTY_PRINT);
}

function do_move($x, $y, $x2, $y2) {
    global $mysqli;

    // Κλήση της Stored Procedure `move_piece` στη βάση.
    // Η Procedure διαχειρίζεται όλη τη λογική (έγκυρη κίνηση, ζάρια, μάζεμα).
    $sql = 'call `move_piece`(?,?,?,?);';
    $st = $mysqli->prepare($sql);
    $st->bind_param('iiii', $x, $y, $x2, $y2);
    $st->execute();

    // Επιστροφή της νέας κατάστασης του board στον client
    show_board();
}
?>