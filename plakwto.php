<?php 
require_once "lib/board.php";
require_once "lib/db_connect.php";
require_once "lib/game.php";
require_once "lib/users.php";


$method = $_SERVER['REQUEST_METHOD'];
// κρατάμε μόνο το κομμάτι του url που περιέχει τα στοιχεία μετα τον φακελο του project
$request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
//$request = explode('/', trim($_SERVER['SCRIPT_NAME'],'/'));
$input = json_decode(file_get_contents('php://input'),true);

switch ($r=array_shift($request)) { 
    case 'board' : 
        switch ($b=array_shift($request)) {
            case '':
            case null: handle_board($method,$input);
                        break;
           case 'piece': handle_piece($method, $request[0],$request[1],$input);
                        break;
            }
            break;
    case 'status': 
			if(sizeof($request)==0) {handle_status($method);}
			else {header("HTTP/1.1 404 Not Found");}
			break;
	case 'players': handle_player($method, $request,$input);
			    break;
   case 'game': 
          handle_game($method, $request, $input);
          break;       
	default:  header("HTTP/1.1 404 Not Found");
 exit;
}

function handle_board($method,$input){
    if($method=='GET') {
            show_board($input);
    } else if ($method=='POST') {
            reset_board();
            show_board($input);
    } else {
        header('HTTP/1.1 405 Method Not Allowed');
    }
    }

    function handle_piece($method, $x, $y, $input) {
    if($method=='GET') {
        show_piece($x,$y);
    } else if ($method=='PUT') {
        move_piece($x,$y,$input['x'], $input['y'], $input['token']);
    }    
}

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

    function handle_status($method) {
  if($method=='GET') {
    show_status();
  } else {
    header('HTTP/1.1 405 Method Not Allowed');
		print "<h1>Method Not Allowed (405)</h1>";
	}
}

function handle_game($method, $p, $input) {
    switch ($b=array_shift($p)) {
        case 'roll': 
            if($method=='POST') {
                // Πλέον περιμένουμε το 'color' από την JS
                // Αν δεν υπάρχει color στο input, υποθέτουμε λάθος
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