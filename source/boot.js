// boot.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { SETTINGS, DEBUG } from './constants.js';
import { Application } from './main.js';

const { CHECK_AUTOPLAY, NAMED_DOM_ELEMENTS } = SETTINGS;

//...addEventListener('load', async() => {
(async()=>{
	DEBUG.TIMES.BOOT = Date.now();

	function boot_message(html) {
		console.log('boot_message:', html);
		document.querySelector('div.noscript p').innerHTML = html;
		return; new Promise(done => setTimeout(done, 0));
	}

	let remove_boot_screen    = true;
	let remaining_errors_logs = 10;
	let last_shown_error_id   = 0;

	function error_handler(event) {
		// Don't add load to the browser when errors are produced at high rates
		if (--remaining_errors_logs < 1) return;

		const p = document.querySelector('.noscript p');
		if (!p) return;   //... Could show splash screen again, once .noscript --> .spash_screen is implemented


		const found = {};

		if (event.error) {
			found.message = String(event.error);
			found.file    = event.filename?.split('/').pop();
			found.line    = event.lineno;
			found.column  = event.colno;
		}
		else if (event.reason) {
			found.message = String(event.reason);
			found.file    = event.reason.fileName?.split('/').pop();
			found.line    = event.reason.lineNumber;
			found.column  = event.reason.columnNumber;
		}

		if (found.message) {
			const { message, file, line, column } = found;
			const href = `show_source.php?file=${file}#${line}`;
			p.innerHTML
			= (message ? `<pre>${message}</pre>` : `<pre>Error</pre>`)
			+ (file ? `<pre>in <a href="${href}" target="EarwiggleSource">${file}</a>` : '')
			+ (line ? `:${line}:${column}` : '')
			+ (file ? `<iframe src="${href}"></iframe>` : '')
			+ `</pre><br><pre>¯\\_(ツ)_/¯</pre>`
			;
			remove_boot_screen = false;
		} else {
			console.groupCollapsed('error_handler: Unhandled rejection');
			console.log(event);
			console.log(event.stack);
			console.groupEnd();
		}
	}

	addEventListener('error', error_handler);
	addEventListener('unhandledrejection', error_handler);

	// Audio Context

	//...
	await boot_message('Check auto play...');

	DEBUG.TIMES.BOOT_PLAY = Date.now();

	const canAutoplay = await (new Promise(done => {
		const silence = (`
			data:audio/mpeg;base64,/+NIxAAAAAAAAAAAAFhpbmcAAAAPAAAAAgAAAbAAgICAgICAgICAgICAgICAgICA
			gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgP/////////////////////////////////////////////
			/////////////////////AAAAUExBTUUzLjEwMAQoAAAAAAAAAAAVCCQCQCEAAeAAAAGwBNziGgAAAAAAAAAAAA
			AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
			AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEw
			MFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFV
			VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
		`).replace(/ş+/g, '');

		const audio = new Audio(silence);
		audio.setAttribute('autoplay', 'true');

		const success = () => done(true);
		const failure = () => done(false);
		audio.play().then(success).catch(failure);
	}));

	if (CHECK_AUTOPLAY && !canAutoplay) {
		boot_message('<i>touch / click / key<br>to start</i>', /*delay*/false);
		document.body.classList.add('audio_wait');
		await new Promise(done => {
			function onUserGuesture() {
				//...if (!navigator.userActivation.hasBeenActive) return;
				window.removeEventListener('click'     , onUserGuesture);
				window.removeEventListener('keypress'  , onUserGuesture);
				window.removeEventListener('touchstart', onUserGuesture);
				done();
			}
			window.addEventListener('click'     , onUserGuesture);
			window.addEventListener('keypress'  , onUserGuesture);
			window.addEventListener('touchstart', onUserGuesture);
		});
	}

	DEBUG.TIMES.BOOT_APP = Date.now();


	document.body.classList.remove('audio_wait');
	await boot_message('Starting...<br>&nbsp;', /*delay*/!false);

	//
	const app = await new Application({ SETTINGS, DEBUG, boot_message });
	//

	DEBUG.TIMES.BOOT_DEL_NOSCRIPT = Date.now();

	if (remove_boot_screen) {
		if (DEBUG.ENABLED) console.log('Removing .noscript');
		await boot_message('Starting...', /*delay*/false);
		const noscript_tags = document.querySelectorAll('.noscript');
		noscript_tags.forEach(tag => tag.remove());
	}

	if (DEBUG.ENABLED) window.APP = app;

	if (DEBUG.ENABLED) console.log(
		'<< Boot time: '
		 + (Date.now() - performance.timing.navigationStart)
		 + ' ms >>',
	);

	DEBUG.TIMES.BOOT_EXIT = Date.now();
})();
//...});


//EOF
