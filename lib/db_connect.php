<?php
require_once "db_credentials.php";

// Στοιχεια για την συνδεση με την βαση δεδομενων το username και password ειναι διαφορετικα τοπικα με το users

$servername = "localhost";
$dbname = "tavli";
$dbusername=$DB_USER;
$dbpassword=$DB_PASS;


if(gethostname()=='users.iee.ihu.gr') {
	$mysqli = new mysqli($servername, $dbusername, $dbpassword, $dbname,null,'/home/student/iee/2019/iee2019007/mysql/run/mysql.sock');
} else {
		//$pass=null;
    $mysqli = new mysqli($servername, $dbusername, $dbpassword, $dbname);
    
}

if ($mysqli->connect_errno) {
    echo "Failed to connect to DataBase: (" . 
    $mysqli->connect_errno . ") " . $mysqli->connect_error;
}

?>