<?php 
require_once "lib/board.php";
require_once "lib/db_connect.php";
require_once "lib/game.php";
require_once "lib/users.php";

// Λήψη της HTTP μεθόδου και των δεδομένων αιτήματος
$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
$input = json_decode(file_get_contents('php://input'),true);

// Κεντρικό routing του API
switch ($r=array_shift($request)) { 
    
    // 1. Διαχείριση Board & Κινήσεων
    case 'board' : 
        switch ($b=array_shift($request)) {
            case '':
            case null: handle_board($method,$input); // Προβολή/Reset/Restart
                        break;
            case 'piece': handle_piece($method, $request[0],$request[1],$input); // Κίνηση πιονιού
                        break;
            }
            break;
    
    // 2. Διαχείριση Κατάστασης Παιχνιδιού
    case 'status': 
            if(sizeof($request)==0) {handle_status($method);}
            else {header("HTTP/1.1 404 Not Found");}
            break;
    
    // 3. Διαχείριση Παικτών (Login, Λίστα)
    case 'players': handle_player($method, $request,$input);
                break;
    
    // 4. Ειδικές Ενέργειες Παιχνιδιού (π.χ. Ζάρια)
    case 'game': 
          handle_game($method, $request, $input);
          break;
    
    // 5. Αλλαγή Σειράς (Χειροκίνητη)
    case 'change_turn':
            if ($method == 'POST') {
                change_turn();
            } else {
                header("HTTP/1.1 405 Method Not Allowed");
            }
            break;          
    
    default:  header("HTTP/1.1 404 Not Found");
 exit;
}

// Router για Board (GET: Show, POST: Reset, PUT: Restart)
function handle_board($method,$input){
    if($method=='GET') {
            show_board($input);
    } else if ($method=='POST') {
            reset_board();
            show_board($input);
    } else if($method=='PUT') {
            restart_game();
    } else {
        header('HTTP/1.1 405 Method Not Allowed');
    }
}

// Router για Κινήσεις Πιονιών
function handle_piece($method, $x, $y, $input) {
    if($method=='GET') {
        show_piece($x,$y);
    } else if ($method=='PUT') {
        move_piece($x,$y,$input['x'], $input['y'], $input['token']);
    }    
}

// Router για Παίκτες (Login, Info)
function handle_player($method, $p, $input) {
  switch ($b=array_shift($p)) {
        case '':
        case null: if($method=='GET') {show_users($method);}
                   else {header("HTTP/1.1 400 Bad Request"); 
                     print json_encode(['errormesg'=>"Method $method not allowed here."]);}
                    break;
        case 'B': 
        case 'W': 
            handle_user($method, $b,$input);
            break;
        default: header("HTTP/1.1 404 Not Found");
          print json_encode(['errormesg'=>"Player $b not found."]);
          break;
        }
}

// Router για Status
function handle_status($method) {
  if($method=='GET') {
    show_status();
  } else {
    header('HTTP/1.1 405 Method Not Allowed');
        print "<h1>Method Not Allowed (405)</h1>";
    }
}

// Router για ενέργειες παιχνιδιού (π.χ. Roll Dice)
function handle_game($method, $p, $input) {
    switch ($b=array_shift($p)) {
        case 'roll': 
            if($method=='POST') {
                // Έλεγχος αν δόθηκε χρώμα παίκτη
                if(isset($input['color'])) {
                    roll_dice($input['color']); 
                } else {
                     header("HTTP/1.1 400 Bad Request");
                     print json_encode(['errormesg' => "Missing player color"]);
                }
            } else {
                header("HTTP/1.1 405 Method Not Allowed");
            }
            break;
        default: 
            header("HTTP/1.1 404 Not Found");
            break;
    }
}

?>