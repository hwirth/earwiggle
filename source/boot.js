// boot.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { prefersReducedMotion, prefersColorScheme } from './helpers.js';

import { PROGRAM_NAME, PROGRAM_VERSION } from './constants.js';
import { SETTINGS, DEBUG } from './constants.js';
import { Application } from './main.js';


const { CHECK_AUTOPLAY, NAMED_DOM_ELEMENTS } = SETTINGS;

//...addEventListener('load', async() => {
(async()=>{
	DEBUG.TIMES.BOOT = Date.now();

	if (DEBUG.ENABLED) {
		console.log(
			`%c<<< %c${PROGRAM_NAME.toUpperCase()} ${PROGRAM_VERSION}%c >>>`,
			'font-weight:bold', 'color:red;font-weight:bold', 'color:unset',
		);

		console.groupCollapsed('DEBUG, SETTINGS');
			console.group('DEBUG');
				console.log(JSON.stringify({DEBUG}, null, '\t'));
			console.groupEnd();
			console.group('SETTINGS');
				console.log(JSON.stringify({SETTINGS, DEBUG}, null, '\t'));
			console.groupEnd();
		console.groupEnd();

		console.group('User preferences');
		console.log(prefersColorScheme('dark') ? 'Dark Mode' : 'Light Mode');
		console.log(prefersReducedMotion() ? 'Reduced Motion' : 'Animations');
		console.groupEnd();
	}


	function boot_message(html) {
		if (DEBUG.BOOT) console.log('boot_message:', html);
		document.querySelector('div.noscript p').innerHTML = html;
		return; new Promise(done => setTimeout(done, 0));
	}

	let remove_boot_screen    = true;
	let last_shown_error_id   = 0;

	function error_handler(event) {
		// Don't add load to the browser when errors are produced at high rates
		if (++DEBUG.ERRORS.AMOUNT > 10) return;

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
			found.stack   = event.reason.stack;
		}
		else if (event.message) {
			found.message = event.message;
			found.file    = event.filename?.split('/').pop();
			found.line    = event.lineno;
			found.column  = event.colno;
		}

		found.file = (found.file + '?').split('?')[0];
		if (found.file == 'undefined') found.file = '';

		if (found.message) {
			const { message, file, line, column, stack } = found;
			const href = `show_source.php?file=${file}#${line}`;
			p.innerHTML
			= (message ? `<pre>${message}</pre>` : `<pre>Error</pre>`)
			+ (file ? `<pre>in <a href="${href}" target="EarwiggleSource">${file}</a>` : '')
			+ (line ? `:${line}:${column}` : '')
			+ (file ? `<iframe src="${href}"></iframe>` : '')
			+ (stack ? `<pre class="stack">${stack}</pre>` : '')
			+ `</pre><br><pre>¯\\_(ツ)_/¯</pre>`
			+ `<br><button onclick="document.querySelector('[accesskey=x]').click()">Dismiss</button>`
			;
			remove_boot_screen = false;
		}

		console.log('%cerror_handler%c: ' + event.message, 'color:red', 'color:unset');
		console.log(event);
		console.group('Stack and trace');
		console.log(event.stack);
		console.trace()
		console.groupEnd();
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
		if (DEBUG.BOOT) console.log('Removing .noscript');
		await boot_message('Starting...', /*delay*/false);
		const noscript_tags = document.querySelectorAll('.noscript');
		noscript_tags.forEach(tag => tag.remove());
	}

	if (DEBUG.ENABLED) window.APP = app;

	if (DEBUG.BOOT) console.log(
		'<< Boot time: '
		 + (Date.now() - performance.timing.navigationStart)
		 + ' ms >>',
	);

	DEBUG.TIMES.BOOT_EXIT = Date.now();
})();
//...});


//EOF
