<?php
$input = file_get_contents('php://input');
if (strlen($input) > 0) {
    $result = file_put_contents('data.json', $input);
    file_put_contents('date.txt', date(DATE_RFC2822));
    echo('OK');
}
else {
    $out = file_get_contents('guts.html');
    echo($out);
}
?>
