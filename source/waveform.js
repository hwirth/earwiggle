// waveform.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import {
	clamp, newElement, getCSSvar, format_time, prefersReducedMotion, renderDebugDots, changeFileExtension,
} from './helpers.js';


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
	const { HOLLOW_INDICATOR, PRE_CACHE_WAVES, INSET_BORDER } = SETTINGS.WAVE_FORM;
	const { audioContext, audioElement, canvas, adminPassword, waveFileNames } = parameters;

	let ctx = null;   // Canvas 2d context

	this.abortController;
	this.idleTimeout;

	this.rendering;
	this.hollowIndicator;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// WAVE FORM CACHE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function wave_cache_key(filename) {
		return changeFileExtension(
			decodeURIComponent(filename.split('/').pop())
		, '.png');
	}


	function init_wave_cache(file_names) {
		file_names.forEach(f => {
			const key = wave_cache_key(f);

			fetch('waveforms/' + f)
			.then(response => response.blob())
			.then(blob => {
				const canvas = document.createElement('canvas');
				const ctx    = canvas.getContext('2d');
				const img    = new Image();
				const reader = new FileReader();
				reader.onloadend = () => {
					img.onload = () => {
						canvas.width = img.width;
						canvas.height = img.height;
						ctx.drawImage(img, 0, 0);
						WAVE_CACHE[key] = ctx.getImageData(0, 0, canvas.width, canvas.height);
					}
					img.src = reader.result; // Convert the blob into an image
				};
				reader.readAsDataURL(blob); // Convert blob to base64 data URL
			})
			.catch(error => {
				console.error('Error fetching image:', error);
			});
		});
	}

	this.maxX;
	this.maxY;
	this.canvasToCache = function(key) {
		if (!ctx) return;

		if (key) WAVE_CACHE[key] = ctx.getImageData(0, 0, canvas.width, canvas.height);

		if (adminPassword.value) canvas.toBlob(blob => {
			console.log('POSTing waveform cache image', key);

			const formData = new FormData();
			formData.append('image', blob, 'image.png');
			formData.append('filename', key);
			formData.append('password', adminPassword.value);

			fetch('waveforms/store_waveform.php', {
				method: 'POST',
				body: formData
			})
			.then(response => {
				if (!response.ok) {
					console.log(response);
					throw new Error('Failed to upload: ' + file_name);
				}
			})
			.catch(error => {
				console.error('Error:', error);
			});
		});
	}

	this.canvasFromCache = function() {
		if (!ctx) return;

		const key = wave_cache_key(audioElement.src);
		if (key && WAVE_CACHE[key]) ctx.putImageData(WAVE_CACHE[key], 0, 0);

	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// DRAW EMPTY WAVE FORM
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.reset = function() {
		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		const [w, h] = [canvas.width, canvas.height];

		ctx.clearRect(0, 0, w, h);
		const bg_color = getCSSvar('--waveform-bg');  //... Don't access CSS here
		if (bg_color) {
			ctx.fillStyle = bg_color;
			ctx.fillRect(0, 0, w, h);
		}

		ctx.fillStyle = getCSSvar('--waveform-empty-color-1');
		ctx.fillRect(0, Math.floor(canvas.height / 2), canvas.width, 1);

		const midY = canvas.height / 2;
		ctx.fillStyle = getCSSvar('--waveform-empty-color-1');

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

		if (DEBUG.CANVAS_SIZING) renderDebugDots(canvas, ctx);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RENDER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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

		const cache_key = wave_cache_key(audioElement.src);

		if (WAVE_CACHE[cache_key]) {
			self.canvasFromCache();
			return;
		}

		if (self.abortController) {
			// User skipped to another song while we were loading
			if (DEBUG.ENABLED) console.log('Waveform aborting fetch:', audioElement.src);
			self.abortController.abort();
			self.idleTimeout = false;   // Stop rAF loop
			self.animatedEmptyWave = false;
		}

		if (!self.idleTimeout && !prefersReducedMotion()) {
			self.animatedEmptyWave = !prefersReducedMotion();
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
			if (DEBUG.WAVE_FORM) console.log('Waveform pre-render fetch:', cache_key);

			// Retreive MP3
			response = await fetch(
				audioElement.src,
				{ signal: self.abortController.signal },
			);

			if (DEBUG.WAVEFORM) console.log('Waveform response:', response);
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
		const mid_color_max   = getCSSvar('--waveform-mid-color-max');
		const mid_color_avg   = getCSSvar('--waveform-mid-color-avg');
		const right_color_max = is_stereo ? getCSSvar('--waveform-right-color-max') : left_color_max;
		const right_color_avg = is_stereo ? getCSSvar('--waveform-right-color-avg') : left_color_avg;

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

			function fill(color1, color2, x, y, w, h) {
				const gradient = ctx.createLinearGradient(x, y, x+w, y+h);

				const upper = (y < canvas.height/2);   // Left channel = upper half of the image
				gradient.addColorStop(upper ? 0 : 1, color1);
				gradient.addColorStop(upper ? 1 : 0, color2);

				ctx.fillStyle = gradient;
				ctx.fillRect(x, y, w, h);
			}
			fill( left_color_max, mid_color_max, x, midY-left_max_y, stroke_width, left_max_y);  // top left_max
			fill( left_color_avg, mid_color_avg, x, midY-left_avg_y, stroke_width, left_avg_y);  // top left avg
			fill(right_color_max, mid_color_max, x, midY, stroke_width, right_max_y);            // btm right_max
			fill(right_color_avg, mid_color_avg, x, midY, stroke_width, right_avg_y);            // btm right_avg
		}

		// Inset "shadow"
		if (INSET_BORDER) {
			const [w, h] = [canvas.width, canvas.height];
			ctx.strokeStyle = getCSSvar('--page-bg-color');
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.rect(0.5, 0.5, w-0.5, h-0.5);
			ctx.stroke();
			ctx.lineWidth = 1;
		}

		self.canvasToCache(cache_key);

		if (DEBUG.CANVAS_SIZING) renderDebugDots(canvas, ctx);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRESS INDICATOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.showProgress = function(ratio) {
		//...if (!canvas.checkVisibility()) return;
		if (!ctx) return;

		const src = WAVE_CACHE[audioElement.src];
		if (src) {
			self.idleTimeout = false;   // Stop rAF loop
			self.animatedEmptyWave = false;
		}

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
		if (DEBUG.WAVEFORM) {
			console.group('Waveform.init');
			console.log(canvas.width, canvas.offsetWidth);
			console.log(canvas.height, canvas.offsetHeight);
			console.groupEnd();
		}

		self.rendering         = false;
		self.idleTimeout       = null;   // No initial rAF loop
		self.animatedEmptyWave = false;

		if (PRE_CACHE_WAVES) init_wave_cache(waveFileNames);   // Download //...all prerendered waveforms

		if (canvas.checkVisibility()) {
			const padding = parseInt(getCSSvar('--control-padding'), 10);
			canvas.width  = canvas.offsetWidth - 2*padding;
			canvas.height = canvas.offsetHeight - 2*padding;
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
	}

	return self.init().then(() => self);   // const waveform = await new Waveform();
}


//EOF
