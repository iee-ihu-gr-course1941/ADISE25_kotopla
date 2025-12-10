<?php 
require_once "lib/board.php";
require_once "lib/db_connect.php";


$method = $_SERVER['REQUEST_METHOD'];
// κρατάμε μόνο το κομμάτι του url που περιέχει τα στοιχεία μετα τον φακελο του project
$request = explode('/', trim($_SERVER['PATH_INFO'],'/'));
$input = json_decode(file_get_contents('php://input'),true);
print_r($request);

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
?>