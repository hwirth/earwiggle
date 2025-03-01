// waveform.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { clamp, newElement, getCSSvar, format_time, prefersReducedMotion } from './helpers.js';

const HOLLOW_INDICATOR = false;

export const waveformCache = new function() {
	const self = this;

	this.waveforms = {};

	this.add = (key, w) => self.waveforms[key] = w;
	this.remove = (w) => self.waveforms[w] && delete self.waveforms[w];
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// STATIC
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

let WAVE_CACHE = {};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// OBJECT TEMPLATE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export const Waveform = function(parameters) {
	const self = this;

	const { SETTINGS, DEBUG } = parameters;
	const { audioContext, audioElement, canvas } = parameters;

	let ctx = null;   // Canvas 2d context

	this.abortController;
	this.idleTimeout;

	this.rendering;
	this.hollowIndicator;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RENDER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.maxX;
	this.maxY;
	this.canvasToCache = function() {
		if (DEBUG.WAVE_FORM) console.log('save: WAVE_CACHE:', key, WAVE_CACHE[key], WAVE_CACHE);

		if (!ctx) return;

		const key = audioElement.src;
		if (key) WAVE_CACHE[key] = ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	this.canvasFromCache = function() {
		if (DEBUG.WAVE_FORM) console.log('load: WAVE_CACHE:', key, WAVE_CACHE[key], WAVE_CACHE);

		if (!ctx) return;

		const key = audioElement.src;
		if (key && WAVE_CACHE[key]) ctx.putImageData(WAVE_CACHE[key], 0, 0);

	}

	this.reset = function() {
		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const bg_color = getCSSvar('--waveform-bg');
		if (bg_color) {
			ctx.fillStyle = bg_color;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		ctx.fillStyle = getCSSvar('--waveform-empty-color-1');
		ctx.fillRect(0, Math.floor(canvas.height / 2), canvas.width, 1);

		const midY = canvas.height / 2;
		ctx.fillStyle = getCSSvar('--waveform-empty-color-1');

		self.animatedEmptyWave = true;
		const animated = (self.animatedEmptyWave) ? 1 : 0;
		const tf1 = Math.PI;
		const tf2 = -1;
		const t1 = animated * (Date.now() % (2000*tf1) - tf1*1000) / (tf1*1000) * Math.PI;
		const t2 = animated * (Date.now() % (2000*tf2) - tf2*1000) / (tf2*1000) * Math.PI;

		const f1 = (x, f) => Math.sin(x / canvas.width * Math.PI * f - t1) * midY * 0.8;
		const f2 = (x, f) => Math.sin(x / canvas.width * Math.PI * f - t2) * midY * 0.8;
		for (let x = 0; x < canvas.width; x++) {
			const y0 = f1(x, 4); ctx.fillRect(x, midY-y0, 1, 2*y0);
			const y1 = f2(x, 7); ctx.fillRect(x, midY-y1, 1, 2*y1);
		}

		//...self.showProgress(0);
	}

	this.showError = function() {
		self.idleTimeout = false;   // Stop rAF loop

		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const midX = Math.floor(canvas.width / 2);
		const midY = Math.floor(canvas.height / 2);

		ctx.fillStyle = '#f00';
		ctx.fillRect(0, midY, midX - 10, 1);
		ctx.fillRect(midX + 10, midY, midX - 10, 1);

		ctx.font = 'bold 25px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText('?', midX, midY);
	}

	this.render = async function(event) {
		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		if (WAVE_CACHE[event.target.src]) {
			self.canvasFromCache();
			return;
		}

		if (self.abortController) {
			// User skipped to another song while we were loading
			if (DEBUG.ENABLED) console.log('Waveform aborting fetch:', audioElement.src);
			self.abortController.abort();
			self.idleTimeout = false;   // Stop rAF loop
		}

		if (!self.idleTimeout && !prefersReducedMotion()) {
			function on_idle() {
				if (self.idleTimeout) requestAnimationFrame(on_idle);
				if (self.animatedEmptyWave) {
					self.reset();
					const ratio = audioElement.currentTime / audioElement.duration;
					if (ratio) self.showProgress(ratio);
				}
			}
			self.idleTimeout = requestAnimationFrame(on_idle);   // Start rAF loop
		}
		self.abortController = new AbortController();
		let response = null;

		try {
			if (DEBUG.ENABLED) console.log('Waveform:', decodeURIComponent(audioElement.src.split('/').pop()));

			// Retreive MP3
			response = await fetch(
				audioElement.src,
				{ signal: self.abortController.signal },
			);

			if (DEBUG.ENABLED) console.log('Waveform response:', response);
			self.abortController = null;
		}
		catch (e) {
			console.error(`Error while fetching ${audioElement.src}`);
			console.log(error);
			self.abortController = null;
			return;
		}

		const audioData = await response.arrayBuffer();
		const buffer    = await audioContext.decodeAudioData(audioData);

		const is_stereo = buffer.numberOfChannels >= 2;
		if (buffer.numberOfChannels > 2 || buffer.numberOfChannels < 1) console.error(
			'Unexpected number of channels:' + buffer.numberOfChannels,
		);

		const leftChannel  = buffer.getChannelData(0);
		const rightChannel = buffer.getChannelData(is_stereo ? 1 : 0);

		const maxX = canvas.width;
		const midY = Math.floor(canvas.height / 2);

		const samples_per_pixel = buffer.length / maxX;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		const bg_color = getCSSvar('--waveform-bg');
		if (bg_color) {
			ctx.fillStyle = bg_color;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}

		const left_color_max  = getCSSvar('--waveform-left-color-max');
		const left_color_avg  = getCSSvar('--waveform-left-color-avg');
		const right_color_max = getCSSvar('--waveform-right-color-max');
		const right_color_avg = getCSSvar('--waveform-right-color-avg');

		const stroke_width = 1;

		let last_update_time = Date.now();
		for (let x = 0; x < maxX; x++) {
			const tOffset = Math.floor(x * samples_per_pixel);

			let  sum_left = 0;
			let sum_right = 0;
			let  max_left = 0;
			let max_right = 0;
			for (let t = 0; t < samples_per_pixel; t++) {
				const i = tOffset + t;
				const left  = Math.abs(leftChannel[i]);
				const right = Math.abs(rightChannel[i])

				if (left  > max_left ) max_left  = left;
				if (right > max_right) max_right = right;

				sum_left  += left;
				sum_right += right;
			}
			const  left_max_y = max_left  * midY;
			const right_max_y = max_right * midY;

			const  left_avg_y = sum_left  / samples_per_pixel * midY * 3;
			const right_avg_y = sum_right / samples_per_pixel * midY * 3;

			function fill(color, x0, y0, w, h) {
				ctx.fillStyle = color;
				ctx.fillRect(x0, y0, w, h);
			}
			fill( left_color_max, x, midY-left_max_y, stroke_width, left_max_y);  // top left_max
			fill( left_color_avg, x, midY-left_avg_y, stroke_width, left_avg_y);  // top left avg
			fill(right_color_max, x, midY, stroke_width, right_max_y);            // btm right_max
			fill(right_color_avg, x, midY, stroke_width, right_avg_y);            // btm right_avg
		}

		console.log(event);
		self.canvasToCache();
	}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRESS INDICATOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.showProgress = function(ratio) {
		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		const src = WAVE_CACHE[audioElement.src];
		if (src) self.idleTimeout = false;   // Stop rAF loop

		self.canvasFromCache(src);
		const x = Math.floor((canvas.width - 1) * ratio);
		const h = canvas.height;		//if (self.animatedEmptyWave) self.reset();

		if (self.hollowIndicator) {
			ctx.fillStyle = getCSSvar('--waveform-progress-shadow');
			ctx.fillRect(x-3, 0, 2, h);
			ctx.fillRect(x+2, 0, 2, h);

			ctx.fillStyle = getCSSvar('--waveform-progress-color');
			ctx.fillRect(x-2, 2, 1, h-4);
			ctx.fillRect(x+2, 2, 1, h-4);

			ctx.fillRect(x-1,   1, 1, 1);
			ctx.fillRect(x+1,   1, 1, 1);
			ctx.fillRect(x-1, h-2, 1, 1);
			ctx.fillRect(x+1, h-2, 1, 1);

			ctx.fillRect(x,   0, 1, 1);
			ctx.fillRect(x, h-1, 1, 1);
		} else {
			ctx.fillStyle = getCSSvar('--waveform-progress-shadow');
			ctx.fillRect(x-3, 0, 6, h);

			ctx.fillStyle = getCSSvar('--waveform-progress-color');
			ctx.fillRect(x-2, 2, 1, h-4);
			ctx.fillRect(x+2, 2, 1, h-4);

			ctx.fillRect(x-3, 0, 1, 1.5);
			ctx.fillRect(x-2, 1, 1, 2  );
			ctx.fillRect(x+2, 1, 1, 2  );
			ctx.fillRect(x+3, 0, 1, 1.5);

			ctx.fillRect(x-3, h-1.5, 1, 1.5);
			ctx.fillRect(x-2, h-3  , 1, 2  );
			ctx.fillRect(x+2, h-3  , 1, 2  );
			ctx.fillRect(x+3, h-1.5, 1, 1.5);
		}
	}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function() {
		self.idleTimeout = false;
	}

	this.init = async function() {
		self.rendering   = false;
		self.idleTimeout = null;   // No initial rAF loop

		requestAnimationFrame(()=>{
			if (DEBUG.WAVEFORM) {
				console.group('Waveform.init');
				console.log(canvas.width, canvas.offsetWidth);
				console.log(canvas.height, canvas.offsetHeight);
				console.groupEnd();
			}

			if (canvas.checkVisibility()) {
				canvas.width  = canvas.offsetWidth;
				canvas.height = canvas.offsetHeight;
			}

			try {
				ctx = canvas.getContext('2d', {
					willReadFrequently : !true,   //... We dont, but the browser complains
				});
				//... Not required for fillRect: ctx.translate(0.5, 0.5);s

				if (DEBUG.WAVE_FORM) console.log(
					'waveform: globalAlpha:', ctx.globalAlpha,
				);
			}
			catch (error) {
				console.error('Trying to inizialize Waveform canvas failed');
			}

			self.hollowIndicator = false;
			self.reset();
			self.showProgress(0);

			audioElement.addEventListener('canplaythrough', this.render);
		});
	}

	return self.init().then(() => self);   // const waveform = await new Waveform();
}


//EOF
