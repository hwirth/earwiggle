// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { GETParams, getCSSvar, setCSSvar, newElement, wakeLock } from './helpers.js';
import { untab, prefersReducedMotion } from './helpers.js';
import { AudioPlayer   } from './audio_player.js';
import { MusicLibrary  } from './music_library.js';
import { UserInterface } from './user_interface.js';

export function Application(parameters) {
	const self = this;

	const { SETTINGS, DEBUG, boot_message } = parameters;
	const { DOM_SELECTORS, SHOW_STAR_FIELD } = SETTINGS;

	this.elements;
	this.audioPlayer;
	this.ui;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG SCREEN
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function update_debug_stats(statsElement) {
		const now = Date.now();
		const times = (
			Object.entries(DEBUG.TIMES)
			.sort((a, b) => b[1] - a[1])
			.map(([name, time]) => (
				`<tr><td>${name}</td><td>${(now - time)/1000}</td></tr>\n`
			)).join('')
		);
		const make_json = (obj) => JSON.stringify(obj, null, '\t');
		statsElement.innerHTML = untab(`
			DEBUG.TIMES:
			<table>${times}</table>
			totalPlayTime: ${self.audioPlayer.totalPlayTime}
		`);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// MISC
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_player_pause(paused) {
		const iframe = document.querySelector('iframe.starfield');
		if (iframe !== null) {
			iframe.contentWindow.postMessage(paused ? 'pause' : 'continue');
		}
	}

	async function toggle_starfield(enable = null) {
		await new Promise(done => setTimeout(done));
		const iframe = document.querySelector('iframe.starfield');
		enable = (enable === null) ? (iframe === null) : enable;

		if( enable
		&& !(enable && iframe !== null)
		&& !(!enable && iframe === null)
		) {
			const param = (self.audioPlayer.audio?.paused) ? '?paused' : '';
			document.body.insertBefore(
				newElement({
					tagName    : 'iframe',
					className  : 'starfield',
					attributes : {
						src : 'starfield/' + param,
					},
				}),
				self.elements.audioPlayer,
			);
			//document.body.classList.add('starfield');
			//self.elements.config.classList.add('pressed');
		} else {
			iframe?.remove();
			//document.body.classList.remove('starfield');
			//self.elements.config.classList.remove('pressed');
		}

		document.body         .classList.toggle('starfield', enable);
		self.elements.config  .classList.toggle('pressed'  , enable);
		self.elements.lcdStars.classList.toggle('on'       , enable);
	}

	function on_keydown(event) {
		if (!event.shiftKey && !event.ctrlKey && !event.altKey && event.key == 'd') {
			event.preventDefault();
			document.body.classList.toggle('debug');
			return;
		}
		if (!event.shiftKey && !event.ctrlKey && event.altKey && event.key == 's') {
			event.preventDefault();
			toggle_starfield();
			if (DEBUG.ENABLED) console.log('main.js:on_keydown: Alt+s: toggle starfield');
			return;
		}
		else if (event.shiftKey && !event.ctrlKey && event.altKey && event.key == 'S') {
			event.preventDefault();

			const s = self.elements.debugStats;
			s.classList.toggle('hidden');
			if (!s.classList.contains('hidden')) {
				update_debug_stats(s);
			}
			if (DEBUG.ENABLED) console.log('main.js:on_keydown: Alt+S: toggle debug stats');
			return;
		}

		if (DEBUG.KEYBOARD) console.log(
			'main.js:on_keydown: SCA:', event.shiftKey, event.ctrlKey, event.altKey, event.key,
		);
	}

	function on_click(event) {
		if (event.target === document.body) {
			toggle_starfield();
		}
	}

	function on_resize() {
		const body  = document.body;
		const style = getComputedStyle(body);
		const fs = parseFloat(style.fontSize);
		const w  = Math.floor(body.offsetWidth  / fs * 100) / 100;
		const h  = Math.floor(body.offsetHeight / fs * 100) / 100;

		if (DEBUG.ENABLED) {
			document.title = `${body.offsetWidth} x ${body.offsetHeight} --> ${w}em x ${h}em`;
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function() {
		DEBUG.TIMES.MAIN_INIT = Date.now();

		//... Ugly iPhone hack for vertical sliders
		const is_iphone = navigator.userAgent.includes('iPhone');
		document.body.classList.toggle('iphone', is_iphone);

		await boot_message('Loading HTML and CSS...');

		DEBUG.TIMES.MAIN_FETCH = Date.now();

		const fetch_files = (`
			audio_player.html
			variables.css
			main.css
			grids.css
		`).trim().replace('\t', '').split('\n');
console.log({ fetch_files });
		const response = await fetch('audio_player.html');
		const html     = await response.text();
		document.body.innerHTML += html;

		if (DEBUG.ENABLED) {
			console.groupCollapsed('SETTINGS');
			console.log(JSON.stringify({SETTINGS, DEBUG}, null, '\t'));
			console.groupEnd();
			console.groupCollapsed('DEBUG');
			console.log(JSON.stringify({DEBUG}, null, '\t'));
			console.groupEnd();
		}

		DEBUG.TIMES.MAIN_UI = Date.now();

		/// USER INTERFACE ///
		this.ui = await new UserInterface({
			SETTINGS, DEBUG,
		});

		// Gather elements
		self.elements = self.ui.elements;
console.log('main.js elements:', self.elements);

		const GETParams = new window.URLSearchParams(window.location.search);

console.log(Object.keys(GETParams));

		const autoplay_index     = (GETParams.get('playsong') || 0) - 1;
		const load_saved_settings = GETParams.get('reset') === null;
		document.body.classList.toggle(
			'lyrics_right',
			GETParams.get('lyrics') == 'right',
		);


		DEBUG.TIMES.MAIN_LIBRARY = Date.now();

		/// LIBRARY ///
		self.library = await new MusicLibrary({
			SETTINGS, DEBUG, testSounds: DEBUG.ENABLED,
		});

		if (self.library.albums.length > 5) {
			setCSSvar('--nr-h-albums', getCSSvar('--nr-offscreen-albums'));
		};

		let songs = null;
		let param = null;
		if (param = GETParams.get('artist')) {
			songs = self.library.songsByArtist(param);
		}
		else if (param = GETParams.get('album')) {
			songs = self.library.songsByAlbum(param);
		}
		else if (param = GETParams.get('title')) {
			songs  = self.library.songsByTitle(param);
		}
		else if (param = GETParams.get('filter')) {
			songs  = self.library.songsByAny(param);
			self.elements.filterTerm.value = param;
		}
		else {
			songs = self.library.songs;
		}

		DEBUG.TIMES.MAIN_PLAYER = Date.now();

		/// PLAYER ///
		self.audioPlayer = await new AudioPlayer({
			SETTINGS, DEBUG,
			elements   : self.elements,
			library    : self.library,
			albums     : self.library.albums,
			songs      : songs,
			index      : autoplay_index,
			autoStart  : (autoplay_index >= 0),
			loadConfig : load_saved_settings,
			volume     : 0.25,
			onPause    : on_player_pause,
			onConfig   : toggle_starfield,
		});

		// Autofocus text input
	/*
		const ft = self.elements.filterTerm;
		ft.focus();
		ft.setSelectionRange(ft.value.length, ft.value.length);
	*/

		DEBUG.TIMES.MAIN_LOAD_ALBUMS = Date.now();

		await self.audioPlayer.loadAlbums(self.library.albums);

		DEBUG.TIMES.MAIN_STARFIELD = Date.now();

		if (SHOW_STAR_FIELD) {
			if (prefersReducedMotion()) {
				console.log('User prefers reduced motion, starfield disabled');
			} else {
				/*
				const is_fast_machine = () => {
					const start = performance.now();
					let sum = 0;
					for (let i = 0; i < 1e6; i++) sum += Math.sqrt(i);
					const end = performance.now();
					return (end - start < 5);
				};
				if (is_fast_machine()) toggle_starfield();
				*/
				await toggle_starfield();
			}
		}


		DEBUG.TIMES.MAIN_SIMPLE = Date.now();

		// Toggle advanced after load
		await new Promise(done => {
			setTimeout(()=>{
				setTimeout(()=>{
					//...ugly Make controls smaller, when there is no room
					//...ugly Canvas size 0 if we start with .simple
					const scrolls = (document.documentElement.scrollHeight > window.innerHeight);
					if (scrolls || is_iphone) {
						//self.elements.musicPlayer.classList.add('simple');
						//self.audioPlayer.toggleAdvancedControls(false);
					}
				});
				done();
			});
		});

		if (DEBUG.ENABLED) {
			addEventListener('keydown', on_keydown);
			addEventListener('click'  , on_click  );
			addEventListener('resize' , on_resize );
			on_resize();
		}

		DEBUG.TIMES.MAIN_INIT_DONE = Date.now();
	};


	return self.init().then(()=>self);   // const app = new Application()
};


//EOF
