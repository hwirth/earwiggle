// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { untab, newElement, getCSSVariable, setCSSVariable } from './helpers.js';
import { AudioPlayer  } from './audio_player.js';
import { MusicLibrary } from './music_library.js';
const SHOW_STAR_FIELD = true;

const GETParams    = new window.URLSearchParams(window.location.search);
export const DEBUG = (location.hostname == 'harald.ist.neu') ^ (GETParams.get('debug') !== null);

console.log(
	'DEBUG =', (DEBUG ? 'true' : 'false') + ',',
	location.hostname + '?debug =',
	GETParams.get('debug'),
);

export function Application(parameters) {
	const self = this;

	this.elements;
	this.audioPlayer;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG SCREEN
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function update_debug_stats(statsElement) {
		const make_json = (obj) => JSON.stringify(obj, null, '\t');
		statsElement.innerText = (`
totalPlayTime: ${self.audioPlayer.totalPlayTime}
document.activeElement: ${
	(document.activeElement.outerHTML).split('>', 1)[0] + '>'
	//.replace(document.activeElement.innerHTML, '')
}

albums: ${make_json(self.audioPlayer.library.albums.map(a => ({...a, lyrics: 'REMOVED'}))) }
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
		if (enable && iframe !== null) return;
		if (!enable && iframe === null) return;
		if (enable) {
			const param = (self.audioPlayer.audio?.paused) ? '?paused' : '';
			document.body.insertBefore(
				newElement({
					tagName    : 'iframe',
					className  : 'starfield',
					attributes : {
						src : '/stubs/starfield/' + param,
					},
				}),
				self.elements.audioPlayer,
			);
			document.body.classList.add('starfield');
			self.elements.config.classList.add('pressed');
		} else {
			iframe.remove();
			document.body.classList.remove('starfield');
			self.elements.config.classList.remove('pressed');
		}
	}

	function on_keydown(event) {
console.log('main.js:on_keydown: SCA:', event.shiftKey, event.ctrlKey, event.altKey, event.key);
		if (!event.shiftKey && !event.ctrlKey && event.altKey && event.key == 's') {
			event.preventDefault();
			toggle_starfield();
		}
		else if (event.shiftKey && !event.ctrlKey && event.altKey && event.key == 'S') {
			event.preventDefault();

			const s = self.elements.debugStats;
			s.classList.toggle('hidden');
			if (!s.classList.contains('hidden')) {
				update_debug_stats(s);
			}
		}
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
		document.title = `${body.offsetWidth} x ${body.offsetHeight} --> ${w}em x ${h}em`;
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function() {
		// Gather elements
		self.elements = {};
		Object.entries(parameters.selectors).forEach(([key, selector]) => {
			if (selector.slice(0, 4) == 'ALL ') {
				self.elements[key] = document.querySelectorAll(selector.slice(4));
			} else {
				self.elements[key] = document.querySelector(selector);
			}
		});

		const GETParams = new window.URLSearchParams(window.location.search);
		const autoplay_index     = (GETParams.get('playsong') || 0) - 1;
		const load_saved_settings = GETParams.get('reset') === null;
		document.body.classList.toggle(
			'lyrics_right',
			GETParams.get('lyrics') == 'right',
		);

		// LIBRARY
		self.library = await new MusicLibrary({ testSounds: DEBUG }).catch(wiggleREJECT);
		if (self.library.albums.length > 5) {
			setCSSVariable('--nr-h-albums', getCSSVariable('--nr-offscreen-albums'));
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

		// PLAYER
		self.audioPlayer = await new AudioPlayer({
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
		const ft = self.elements.filterTerm;
		ft.focus();
		ft.setSelectionRange(ft.value.length, ft.value.length);

		if (SHOW_STAR_FIELD) {
			const reduced_motion = (
				window.matchMedia('(prefers-reduced-motion: reduce)') === true
				|| window.matchMedia('(prefers-reduced-motion: reduce)').matches
			);
			if (reduced_motion) {
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
				await toggle_starfield().catch(wiggleREJECT);
			}
		}

		if ('wakeLock' in navigator) try {
			navigator.wakeLock.request();
			if (DEBUG) console.log('Wakelock success');
		} catch (e) {
			console.error('Wakelock failed');
		}

		//...ugly iPhone hack for vertical sliders
		const is_iphone = navigator.userAgent.includes('iPhone');
		document.body.classList.toggle('iphone', is_iphone);

		await new Promise(done => {
			setTimeout(()=>{
				self.elements.musicPlayer.classList.remove('initializing');

				setTimeout(()=>{
					//...ugly Make controls smaller, when there is no room
					//...ugly Canvas size 0 if we start with .simple
					const scrolls = (document.documentElement.scrollHeight > window.innerHeight);
					if (scrolls || is_iphone) {
						//self.elements.musicPlayer.classList.add('simple');
						self.audioPlayer.toggleAdvancedControls(false);
					}
				});
				done();
			});
		});

		if (DEBUG) {
			addEventListener('keydown', on_keydown);
			addEventListener('click'  , on_click  );
			addEventListener('resize' , on_resize );
			on_resize();
		}
	};


	return self.init().then(()=>self);   // const app = new Application()
};


//EOF
