// audio_playlist.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG } from './main.js';

import { clamp, newElement, triggerDownload, format_time, extensionJpg, isMobileDevice } from './helpers.js';

import { Waveform         } from './waveform.js';
import { SpectrumAnalyser } from './spectrum_analyser.js';
import { GraphicEqualizer } from './graphic_equalizer.js';

const STORAGE_KEY      = 'earwigglePlayer';
const MAX_VOLUME       = 1.25;
const USE_UPDATE_TIMER = true;   // true: Use setTimeout to update the timestamp faster than with audio.ontimeupdate


export function AudioPlayer(parameters) {
	const self = this;

	this.elements;
	this.observer;

	this.library;
	this.currentSongID;

	this.songs;
	this.index;
	this.loopSong;
	this.loopList;

	this.audio;

	this.fadeStart;
	this.fadeLength;
	this.fadingOut;

	this.audioCtx;
	this.sourceGain;
	this.outputGain;
	this.fadeOutGain;

	this.analyser;
	this.analyserFade;

	this.waveform;

	this.totalPlayTime;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function debug_audio(title) {
		console.groupCollapsed(`AudioPlayer${title}`  , self.audio.src);
		console.log('audio.autoplay:'        , self.audio.autoplay);
		console.log('audio.duration:'        , self.audio.duration);
		console.log('audio.isConnected:'     , self.audio.isConnected);
		console.log('audio.loop:'            , self.audio.loop);
		console.log('audio.isConnected:'     , self.audio.isConnected);
		console.log('audio.mozAudioCaptured:', self.audio.mozAudioCaptured);
		console.log('audio.mozFragmentEnd:'  , self.audio.mozFragmentEnd);
		console.log('source.channelCount:'   , self.audioSource.channelCount);
		console.log(self.audio);
		console.groupEnd();
	}

	function on_event_debug(event) {
		console.groupCollapsed(`<audio> %c${event.type}`, 'color:green');
		console.log(event);
		console.groupEnd();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DOM
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function observe_scrollability(element) {
		function check_overflow() {
			const scroll_x = element.scrollHeight > element.clientHeight;
			const scroll_y = element.scrollWidth  > element.clientWidth;
			element.classList.toggle('scrolling', scroll_x || scroll_y);
		}
		new ResizeObserver(check_overflow).observe(element);
		check_overflow();
	}

	function on_horizontal_wheel_scroll(element, direction = +1) {
		function on_wheel(event) {
			// Shift+Wheel is horizontal scrolling, so the following check for shiftKey will not work.
			if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

			event.preventDefault();
			element.scrollLeft += event.deltaY * direction;
		}
		element.addEventListener('wheel', on_wheel);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PLAYLIST
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


	this.loadAlbums = function(albums) {
		function on_album_click(event) {
			const item = event.target.closest('li');
			item.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			self.elements.filterTerm.value = item.dataset.filter;
			on_filter_click(event);
		}

		self.elements.albumList.innerHTML = '';
		self.elements.albumList.append(
			...albums.map((album, index) => newElement({
				tagName    : 'li',
				attributes : {
					title    : 'Filter: ' + album.album,
					tabindex : '0',
				},
				dataset: {
					index    : index,
					albumId  : self.library.albums.indexOf(album),
					filter   : album.album,
				},
				events: {
					click    : on_album_click,
				},
				children: [
					newElement({
						tagName    : 'div',
						innerText  : album.artist,
					}),
					newElement({
						tagName    : 'img',
						attributes : {
							alt  : 'Cover Image',
							load : 'lazy',
						},
						dataset: {
							src: ('thumbnails/' + (
								(album.trigger)
								? album.image
								: album.image.replace(/\.[^/.]+$/, '.jpg')
							)),
						},
					}),
					newElement({
						tagName   : 'div',
						innerText : album.album,
					}),
				],
			})),
		);
	}

	this.loadSongs = function(songs, index) {
		self.songs = songs;
		self.index = clamp(parameters.index || 0, 0, self.songs.length-1);

		const playingItem = self.elements.playlist.querySelector('li.playing');

		function on_download_click(event) {
			event.preventDefault();
			event.stopPropagation();
		}

		self.elements.playlist.innerHTML = '';
		self.elements.playlist.append(
			...songs.map((song, index) => newElement({
				tagName    : 'li',
				attributes : {
					tabindex: '0',
				},
				dataset    : {
					index   : index,
					songId  : self.library.songs.indexOf(song),
					trigger : song.trigger,
				},
				children: [
					newElement({
						tagName    : 'img',
						attributes : {
							alt  : 'Cover Image',
							load : 'lazy',
						},
						dataset    : {
							src : ('thumbnails/' + (
								(song.trigger)
								? song.image
								: song.image.replace(/\.[^/.]+$/, '.jpg')
							)),
						},
					}),
					newElement({
						tagName    : 'p',
						innerHTML  : song.artist,
						attributes : { title: song.artist },
					}),
					newElement({
						tagName    : 'p',
						innerHTML  : song.album,
						attributes : { title: song.album },
					}),
					newElement({
						tagName    : 'p',
						innerHTML  : song.title,
						attributes : { title: song.title },
					}),
					newElement({
						tagName    : 'a',
						innerHTML  : '&dArr;',
						attributes : {
							href     : song.url,
							download : `${song.artist} - ${song.album} - ${song.title}`,
							title    : 'Download',
						},
					}),
				],
			})),
		);
if (!true) {//...
		const trigger_entries = self.elements.playlist.querySelectorAll('li[data-trigger]');
console.log({trigger_entries})
		const first_entry = self.elements.playlist.querySelector('li');
		trigger_entries.forEach(e => e.remove());
		self.elements.playlist.append(...trigger_entries);
}
		// Lazy loading
		if (self.observer) self.observer.disconnect();
		const thumbnails = [
			...self.elements.albumList.querySelectorAll('img'),
			...self.elements.playlist .querySelectorAll('img'),
		];
		const options = {
			root       : null,
			rootMargin : '0px',
			threshold  : 0.1,
		};
		self.observer = new IntersectionObserver(thumbnails => {
			thumbnails.forEach(entry => {
				const img = entry.target;
				if (entry.isIntersecting) {
					img.src = img.dataset.src;
					self.observer.unobserve(img);
				}
			});
		}, options);
		thumbnails.forEach(img => self.observer.observe(img));

		// Select current song
		if (playingItem) {
			const song = self.elements.playlist.querySelector(
				'li[data-song-id="' + playingItem.dataset.songId + '"]',
			);
			if (song) song.classList.add('playing');
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// METHODS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.play = function(event) {
		const song = self.songs[self.index];

		self.currentSongID = self.library.songs.indexOf(song);

		self.audio.src  = song.url;
		self.audio.loop = Boolean(song.loop);
		self.audio.play().catch(error => {
			console.error(`Can't play ${song.title || song.album || song.artist}: ${error}`);
			self.waveform.showError();
		});

		// Prevent "BiquadFilterNode channel count changes may produce audio glitches" warning:
		//...self.createAudioGraph();   // We could avoid this, if he had access to channel count of <audio>

		if (DEBUG) debug_audio('.play');

		self.fadeOutGain.gain.cancelScheduledValues(0);
		self.fadeOutGain.gain.value = 1;
		self.fadingOut     = false;
		self.fadeStart  = song.fadeStart;
		self.fadeLength = song.fadeLength;

		self.elements.play .classList.toggle('pressed', true);
		self.elements.stop .classList.toggle('pressed', false);
		self.elements.pause.classList.toggle('pressed', self.audio.paused);

		self.elements.playlist.querySelectorAll('li').forEach((element, index) => {
			if (index == self.index) {
				element.scrollIntoView({ block: 'nearest' });
				element.classList.add('playing');
			} else {
				element.classList.remove('playing');
			}

			self.elements.playingArtist.title = self.elements.playingArtist.innerHTML = song.artist || '';
			self.elements.playingAlbum .title = self.elements.playingAlbum .innerHTML = song.album  || '';
			self.elements.playingSong  .title = self.elements.playingSong  .innerHTML = song.title  || '';
			self.elements.comments.innerHTML = song.comments || '';
			self.elements.lyrics  .innerText = song.lyrics   || '';

			self.elements.albumCover.src = 'covers/' + extensionJpg(song.image);
			self.elements.albumCover.closest('a').href = 'fullsize_covers/' + song.image;
		});

		self.audioContext.resume();
		self.analyser.resume();

		self.waveform.reset();
		self.waveform.showProgress(0);

		if (parameters.onPause) parameters.onPause(self.audio.paused);

		self.startPlayTime = Date.now();
		self.totalPlayTime = 0;

		self.startPlayTime = Date.now();
		if (DEBUG) console.log(
			'AudioPlayer.play: Context', self.audioContext.state,
			'at', self.audioContext.sampleRate, 'Hz,',
			self.audioContext.destination.maxChannelCount, 'output channels,',
			'output latency:', Math.round(self.audioContext.outputLatency * 1000), 'ms',
		);
	}

	this.stop = function() {
		self.audio.pause();
		self.audio.currentTime = 0;

		self.elements.play .classList.toggle('pressed', false);
		self.elements.stop .classList.toggle('pressed', true);
		self.elements.pause.classList.toggle('pressed', false);

		self.audioContext.suspend();
		self.analyser.suspend();

		//... Timeout to halt analyser

		if (parameters.onPause) parameters.onPause(self.audio.paused);
	}

	this.pause = function() {
		if (self.audio.paused) {
			self.audioContext.resume();
			self.analyser.resume();
			self.audio.play();
		} else {
			self.audioContext.suspend();
			self.analyser.suspend();
			self.audio.pause();
		};

		self.elements.pause.classList.toggle('pressed', self.audio.paused);
		if (parameters.onPause) parameters.onPause(self.audio.paused);

		if (self.startPlayTime !== null) {
			self.totalPlayTime += self.startPlayTime - self.bootTime;
			self.totalPlayTime = null;
		}
	}

	this.next = function() {
		self.index = (self.index + 1) % self.songs.length;
		self.play();
	}

	this.seek = function(seconds) {
		if (!self.audio.src) return;
		self.audio.currentTime = Math.min(self.audio.duration, seconds);
	}

	this.back = function() {
		self.index = (self.index - 1 + self.songs.length) % self.songs.length;
		self.play();
	}

	this.toggleLoopSong = function(enabled = null) {
		if (enabled === null) {
			self.loopSong = !self.loopSong;
		} else {
			self.loopSong = enabled;
		}

		if (self.loopSong) {
			self.loopList = false;
		}

		self.elements.loopSong.classList.toggle('pressed', self.loopSong);
		self.elements.loopList.classList.toggle('pressed', self.loopList);
	}

	this.toggleLoopList = function(enabled = null) {
		if (enabled === null) {
			self.loopList = !self.loopList;
		} else {
			self.loopList = enabled;
		}

		if (self.loopList) {
			self.loopSong = false;
		}

		self.elements.loopSong.classList.toggle('pressed', self.loopSong);
		self.elements.loopList.classList.toggle('pressed', self.loopList);
	}

	this.volume = function(fraction) {
		fraction = parseFloat(fraction, 10);
		const volume = clamp(fraction, 0, 1);
		self.outputGain.gain.value = volume * MAX_VOLUME;
		self.elements.volume.value = volume;
		self.elements.volume.title = 'Volume: ' + Math.round(volume * MAX_VOLUME * 100) + '%';
	}

	this.gotoSong = function(index) {
		self.index = index;
		self.play();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// AUDIO EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_timeupdate(event) {
		if (self.userSeeking) return;

		if (self.audio.duration) {
			self.elements.progress.max   = Math.ceil(self.audio.duration * 10) / 10;
			self.elements.progress.value = Math.round(self.audio.currentTime * 10) / 10;
			self.waveform.showProgress(self.audio.currentTime / self.audio.duration);
		} else {
			self.elements.progress.max   = 1;
			self.elements.progress.value = 0;
			self.waveform.showProgress(0);
		}

		if (
			!self.fadingOut && self.fadeStart &&
			self.audio.currentTime >= self.audio.duration - self.fadeStart
		) {
			const t = self.audioContext.currentTime;
			self.fadeOutGain.gain.setValueAtTime(1, t);
			self.fadeOutGain.gain.linearRampToValueAtTime(0, t + self.fadeLength);
			self.fadingOut = true;
		}

		if (!USE_UPDATE_TIMER) on_timestamp_update();
	}

	function on_timestamp_update() {
		const time = self.audio.currentTime;
		const next_update_ms = 101 - Math.floor(time * 1000) % 100;
		if (USE_UPDATE_TIMER) setTimeout(on_timestamp_update, next_update_ms);

		if (!document.hidden) {
			self.elements.timestamp.innerText = format_time(time);
		}
	}

	function on_ended() {
		if (self.loopSong) {
			self.play();
		}
		else if (self.loopList) {
			self.index = (self.index + 1) % self.songs.length;
			self.play();
		}
		else if (self.index < self.songs.length - 1) {
			self.index++;
			self.play();
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// UI EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_play_click(event) {
		if (event.button != 0) return;

		//self.play();
		//... Option
		on_pause_click(event);
		self.elements.play.classList.toggle('pressed', !self.audio.paused);
		self.elements.stop.classList.toggle('pressed', false);
	}

	function on_stop_click(event) {
		if (event.button != 0) return;
		self.stop();
	}

	function on_pause_click(event) {
		if (event.button != 0) return;
		self.pause();
	}

	function on_back_click(event) {
		if (event.button != 0) return;
		self.back();
	}

	function on_next_click(event) {
		if (event.button != 0) return;
		self.next();
	}

	function on_loop_list_click(event) {
		if (event.button != 0) return;
		self.toggleLoopList();
	}

	function on_loop_song_click(event) {
		if (event.button != 0) return;
		self.toggleLoopSong();
	}

	function on_config_click() {
		if (parameters.onConfig) parameters.onConfig();
	}

	function on_settings_click() {
		self.toggleAdvancedControls();
	}


	function on_seek_drag_start(event) {
		if (event.button != 0) return;
		self.userSeeking = true;
	}

	function on_seek_drag_done(event) {
		self.userSeeking = false;
		self.seek(event.target.value * 1);
	}

	function on_waveform_mousedown(event) {
		if (event.button != 0) return;
		if (event.ctrlKey) {
			self.waveform.hollowIndicator = !self.waveform.hollowIndicator;
			return;
		}

		const ratio = event.layerX / self.elements.waveform.width;
		self.seek(ratio * self.audio.duration);
	}

	function on_volume_change(event) {
		self.volume(event.target.value * 1);
	}

	function on_volume_wheel(event) {
		const step   = 1 / (MAX_VOLUME * 10 * 2);   //...parseInt(range.step);
		const sign   = -Math.sign(event.deltaY);
		const volume = parseFloat(event.target.value, 10);
		self.volume(volume + step*sign);
		event.preventDefault();
	}

	function on_playlist_click(event) {
		if (
			(event.button != 0)
			|| (event.target.getAttribute('download'))
			|| (event.target.closest('li') === null)
		) return;

		const listItem = event.target.closest('li');
		if (listItem.dataset.index === undefined) return;

		if (listItem.dataset.trigger == 'upload') {
			self.elements.import.click();
		} else {
			self.gotoSong(listItem.dataset.index * 1);
		}

		if (event?.shiftKey) {
			const url = new URL(window.location);
			url.searchParams.set('playsong', self.index + 1);
			window.history.replaceState(null, null, url.toString());
		}
	}

	function on_filter_click(event) {
		event.preventDefault();

		const filter = self.elements.filterTerm.value;

		if (!filter) return on_clear_click(event);

		self.songs = self.library.songsByAny(filter);
		self.loadAlbums(self.library.albums);
		self.loadSongs(self.songs);
	}

	function on_clear_click() {
		self.elements.filterTerm.value = '';

		self.loadAlbums(self.library.albums);
		self.loadSongs(self.library.songs);

		if (self.audio?.paused) {
			self.elements.albumCover.src = 'covers/earwiggle_music_player.jpg';
			self.elements.albumCover.closest('a').href = 'fullsize_covers/earwiggle_music_player.png';
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// IMPORT LOCAL FILES
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	async function on_import_click(event) {
		const input = newElement({
			tagName    : 'input',
			attributes : {
				type     : 'file',
				accept   : 'audio/*,video/*',
				multiple : true,
			},
		});

		const accepted_types = ['audio/mp3', 'audio/mpeg'];

		const entries = await new Promise((resolve, reject) => {
			async function on_change(event) {
				if (input.files.length == 0) {
					reject('No files selected');
					return;
				}

				try {
					const new_entries = [...input.files].reduce((acc, file) => {
						if (
							file.type.startsWith('audio/')
							|| file.type.startsWith('video/')
							|| file.name.endsWith('.flv')
						) {
							const blob = new Blob([file], {type: file.type || 'video/flv'});
							const new_entry = {
								artist   : 'Earwiggle Music Player',
								album    : 'Local Files',
								title    : file.name,
								image    : 'LOCAL_FILE.png',
								url      : URL.createObjectURL(blob),
								comments : file.type,
								trigger  : 'play',
							};
							return [...acc, new_entry];
						} else {
							console.error(`Skipping file ${file.name} type ${file.type}`);
							return acc;
						}
					}, []);
					resolve(new_entries);
				}
				catch (error) {
					reject(`Error while uploading: ${error}`);
				}
			}

			input.addEventListener('change', on_change);
			input.click();
		}).catch(wiggleREJECT);

		entries.forEach(e => self.library.addSong(e));

		// Select filter input
		const ft = self.elements.filterTerm;
		ft.value = 'Local Files';
		ft.setSelectionRange(ft.value.length, ft.value.length);

		on_filter_click(event);

		const foc = self.elements.playlist.firstChild|| self.elements.filterTerm;
		//...foc.focus();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// AUDIO GRAPH
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.createAudioGraph = function() {
		if (DEBUG) console.log('AudioPlayer creating audio graph');

		const use_eq = true || !isMobileDevice();//... Doesn't belong here, we need advanced control setting
		self.elements.equalizer.classList.toggle('hidden', !use_eq);   //... hidden not enough: grid gap

		if (self.analyser) {
			self.analyser.exit();
			self.analyser = null;
		}
		if (use_eq && self.equalizer) {
			self.equalizer.exit();
			self.equalizer = null;
		}

		if (use_eq) self.equalizer = new GraphicEqualizer(
			self.audioContext,
			self.sourceGain,
			self.elements.eqBands,
			self.elements.eqFreqs,
			parameters.loadConfig,
		);
		self.analyser = new SpectrumAnalyser(
			self.audioContext,
			(use_eq ? self.equalizer.output : self.sourceGain),
			self.elements.analyser,
			self.analyserFade,
			parameters.loadConfig,
		);

		self.analyser.output.connect(self.outputGain);
	}


	this.toggleAnalyser = function(event) {
		if (event.button != 0) return;

		self.equalizer?.saveSettings();
		self.analyserFade = !self.analyserFade;
		self.createAudioGraph();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PUBLIC METHODS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleAdvancedControls = function(enable = null) {
		if (enable === null) {
			enable = self.elements.musicPlayer.classList.contains('simple');
		}

		self.elements.musicPlayer.classList.toggle('simple', !enable);
		self.elements.settings   .classList.toggle('pressed', enable);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// LOCAL STORAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.saveSettings = function() {
		if (DEBUG) console.log('Saving settings to localStorage: %c' + STORAGE_KEY, 'color:#c40');
		const data = {
			volume    : parseFloat(self.elements.volume.value),
			loopSong  : self.elements.loopSong.classList.contains('pressed'),
			loopList  : self.elements.loopList.classList.contains('pressed'),
			starfield : self.elements.config.classList.contains('pressed'),
		}
		const json = JSON.stringify(data);
		localStorage.setItem(STORAGE_KEY, json);
	}

	this.loadSettings = function() {
		if (DEBUG) console.log('Loading settings from localStorage: %c' + STORAGE_KEY, 'color:#47f');
		const json = localStorage.getItem(STORAGE_KEY);
		if (json) {
			const data = JSON.parse(json);
			if (DEBUG) console.log('AudioPlayer: Settings:', data);
			self.volume(data.volume);
			if (data.loopSong) self.toggleLoopSong(data.loopSong);
			if (data.loopList) self.toggleLoopList(data.loopList);
			self.elements.config.classList.toggle(data.starfield);
			if (parameters.onConfig) parameters.onConfig(data.starfield);
		}
	}

	this.clearSettings = function() {
		if (DEBUG) console.log('Settings cleared: %c' + STORAGE_KEY, 'color:red');
		localStorage.removeItem(STORAGE_KEY);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function() {
		self.elements = parameters.elements;
		self.library  = parameters.library;

		self.loopList = false;
		self.loopSong = false;
		self.playing  = false;

		self.bootTime      = Date.now();
		self.startPlayTime = null;
		self.totalPlayTime = 0;

		// Audio context
		self.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		if (self.audioContext.state == 'suspended') {
			console.error('Audio context is suspended, trying to resume');
			self.audioContext.resume();
		}

		if (DEBUG) console.log(
			'AudioPlayer.init: Context', self.audioContext.state,
			'at', self.audioContext.sampleRate, 'Hz,',
			self.audioContext.destination.maxChannelCount, 'output channels',
		);

		// Audio element
		// Waveform will listen to the canplaythrough event
		self.audio = new Audio();
		if (parameters.autoStart) {
			self.audio.setAttribute('autoplay', 'true');
		} else {
			self.audio.setAttribute('preload', 'auto');
		}
		self.audio.addEventListener('timeupdate', on_timeupdate);
		self.audio.addEventListener('ended'     , on_ended);

		if (DEBUG) {
			const events = [
				'abort',
				'canplay',
				'canplaythrough',
				'durationchange',
				'emptied',
				'error',
				'loadeddata',
				'loadedmetadata',
				'pause',
				'progress',
				'ratechange',
				'seeked',
				'seeking',
				'stalled',
				'suspend',
				//'timeupdate',
				'volumechange',
				'waiting',
			];
			events.forEach(e => self.audio.addEventListener(e, on_event_debug));
		}

		// Prevent the Analyser from "stealing" our audible music
		self.audioSource  = self.audioContext.createMediaElementSource(self.audio);
		self.sourceGain   = self.audioContext.createGain();
		self.audioSource.connect(self.sourceGain);

		self.outputGain  = self.audioContext.createGain();
		self.fadeOutGain = self.audioContext.createGain();
		self.outputGain .connect(self.fadeOutGain);
		self.fadeOutGain.connect(self.audioContext.destination);

		// Analyser and Equalizer
		self.analyserFade = true;
		self.createAudioGraph();

		self.volume(self.elements.volume.value);

		// Waveform
		self.waveform = await new Waveform(self.audioContext, self.audio, self.elements.waveform).catch(wiggleREJECT);

		// UI Events
		self.elements.play       .addEventListener('click'    , on_play_click);
		self.elements.pause      .addEventListener('click'    , on_pause_click);
		self.elements.stop       .addEventListener('click'    , on_stop_click);
		self.elements.back       .addEventListener('click'    , on_back_click);
		self.elements.next       .addEventListener('click'    , on_next_click);
		self.elements.loopSong   .addEventListener('click'    , on_loop_song_click);
		self.elements.loopList   .addEventListener('click'    , on_loop_list_click);
		self.elements.config     .addEventListener('click'    , on_config_click);
		self.elements.settings   .addEventListener('click'    , on_settings_click);

		self.elements.playlist   .addEventListener('click'    , on_playlist_click);
		self.elements.import     .addEventListener('click'    , on_import_click);
		self.elements.filterForm .addEventListener('submit'   , on_filter_click);
		self.elements.filterApply.addEventListener('click'    , on_filter_click);
		self.elements.filterClear.addEventListener('click'    , on_clear_click);
		self.elements.analyser   .addEventListener('click'    , self.toggleAnalyser);
		self.elements.volume     .addEventListener('wheel'    , on_volume_wheel);
		self.elements.volume     .addEventListener('input'    , on_volume_change);
		self.elements.progress   .addEventListener('mousedown', on_seek_drag_start);
		self.elements.progress   .addEventListener('mouseup'  , on_seek_drag_done);
		self.elements.waveform   .addEventListener('mousedown', on_waveform_mousedown);

		on_horizontal_wheel_scroll(self.elements.albumList);

		// Add padding, when content overflows and a scrollbar appears
		observe_scrollability(self.elements.albumList);
		observe_scrollability(self.elements.playlist);
		observe_scrollability(self.elements.lyrics);

		// Timestamp
		if (USE_UPDATE_TIMER) on_timestamp_update();   // Start (faster than ontimeupdate) timeout loop

		const is_simple = self.elements.musicPlayer.classList.contains('simple');
		self.elements.settings.classList.toggle('pressed', !is_simple)

		// Settings
		if (parameters.loadConfig !== false) {
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		} else {
			self.clearSettings();
		}

		on_filter_click({ 'preventDefault': ()=>{} });//...ugly Load initial song list (all)

		// Autoplay
		//if (parameters.autoStart) //...self.play();
		//...###if (parameters.autoStart) setTimeout(() => self.play());

		// Debug
		if (DEBUG) window.PLAYER = self;
	}


	return self.init().then(() => self);   // const audioPlayer = await new AudioPlayer();
}


//EOF
