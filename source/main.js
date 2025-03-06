// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { PROGRAM_NAME, PROGRAM_VERSION } from './constants.js';
import { GETParams, getCSSvar, setCSSvar, newElement, untab, wakeLock } from './helpers.js';
import { AudioPlayer   } from './audio_player.js';
import { MusicLibrary  } from './music_library.js';
import { UserInterface } from './user_interface.js';

export function Application(parameters) {
	const self = this;

	const { SETTINGS, DEBUG, CLEAR_STORAGE, boot_message } = parameters;
	const { DOM_SELECTORS, SHOW_STAR_FIELD } = SETTINGS;

	this.elements;
	this.audioPlayer;
	this.ui;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG SCREEN
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_admin_submit(event) {
		event.preventDefault();
	}

	function on_savepassword_click() {
		event.preventDefault();
		document.cookie = 'wigglePlayerAdmin=' + self.elements.adminPassword.value;
	}

	function on_loadpassword_click() {
		const cookie = document.cookie.split(';').find(c => c.startsWith('wigglePlayerAdmin='));
		if (cookie) self.elements.adminPassword.value = cookie.split('=')[1];
	}

	function update_debug_stats(statsElement) {
		const first = Object.values(DEBUG.TIMES)[0];
		const times = (
			Object.entries(DEBUG.TIMES)
			//.sort((a, b) => b[1] - a[1])
			.map(([name, time]) => (
				`<tr><td>${name}</td><td>${(time - first)/1000}</td></tr>\n`
			)).join('')
		);
		const make_json = (obj) => JSON.stringify(obj, null, '\t');

		const stringy = j => JSON.stringify(j, null, '    ').replaceAll('"', '');
		const debug    = stringy(DEBUG);
		const settings = stringy(SETTINGS);

		const form   = statsElement.querySelector('form');

		statsElement.innerHTML = untab(`
			<header>
				<img class="logo" src="image/earwiggle_icon.png" width="32" height="32" alt="Earwiggle Icon">
				<h1>EMP ${PROGRAM_VERSION}</h1>
			</header>
			<pre>
				DEBUG.TIMES:
				<table>${times}</table>
				ERRORS.AMOUNT: ${DEBUG.ERRORS.AMOUNT ? '<b>'+DEBUG.ERRORS.AMOUNT+'</b>' : 0 }
				totalPlayTime: ${self.audioPlayer.totalPlayTime}
			</pre><pre>
				DEBUG: ${debug}
			</pre><pre>
				SETTINGS: ${settings}
			</pre>
		`);

		const header = statsElement.querySelector('header');
		header.append(form);
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
		const iframe_exists = iframe !== null;
		enable = (enable === null) ? !iframe_exists : enable;

		if (self.audioPlayer) {//... Prevent error if called while booting
			if(enable && !iframe_exists) {
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
			}
			else if (!enable && iframe_exists) {
				iframe.remove();
			}
		}

		document.body            .classList.toggle('starfield', enable);
		self.elements.toggleStars.classList.toggle('pressed'  , enable);
	}

	function on_keydown(event) {
		if (!event.shiftKey && !event.ctrlKey && event.altKey && event.key == 'g') {
			event.preventDefault();
			document.body.classList.toggle('debug');
			return;
		}
		else if (!event.shiftKey && !event.ctrlKey && event.altKey && event.key == 't') {
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
		`).trim().replace('\t', '').split('\n').map(line => line.trim());

		if (DEBUG.ENABLED) console.log('App.init:', { fetch_files });

		const response = await fetch('audio_player.html');
		const html     = await response.text();
		document.body.innerHTML += html;

DEBUG.TIMES.MAIN_UI = Date.now();

		/// USER INTERFACE ///
		this.ui = await new UserInterface({
			SETTINGS, DEBUG,
		});

		// Gather elements
		self.elements = self.ui.elements;

		// URL ?parameters
		const GETParams = new window.URLSearchParams(window.location.search);

		const autoplay_index     = (GETParams.get('playsong') || 0) - 1;
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
			elements      : self.elements,
			library       : self.library,
			albums        : self.library.albums,
			songs         : songs,
			index         : autoplay_index,
			autoStart     : (autoplay_index >= 0),
			clearConfig   : CLEAR_STORAGE || GETParams.get('reset') !== null,
			volume        : 0.25,
			onPause       : on_player_pause,
			onToggleStars : toggle_starfield,
		});

		// Autofocus text input
	/*
		const ft = self.elements.filterTerm;
		ft.focus();
		ft.setSelectionRange(ft.value.length, ft.value.length);
	*/

DEBUG.TIMES.MAIN_LOAD_ALBUMS = Date.now();

		await self.audioPlayer.loadAlbums(self.library.albums);


DEBUG.TIMES.MAIN_SIMPLE = Date.now();

		// Toggle advanced after load
		await new Promise(done => setTimeout(()=>{
			//...ugly Make controls smaller, when there is no room
			//...ugly Canvas size 0 if we start with .simple
			const scrolls = (document.documentElement.scrollHeight > window.innerHeight);
			if (scrolls || is_iphone) {
				//self.elements.musicPlayer.classList.add('simple');
				//self.audioPlayer.toggleAdvancedControls(false);
			}
			done();
		}));

		if (DEBUG.ENABLED) {
			addEventListener('keydown', on_keydown);
			addEventListener('click'  , on_click  );
			addEventListener('resize' , on_resize );
			on_resize();
		}

		self.elements.adminForm   .addEventListener('submit', on_admin_submit);
		self.elements.savePassword.addEventListener('click' , on_savepassword_click);
		self.elements.loadPassword.addEventListener('click' , on_loadpassword_click);

DEBUG.TIMES.MAIN_INIT_DONE = Date.now();
	};


	return self.init().then(()=>self);   // const app = new Application()
};


//EOF
