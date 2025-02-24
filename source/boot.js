// boot.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

console.log('<<%c BOOTING %c>>', 'color:red', 'color:unset');

import { Application, DEBUG } from './main.js';

addEventListener('load', async() => {
	let remove_boot_screen = true;

	window.wiggleREJECT = (reason) => {
		console.error('wiggleREJECT: ' + reason);
		const p = document.querySelector('.noscript p');
		if (p) {
			const r = String(reason);
			p.innerHTML = (
				(r.includes('Error:') ? '<strong>' : '')
				+ r.replace('Error:', 'Error</strong>')
			);
			remove_boot_screen = false;
		}
		Promise.reject(reason);
	}

	document.querySelector('div.noscript p').innerText = 'Initializing...';

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
	})).catch(wiggleREJECT);

	if (false && !canAutoplay) {
		boot_message.innerText = 'Click or press a key to start';
		await new Promise(done => {
			function onUserGuesture() {
				if (!navigator.userActivation.hasBeenActive) return;
				removeEventListener('click'   , onUserGuesture);
				removeEventListener('keypress', onUserGuesture);
				done();
			}
			addEventListener('click'   , onUserGuesture);
			addEventListener('keypress', onUserGuesture);
		}).catch(wiggleREJECT);
	}

	document.querySelector('div.noscript p').innerText = 'Initializing...';

	const app = await new Application({
		selectors: {
			musicPlayer   : '.audio_player',
			filterForm    : 'form.filter',
			filterTerm    : '[name=filter_text]',
			filterApply   : '[name=filter_apply]',
			filterClear   : '[name=filter_clear]',
			play          : '[name=play]',
			stop          : '[name=stop]',
			pause         : '[name=pause]',
			next          : '[name=next]',
			back          : '[name=back]',
			loopList      : '[name=loop_list]',
			loopSong      : '[name=loop_song]',
			import        : '[name=import]',
			volume        : '[name=volume]',
			settings      : '[name=settings]',
			config        : '[name=config]',
			progress      : '[name=progress]',
			timestamp     : '.timestamp',
			albumList     : '.album_list',
			playlist      : '.playlist',
			playingArtist : '.now_playing .artist',
			playingAlbum  : '.now_playing .album',
			playingSong   : '.now_playing .song',
			albumCover    : '.album_cover img',
			comments      : '.comments',
			waveform      : '.waveform',
			equalizer     : '.equalizer',
			eqBands       : 'ALL .equalizer input',
			eqFreqs       : 'ALL .equalizer span',
			analyser      : '.analyser',
			lyrics        : '.lyrics',
			debugStats    : '.debug_stats',
		},
	}).catch(wiggleREJECT);

	if (remove_boot_screen) {
		const noscript_tags = document.querySelectorAll('.noscript');
		noscript_tags.forEach(tag => tag.remove());
	}

	if (DEBUG) window.APP = app;
});


//EOF
