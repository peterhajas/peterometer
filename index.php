<?php
$input = file_get_contents('php://input');
if (strlen($input) > 0) {
    $result = file_put_contents('data.json', $input);
    file_put_contents('date.txt', date(DATE_RFC2822));
    echo('OK');
}
else {
    echo('<head>');
    echo('<script src="d3.v7.min.js"></script>');
    echo('<script type="module" src="script.js"></script>');
    echo('<link rel="stylesheet" href="style.css" />');
    echo('</head>');
    echo('<body>');
    echo('<div id="topContainer" class="flexVerticalContainer"></div>');
    echo('<div id="dataContainer" class="flexHorizontalContainer">');
    echo('<div id="intakeContainer" class="flexVerticalContainer"></div>');
    echo('<div id="bodyContainer" class="flexVerticalContainer"></div>');
    echo('<div id="glanceContainer"></div>');
    echo('</div>');
    echo('</body>');
}
?>
