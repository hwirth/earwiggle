<?php // store_waveform.php

	$algo = 'sha256';
	if ($_REQUEST['hash']) {
		die(hash($algo, $_GET['hash']));
	}

	$hash = '1d968c4d5bdc23719fe643997497b07c8e25c28530342a85b51f933f5d952ce9';
	$login = isset($_REQUEST['pwd']) ? $_REQUEST['pwd'] : '';
	if (hash($algo, $login) != $hash) {
		http_response_code(401);
		die('Not authorized');
	}


	$file    = isset($_REQUEST['file']) ? $_REQUEST['file'] : '';
	$clean   = preg_replace('/[^a-zA-Z0-9_\-\.\:\#]/', '', $file);
	if ($clean !== $file) {
		http_response_code(400);
		die('Illegal characters in ?file= - only use a-z, A-Z, 0-9 or _-.:');
	}

	if ($_FILES['image']['error'] === UPLOAD_ERROR_OK) {
		move_uploaded_file($_FILES['image']['tmp_name'], $clean);
	}
