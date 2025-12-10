<?php
require_once "db_credentials.php";
// συνδεση με βαση δεδομενων
$servername = "localhost";
$dbname = "tavli";
$dbusername=$DB_USER;
$dbpassword=$DB_PASS;

//$mysqli = new mysqli($servername, $dbusername, $dbpassword, $dbname);

// ελεγχος συνδεσης με την βαση μας
/*
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Σφάλμα σύνδεσης με τη βάση δεδομένων."]);
    exit;
}
*/

if(gethostname()=='users.iee.ihu.gr') {
	$mysqli = new mysqli($servername, $dbusername, $dbpassword, $dbname,null,'/home/student/iee/2019/iee2019160/mysql/run/mysql.sock');
} else {
		//$pass=null;
    $mysqli = new mysqli($servername, $dbusername, $dbpassword, $dbname);
}

if ($mysqli->connect_errno) {
    echo "Failed to connect to DataBase: (" . 
    $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

?>