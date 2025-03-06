// audio_playlist.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import {
	clamp, getCSSvar, newElement, format_time, changeFileExtension,
	triggerDownload, isMobileDevice, wakeLock, prefersReducedMotion,
} from './helpers.js';

import { Waveform         } from './waveform.js';
import { SpectrumAnalyser } from './spectrum_analyser.js';
import { GraphicEqualizer } from './graphic_equalizer.js';

export const AudioPlayer = function(parameters) {
	const self = this;

	const { SETTINGS, DEBUG } = parameters;
	const { VOLUME_ZOOM_FACTOR, VOLUME_ZOOM_MIN, VOLUME_ZOOM_MAX, BASE_VOLUME } = SETTINGS.MAIN;
	const {
		STORAGE_KEY, MAX_VOLUME, POST_AMP_VOLUME,
		PRECISION_TIMER, SCROLL_INTO_VIEW, BUTTON_BLINK_MS,
		EXPONENTIAL_VOLUME, FIX_GRAPH_GLITCH, WHEEL_SEEK_SECONDS,
	} = SETTINGS.AUDIO_PLAYER;

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
	this.analyserMode;

	this.waveForm;

	this.totalPlayTime;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DEBUG
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function debug_audio(title) {
		if (!DEBUG.AUDIO_ELEMENT) return;
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
		if (!DEBUG.AUDIO_ELEMENT) return;
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

	function on_horizontal_wheel_scroll(event) {
		const direction = +1;

		// Shift+Wheel is horizontal scrolling, so the following check for shiftKey will not work.
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;

		event.preventDefault();
		self.elements.albumlist.scrollLeft += event.deltaY * direction;
	}

	function blink_control_button(element) {
		element.classList.add('pressed');
		setTimeout(()=>element.classList.remove('pressed'), BUTTON_BLINK_MS);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PLAYLIST
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	self.observer = { registered:[] };

	function load_lazy(list) {
		const key = Object.entries(self.elements).find(([key, e]) => list === e ? key : false);

		if (self.observer[key]) self.observer[key].disconnect();

		const new_images = (img) => !self.observer.registered.includes(img.src);
		const thumbnails = [...list.querySelectorAll('img')].filter(new_images);

		const options = {
			root       : null,
			rootMargin : '0px',
			threshold  : 0.1,
		};
		self.observer[key] = new IntersectionObserver(thumbnails => {
			thumbnails.forEach(entry => {
				const img = entry.target;
				if (entry.isIntersecting) {
					img.src = img.dataset.src;
					delete img.dataset.src;
					(self.observer[key]).unobserve(img);
				}
			});
		}, options);

		thumbnails.forEach(img => {
			self.observer.registered.push(img.src);
			img.dataset.src = img.src;
			delete img.src;

			(self.observer[key]).observe(img);
		});


		if (DEBUG.LAZY_LOADING) {
			const r = self.observer.registered;
			const t = thumbnails;
			console.groupCollapsed('load_lazy: thumbnails:', t.length, 'registered', r.length);
				t.forEach(t => console.log('thumbnails:', t));
				r.forEach(r => console.log('registered:', r));
			console.groupEnd();
		}
	}

	this.loadAlbums = function(albums) {
		function on_album_click(event) {
			const item = event.target.closest('li');
			item.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			self.elements.filterTerm.value = item.dataset.filter;
			on_filter_click(event);
		}

		self.elements.albumlist.innerHTML = '';
		self.elements.albumlist.append(
			...albums.map((album, index) => newElement({
				tagName    : 'li',
				attributes : {
					title    : 'Filter: ' + album.album,
					tabindex : '0',
				},
				dataset: {
					index    : index,
					albumId  : self.library.albums.indexOf(album),
					filter   : album.filter || album.album,
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
							src: ('thumbnails/' + (
								(album.trigger)
								? album.image
								: changeFileExtension(album.image, '.jpg')
							)),
						},
						dataset: {
						},
					}),
					newElement({
						tagName   : 'div',
						innerText : album.album,
					}),
				],
			})),
		);

		load_lazy(self.elements.albumlist);
	}

	this.loadSongs = function(songs, index) {
		self.songs = songs;
		self.index = clamp(parameters.index || 0, 0, self.songs.length-1);

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
							src : ('thumbnails/' + (
								(song.trigger)
								? song.image
								: changeFileExtension(song.image, '.jpg')
							)),
						},
						dataset    : {
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

		load_lazy(self.elements.playlist);

		// Select current song
		const playingItem = self.elements.playlist.querySelector('li.playing');
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

	this.play = async function(event) {
		if (DEBUG.AUDIO_PLAYER) console.log('PLAY');

		const song = self.songs[self.index];

		self.currentSongID = self.library.songs.indexOf(song);

		self.audio.src  = song.url;
		self.audio.loop = Boolean(song.loop);
		self.audio.play().catch(error => {
			console.error(`Can't play ${song.title || song.album || song.artist}: ${error}`);
			self.waveForm.showError();
		});

		// Prevent "BiquadFilterNode channel count changes may produce audio glitches" warning:
		//...self.createAudioGraph();   // We could avoid this, if he had access to channel count of <audio>
		await self.createAudioGraph();

		if (DEBUG.ENABLED) debug_audio('.play');

		self.fadeOutGain.gain.cancelScheduledValues(0);
		self.fadeOutGain.gain.value = 1;
		self.fadingOut     = false;
		self.fadeStart  = song.fadeStart;
		self.fadeLength = song.fadeLength;

		const lock_result = await wakeLock(true);
		if (DEBUG.WAKE_LOCK) console.log('.play() lock_result', lock_result);

		const E = self.elements;
		E.play       .classList.toggle('pressed', true);
		E.stop       .classList.toggle('pressed', false);
		E.pause      .classList.toggle('pressed', self.audio.paused);
		E.lcdPause   .classList.remove('blink');
		E.lcdWakeLock.classList.toggle('on'     , !!lock_result);

		E.playlist.querySelectorAll('li').forEach((element, index) => {
			if (index == self.index) {
				if (SCROLL_INTO_VIEW) element.scrollIntoView({ block: 'nearest' });
				element.classList.add('playing');
			} else {
				element.classList.remove('playing');
			}

			E.playingArtist.title = E.playingArtist.innerHTML = song.artist || '';
			E.playingAlbum .title = E.playingAlbum .innerHTML = song.album  || '';
			E.playingSong  .title = E.playingSong  .innerHTML = song.title  || '';
			E.comments.innerHTML = song.comments || '';
			E.lyrics  .innerText = song.lyrics   || '';

			E.lyrics.classList.toggle('empty', !song.lyrics);

			E.albumCover.src = 'covers/' + changeFileExtension(song.image, '.jpg');
			E.albumCover.closest('a').href = 'fullsize/' + song.image;
		});

		self.audioContext.resume();
		self.analyser.resume();

		self.waveForm.animatedEmptyWave = !prefersReducedMotion();
		self.waveForm.reset();
		self.waveForm.showProgress(0);

		if (parameters.onPause) parameters.onPause(self.audio.paused);

		self.startPlayTime = Date.now();
		self.totalPlayTime = 0;

		self.startPlayTime = Date.now();
		if (DEBUG.AUDIO_CONTEXT) console.log(
			'AudioPlayer.play: Context', self.audioContext.state,
			'at', self.audioContext.sampleRate, 'Hz,',
			self.audioContext.destination.maxChannelCount, 'output channels,',
			'output latency:', Math.round(self.audioContext.outputLatency * 1000), 'ms',
		);
	}

	this.stop = async function() {
		if (DEBUG.AUDIO_PLAYER) console.log('STOP');

		self.audio.pause();
		self.audio.currentTime = 0;

		const lock_result = await wakeLock(false);
		if (DEBUG.WAKE_LOCK) console.log('.stop() lock_result', lock_result);

		self.elements.play       .classList.toggle('pressed', false);
		self.elements.stop       .classList.toggle('pressed', true);
		self.elements.pause      .classList.toggle('pressed', false);
		self.elements.lcdPause   .classList.remove('blink');
		self.elements.lcdWakeLock.classList.toggle('on'     , !!lock_result);

		self.audioContext.suspend();
		self.analyser.suspend();

		//... Timeout to halt analyser
		self.waveForm.animatedEmptyWave = false;
		self.waveForm.reset();
		self.waveForm.showProgress(0);

		if (parameters.onPause) parameters.onPause(self.audio.paused);

	}

	this.pause = async function() {
		if (DEBUG.AUDIO_PLAYER) console.log('PAUSE');

		var wake_lock;
		if (self.audio.paused) {
			self.audioContext.resume();
			self.analyser.resume();
			self.audio.play();
			wake_lock = true;
		} else {
			self.audioContext.suspend();
			self.analyser.suspend();
			self.audio.pause();
			wake_lock = false
		};

		const lock_result = await wakeLock(wake_lock);
		if (DEBUG.WAKE_LOCK) console.log('.pause() lock_result', lock_result);

		self.elements.pause      .classList.toggle('pressed', self.audio.paused);
		self.elements.lcdPause   .classList.toggle('blink'  , self.audio.paused);
		self.elements.lcdWakeLock.classList.toggle('on'     , !!lock_result);

		if (parameters.onPause) parameters.onPause(self.audio.paused);

		if (self.startPlayTime !== null) {
			self.totalPlayTime += self.startPlayTime - self.bootTime;
			self.totalPlayTime = null;
		}
	}

	this.next = function() {
		self.index = (self.index + 1) % self.songs.length;

		const song = self.songs[self.index];
		if ((song.trigger && song.trigger != 'play') || song.debug) return self.next();

		self.play();
	}

	this.seek = function(seconds) {
		if (!self.audio.src) return;

		//... ATTN: This seems to trigger oncanplaythrough on our <audio>:
		self.audio.currentTime = Math.min(self.audio.duration, seconds);

		setTimeout(()=>{
			self.waveForm.showProgress(self.audio.currentTime / self.audio.duration)
		}, 100);
	}

	this.back = function() {
		self.index = (self.index - 1 + self.songs.length) % self.songs.length;

		const song = self.songs[self.index];
		if (song.trigger != 'play' || song.debug) return self.back();

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

		self.elements.loopList.classList.toggle('pressed', self.loopList);
		self.elements.lcdList .classList.toggle('on'     , self.loopList);
		self.elements.loopSong.classList.toggle('pressed', self.loopSong);
		self.elements.lcdSong .classList.toggle('on'     , self.loopSong);
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

		self.elements.loopList.classList.toggle('pressed', self.loopList);
		self.elements.lcdList .classList.toggle('on'     , self.loopList);
		self.elements.loopSong.classList.toggle('pressed', self.loopSong);
		self.elements.lcdSong .classList.toggle('on'     , self.loopSong);
	}

	this.volume = function(fraction, set_value = true) {
		// Base volume see on_softer_click/on_louder_click

		fraction = parseFloat(fraction, 10);

		let volume = clamp(fraction, 0, MAX_VOLUME) / MAX_VOLUME;

		const gain = (EXPONENTIAL_VOLUME)
			? 1 - Math.sqrt(1 - volume)
			: volume;
		self.outputGain.gain.value = gain * MAX_VOLUME * POST_AMP_VOLUME;

		if (set_value) {
			const v = self.elements.volume;
			v.value = volume * MAX_VOLUME;
			v.title = 'Volume: ' + Math.round(volume * MAX_VOLUME * 100) + '%';

			if (DEBUG.SLIDER_UPDATES) {
				v.classList.add('debug');
				setTimeout(()=>v.classList.remove('debug'),33);//...
			}
		}
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

		const p = self.elements.progress;

		if (self.audio.currentTime / self.audio.duration) {
			p.max   = Math.ceil(self.audio.duration * 1000) / 1000;
			p.value = Math.round(self.audio.currentTime * 1000) / 1000;

			self.waveForm.showProgress(self.audio.currentTime / self.audio.duration);

			if (DEBUG.SLIDER_UPDATES) {
				p.classList.add('debug');
				setTimeout(()=>p.classList.remove('debug'),33);//...
			}
		} else {
			p.max   = 1;
			p.value = 0;
			self.waveForm.showProgress(0);
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

		//...const formatted = format_time(self.audio.currentTime);
		//...self.elements.progress.title = formatted;

		if (!PRECISION_TIMER) on_timestamp_update();
	}

	function on_timestamp_update() {
		const time = self.audio.currentTime;
		const next_update_ms = 101 - Math.floor(time * 1000) % 100;

		if (PRECISION_TIMER) setTimeout(on_timestamp_update, next_update_ms);
		if (document.hidden) return;

		if (!self.audio.paused) {
			self.elements.timestamp.innerText = self.elements.timestamp.dataset.time = format_time(time);
			self.elements.remaining.innerText = self.elements.remaining.dataset.time = format_time(
				self.audio.duration - time
			);
		}
	}

	function on_ended() {
		function is_last_song() {
			if (self.index+1 >= self.songs.length) return true;
			for (let i = self.index+1; i < self.songs.length; i++) {
				const s = self.songs[i];
				if (!s.debug && !s.trigger || self.songs[i].trigger == 'play') return false;
			}
			return true;
		}

		if (self.loopSong) {
			self.play();
		}
		else if (self.loopList) {
			//self.index = (self.index + 1) % self.songs.length;
			self.next();
		}
		else if (!is_last_song()) {   // Neither loop list nor loop song
			self.next();
		}
		else {
			self.stop();
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// UI EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_play_click(event) {
		if (event.button != 0) return;

		const playing = (self.audio.currentTime > 0);

		if (self.audio.paused && !playing) {
			self.play();
		} else {
			self.pause();
		}

		self.elements.play.classList.toggle('pressed', !self.audio.paused);
		self.elements.stop.classList.toggle('pressed', false);//... Should be in .play() I guess
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

	function on_togglestars_click() {
		if (parameters.onToggleStars) parameters.onToggleStars();
	}


// VOLUME ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function ramp_volume(v0, v1, duration) {
		const t = self.audioContext.currentTime;
		self.mainGain.gain.setValueAtTime(v0, t);
		self.mainGain.gain.linearRampToValueAtTime(v1, t + duration);
	}

	function on_softer_click() {
		const round_min = (1 - 1/VOLUME_ZOOM_FACTOR) / 2;
		const before = self.baseVolume;
		self.baseVolume = Math.max(VOLUME_ZOOM_MIN, self.baseVolume / VOLUME_ZOOM_FACTOR);
		if (Math.abs(self.baseVolume - 1) < round_min) self.baseVolume = 1.0;

		ramp_volume(before, self.baseVolume, 0.033);
		blink_control_button(self.elements.softer);
	}

	function on_louder_click() {
		const round_min = (1 - 1/VOLUME_ZOOM_FACTOR) / 2;
		const before = self.baseVolume;
		self.baseVolume = Math.min(VOLUME_ZOOM_MAX, self.baseVolume * VOLUME_ZOOM_FACTOR);
		if (Math.abs(self.baseVolume - 1) < round_min) self.baseVolume = 1.0;

		ramp_volume(before, self.baseVolume, 0.033);
		blink_control_button(self.elements.louder);
	}

	this.beforeMuteVolume = null;
	function on_mute_click() {
		const t = self.audioContext.currentTime;
		const v = self.mainGain.gain.value;
		if (v > 0) {
			self.beforeMuteVolume = v;
			ramp_volume(self.baseVolume, 0, 0.05);
		} else {
			ramp_volume(0, self.beforeMuteVolume, 0.25);
			self.beforeMuteVolume = null;
		}
		self.elements.mute.classList.toggle('pressed', self.beforeMuteVolume);
	}

	function on_volume_change(event) {
		self.volume(event.target.value * 1, /*set_value*/true);
	}

	function on_volume_wheel(event) {
		const step   = 1 / (MAX_VOLUME * 10 * 2);   // 10 steps, both directions from center
		const sign   = -Math.sign(event.deltaY);

		let v = event.target.value;

		if (EXPONENTIAL_VOLUME) {
			//        v = 1 - Math.sqrt(1-w);
			//      v-1 = sq(1-w)
			// (v-1)**2 = 1-w
			//        w = 1-(v-1)**2
			//v = Math.sqrt(v + 1);
		}

		self.volume(parseFloat(v, 10) + step*sign);
		event.preventDefault();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_advanced_click() {
		self.toggleAdvancedControls();
	}


// SEEK BAR //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_progress_mousedown(event) {
		if (event.button != 0) return;
		self.userSeeking = true;
	}

	function on_progress_mouseup(event) {
		if (!self.userSeeking) return;
		self.userSeeking = false;
		self.seek(event.target.value * 1);
	}

	function on_progress_wheel(event) {
		if (!self.audio.duration) return;

		event.preventDefault();
		const delta = WHEEL_SEEK_SECONDS * Math.sign(event.deltaY);
		self.seek(self.elements.progress.value*1 - delta);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_waveform_mousedown(event) {
		if (event.button != 0) return;
		if (event.ctrlKey) {
			self.waveForm.hollowIndicator = !self.waveForm.hollowIndicator;
			return;
		}

		const style   = getComputedStyle(self.elements.waveForm);
		const padding = parseInt(style.padding, 10);
		const width   = parseInt(style.width, 10);

		const ratio    = (event.layerX - padding) / (width - 2*padding - 2/*//...Manual correction*/);
		self.seek(clamp(ratio, 0, 1) * self.audio.duration);
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
			if (self.audio.playing) {

			} else {
				self.gotoSong(listItem.dataset.index * 1);
			}
		}

		if (event?.shiftKey) {
			const url = new URL(window.location);
			url.searchParams.set('playsong', self.index + 1);
			window.history.replaceState(null, null, url.toString());
		}
	}

	function on_clear_click() {
		self.elements.filterTerm.value = '';

		self.loadSongs(self.library.songs);

		if (self.audio?.paused) {
			self.elements.albumCover.src = 'covers/earwiggle_music_player.jpg';
			self.elements.albumCover.closest('a').href = 'fullsize/earwiggle_music_player.png';
		}

		self.elements.filterApply.classList.remove('pressed');
		self.elements.filterClear.classList.add('pressed');
	}

	function on_filter_click(event) {
		event.preventDefault();

		const filter = self.elements.filterTerm.value;

		if (!filter) {
			//... We should not call event handlers, instead make a this.applyFilter() or something
			//... Meanwhile, checking for real click on filter button:
			if (event.target === self.elements.filterApply) {
				self.elements.filterTerm.focus();
			}
			on_clear_click(event);
			return;
		}

		self.songs = self.library.songsByAny(filter);
		self.loadSongs(self.songs);

		self.elements.filterClear.classList.remove('pressed');
		self.elements.filterApply.classList.add('pressed');
	}

	function on_item_enterclick(event) {
		if (event.target.tagName == 'LI') {
			event.target.click();
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
		});

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

	this.createAudioGraph = async function() {
		if (DEBUG.AUDIO_CONTEXT) console.log('AudioPlayer creating audio graph');

		const use_eq = true || !isMobileDevice();//... Doesn't belong here, we need advanced control setting
		self.elements.equalizer.classList.toggle('hidden', !use_eq);   //... hidden not enough: grid gap

		//... Fix createAudioGraph hack: Hacked revival of canvases waveform, analyser introduced audio
		//... glitches. We should manage our streams better. Meanwhile we just hide the glitch sounds:
		const g = self.outputGain.gain;
		const prev_value = g.value;

		const ms = FIX_GRAPH_GLITCH / 1000;

		if (FIX_GRAPH_GLITCH) {
			const t0 = self.audioContext.currentTime;
			g.setValueAtTime(prev_value, t0);
			g.linearRampToValueAtTime(0, t0 + ms);
			await new Promise(done => setTimeout(done, ms));
		}

		if (self.analyser) {
			self.analyser.exit();
			self.analyser = null;
		}
		if (use_eq && self.equalizer) {
			self.equalizer.exit();
			self.equalizer = null;
		}

		if (use_eq) self.equalizer = new GraphicEqualizer({
			SETTINGS, DEBUG,
			audioContext : self.audioContext,
			source       : self.sourceGain,
			container    : self.elements.equalizer,
			rangeInputs  : self.elements.eqBands,
			freqSpans    : self.elements.eqFreqs,
			clearConfig  : parameters.clearConfig,
		});
		self.analyser = new SpectrumAnalyser({
			SETTINGS, DEBUG,
			audioContext : self.audioContext,
			audioSource  : (use_eq ? self.equalizer.output : self.sourceGain),
			canvas       : self.elements.analyser,
			mode         : self.analyserMode,
			clearConfig  : parameters.clearConfig,
		});


		self[use_eq ? 'equalizer' : 'analyser'].output.connect(self.outputGain);

		if (FIX_GRAPH_GLITCH) {
			await new Promise(done => setTimeout(done, ms));
			const t1 = self.audioContext.currentTime;
			g.setValueAtTime(0, t1);
			g.linearRampToValueAtTime(prev_value, t1 + ms);
		}
	}


	this.toggleAnalyser = function(event) {
		if (event.button != 0) return;

		self.equalizer?.saveSettings();
		//self.analyserFade = !self.analyserFade;

		const modes = SETTINGS.SPECTRUM_ANALYSER.MODES;
		self.analyserMode = (++self.analyserMode) % modes.length;

		return self.createAudioGraph();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PUBLIC METHODS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleAdvancedControls = async function(enable = null) {
		if (enable === null) {
			enable = self.elements.musicPlayer.classList.contains('simple');
		}

		self.elements.musicPlayer.classList.toggle('simple', !enable);
		self.elements.advanced   .classList.toggle('pressed', enable);

		if (enable) await self.createAudioGraph();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// LOCAL STORAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.saveSettings = function() {
		if (DEBUG.STORAGE) console.log(
			'&cSaving settings%c to localStorage: ' + STORAGE_KEY, 'color:#c40', 'color:unset',
		);

		const data = {
			volume     : parseFloat(self.elements.volume.value),
			baseVolume : self.baseVolume,
			loopSong   : self.elements.loopSong   .classList.contains('pressed'),
			loopList   : self.elements.loopList   .classList.contains('pressed'),
			starfield  : self.elements.toggleStars.classList.contains('pressed'),
		}
		const json = JSON.stringify(data);
		localStorage.setItem(STORAGE_KEY, json);
	}

	this.loadSettings = function() {
		const json = localStorage.getItem(STORAGE_KEY);
		if (json) {
			if (DEBUG.STORAGE) console.log(
				'%cLoading settings%c from localStorage:' + STORAGE_KEY, 'color:#47f', 'color:unset',
			);
			const data = JSON.parse(json);
			if (DEBUG.PLAYLIST) console.log('AudioPlayer: Settings:', data);
			self.volume(data.volume);
			self.baseVolume = data.baseVolume;
			self.toggleLoopSong(data.loopSong);
			self.toggleLoopList(data.loopList);
			if (parameters.onToggleStars) parameters.onToggleStars(data.starfield);
		}
	}

	this.clearSettings = function() {
		localStorage.removeItem(STORAGE_KEY);

		if (DEBUG.STORAGE) console.log('%cStorage cleared:%c ' + STORAGE_KEY, 'color:red', 'color:unset');
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.init = async function() {
		self.elements = parameters.elements;
		self.library  = parameters.library;
		self.songs    = parameters.library.songs;


		//
		self.loadAlbums(self.library.albums);
		self.loadAlbums(self.library.albums);
		//


		self.loopList = false;
		self.loopSong = false;
		self.playing  = false;

		self.bootTime      = Date.now();
		self.startPlayTime = null;
		self.totalPlayTime = 0;

		self.analyserMode  = 0;

		self.baseVolume    = BASE_VOLUME;


		// Audio context //
		self.audioContext = new (window.AudioContext || window.webkitAudioContext)();

		//...? Context will work happily even if suspended... Why?
	/*
		if (self.audioContext.state == 'suspended') {
			console.error('Audio context is suspended, trying to resume');
			self.audioContext.resume();
		}
	*/
		if (DEBUG.AUDIO_CONTEXT) console.log(
			'AudioPlayer.init: Context', self.audioContext.state,
			'at', self.audioContext.sampleRate, 'Hz,',
			self.audioContext.destination.maxChannelCount, 'output channels',
		);


		//
		self.audio = new Audio();   // <audio> element, waveform will listen to the canplaythrough event
		//


		self.audio.setAttribute(...(parameters.autoStart ? ['autoplay', 'true'] : ['preload', 'auto']));

		self.audio.addEventListener('timeupdate', on_timeupdate);
		self.audio.addEventListener('ended'     , on_ended);

		if (DEBUG.AUDIO_EVENTS) {
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

		// Prevent the Analyser from "stealing" our audible music by adding a gain node
		self.audioSource  = self.audioContext.createMediaElementSource(self.audio);
		self.sourceGain   = self.audioContext.createGain();
		self.audioSource.connect(self.sourceGain);

		self.mainGain     = self.audioContext.createGain();
		self.outputGain   = self.audioContext.createGain();
		self.fadeOutGain  = self.audioContext.createGain();
		self.outputGain .connect(self.fadeOutGain);
		self.fadeOutGain.connect(self.mainGain);
		self.mainGain   .connect(self.audioContext.destination);

		self.elements.volume.max = MAX_VOLUME;

		self.volume(self.elements.volume.value, /*set_value*/false);


		//
		self.analyserMode = prefersReducedMotion() ? 0 : 1;
		await self.createAudioGraph();
		//


		const wave_file_names = Object.values(self.songs).filter(s => s.url).map(s => {
			const file_name = s.url.split('/').pop();
			return changeFileExtension(file_name, '.png');
		});

		//
		self.waveForm = await new Waveform({
			SETTINGS, DEBUG,
			audioContext  : self.audioContext,
			audioElement  : self.audio,
			canvas        : self.elements.waveForm,
			adminPassword : self.elements.adminPassword,
			waveFileNames : wave_file_names,
		});
		//


		// UI Events
		self.elements.play       .addEventListener('click'    , on_play_click);
		self.elements.pause      .addEventListener('click'    , on_pause_click);
		self.elements.stop       .addEventListener('click'    , on_stop_click);
		self.elements.back       .addEventListener('click'    , on_back_click);
		self.elements.next       .addEventListener('click'    , on_next_click);
		self.elements.loopSong   .addEventListener('click'    , on_loop_song_click);
		self.elements.loopList   .addEventListener('click'    , on_loop_list_click);
		self.elements.toggleStars.addEventListener('click'    , on_togglestars_click);
		self.elements.softer     .addEventListener('click'    , on_softer_click);
		self.elements.mute       .addEventListener('click'    , on_mute_click);
		self.elements.louder     .addEventListener('click'    , on_louder_click);
		self.elements.advanced   .addEventListener('click'    , on_advanced_click);
		self.elements.playlist   .addEventListener('click'    , on_playlist_click);
		self.elements.import     .addEventListener('click'    , on_import_click);
		self.elements.filterForm .addEventListener('submit'   , on_filter_click);
		self.elements.filterApply.addEventListener('click'    , on_filter_click);
		self.elements.filterClear.addEventListener('click'    , on_clear_click);
		self.elements.analyser   .addEventListener('click'    , self.toggleAnalyser);
		self.elements.volume     .addEventListener('input'    , on_volume_change);
		self.elements.progress   .addEventListener('mousedown', on_progress_mousedown);
		self.elements.progress   .addEventListener('mouseup'  , on_progress_mouseup);
		self.elements.waveForm   .addEventListener('mousedown', on_waveform_mousedown);
			if (SETTINGS.CUSTOM_SLIDERS.WHEEL_VOLUME) {
		self.elements.volume     .addEventListener('wheel'    , on_volume_wheel);
			}
			if (SETTINGS.CUSTOM_SLIDERS.WHEEL_ALBUMS) {// Actually wrong setting for:
		self.elements.albumlist  .addEventListener('wheel'    , on_horizontal_wheel_scroll);
			}
			if (SETTINGS.CUSTOM_SLIDERS.WHEEL_SEEK) {
		self.elements.progress   .addEventListener('wheel'    , on_progress_wheel);
			}

		self.elements.albumlist.addEventListener('keypress', on_item_enterclick);
		self.elements.playlist.addEventListener('keypress', on_item_enterclick);

		// Add padding, when content overflows and a scrollbar appears
		setTimeout(()=>{
			observe_scrollability(self.elements.albumlist);
			observe_scrollability(self.elements.playlist);
			observe_scrollability(self.elements.lyrics);
		});

		// Timestamp
		if (PRECISION_TIMER) on_timestamp_update();   // Start setTimeout loop (faster than ontimeupdate)

		const is_simple = self.elements.musicPlayer.classList.contains('simple');
		self.elements.advanced.classList.toggle('pressed', !is_simple)

		// Settings
		if (parameters.clearConfig) {
			self.clearSettings();
		} else {
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		}

		self.mainGain.gain.value = self.baseVolume;

		on_filter_click({ 'preventDefault': ()=>{} });//...ugly Load initial song list (all)
		self.stop();

		// Starfield
		if (SETTINGS.SHOW_STAR_FIELD && parameters.onToggleStars) {
			parameters.onToggleStars(!prefersReducedMotion());
		}

		// Autoplay
		//if (parameters.autoStart) //...self.play();
		//...###if (parameters.autoStart) setTimeout(() => self.play());

		// Debug
		if (DEBUG.ENABLED) window.PLAYER = self;
	}


	return self.init().then(() => self);   // const audioPlayer = await new AudioPlayer();
}


//EOF
