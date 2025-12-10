<?php
// συνδεση με βαση δεδομενων
$servername = "localhost";
$dbusername = "root";
$dbpassword = "";
$dbname = "user_info_db";

$conn = new mysqli($servername, $dbusername, $dbpassword, $dbname);

// ελεγχος συνδεσης με την βαση μας
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Σφάλμα σύνδεσης με τη βάση δεδομένων."]);
    exit;
}
?>