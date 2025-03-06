<?php // store_waveform.php

	$algo = 'sha256';
	if (isset($_REQUEST['hash'])) {
		die(hash($algo, $_GET['hash']));
	}

	$hash = 'bbc67dc6f49338d6ebf570c438fa326f3b641edd249818a5d48f408e9d31057e';
	$login = isset($_REQUEST['password']) ? $_REQUEST['password'] : '';
	if (hash($algo, $login) != $hash) {
		http_response_code(401);
		die('Not authorized');
	}


	$filename = isset($_REQUEST['filename']) ? urldecode($_REQUEST['filename']) : '';
	$clean   = preg_replace('/[^a-zA-Z0-9_\ \'\-\.\,\:\#\(\)]/', '', $filename);

	#error_log('FILE:' . $filename);
	#error_log('CLEAN:' . $clean);

	if ($clean !== $filename) {
		http_response_code(400);
		die('Illegal characters in ?file= - only use a-z, A-Z, 0-9 or _-.:');
	}

	if ($_FILES['image']['error'] === UPLOAD_ERR_OK) {
		#error_log('TMP: ' . $_FILES['image']['tmp_name']);
		#error_log('TO : ' . dirname(__FILE__)."/$clean");

		move_uploaded_file($_FILES['image']['tmp_name'], dirname(__FILE__)."/$clean");

		http_response_code(201);   // Created
		die('Created');
	}

	http_response_code(500);  // Internal Server Error
