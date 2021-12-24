<?php
$input = file_get_contents('php://input');
if (strlen($input) > 0) {
    $result = file_put_contents('test.json', $input);
    echo('OK');
}
else {
    echo('<head>');
    echo('<script src="d3.v7.min.js"></script>');
    echo('<script type="module" src="script.js"></script>');
    echo('<link rel="stylesheet" href="style.css" />');
    echo('</head>');
    echo('<body>');
    echo('<div id="intakeContainer" class="flexVerticalContainer"></div>');
    echo('<div id="bodyContainer" class="flexVerticalContainer"></div>');
    echo('<div id="glanceContainer"></div>');
    echo('<div id="data">');
    $output = file_get_contents('test.json');
    echo($output);
    echo('</div>');
    echo('</body>');
}
?>
