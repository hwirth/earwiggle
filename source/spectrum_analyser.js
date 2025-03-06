// spectrum_analyser.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { clamp, newElement, getCSSvar, renderDebugDots } from './helpers.js';

let instanceNr = 0;

export function SpectrumAnalyser(parameters) {
	const self = this;

	const { SETTINGS, DEBUG, audioContext, audioSource, canvas, clearConfig } = parameters;
	const {
		STORAGE_KEY, TOP_FREQ, MIN_DECIBELS, MAX_DECIBELS, OFS_DECIBELS,
		MODES, WHEEL_ZOOM, INSET_BORDER,
	} = parameters.SETTINGS.SPECTRUM_ANALYSER;

	let mode = parameters.mode;

	this.stream;
	this.running;
	this.paused;
	this.output;

	this.heightZoom;
	this.frequencyZoom;

	this.startAnalyser = function(stream, canvas, mode) {
		const fade = mode > 0;

		// This assumes canvas.style = transform:scaleY(-1)
		if (!getComputedStyle(canvas).transform) console.error(
			'You probably want to set transform:scaleY(-1) on the canvas for the spectrum analyser',
		);

		const padding = parseInt(getComputedStyle(canvas).padding, 10);
		const [w, h] = [canvas.offsetWidth - 2*padding, canvas.offsetHeight - 2*padding];

		const [
			initialCanvasBg, fadeBar, peakClr, baseHgt,
			fadeBgColor, spectrumColorFactor, fadeOffsetX, fadeOffsetY,
			hideBaseWidth, hideBaseShift, blueLight, blueWidth,
			frequencyZoom, tfB, tfF, fadeBarWidth, applyFadeAlpha,
			minDecibels, maxDecibels,
		] = [
			'--waveform-bg',
			'--analyser-barheight-factor',
			'--analyser-peak-color',
			'--analyser-base-height',

			'--analyser-clear-color',
			'--analyser-rainbow-factor',
			'--analyser-offset-x',
			'--analyser-offset-y',

			'--analyser-hide-base-width',
			'--analyser-hide-shift-width',
			'--analyser-blue-light-factor',
			'--analyser-blue-light-width',

			'--analyser-frequency-zoom',
			'--analyser-top-freq-bars',
			'--analyser-top-freq-fade',
			'--analyser-fade-bar-width',
			'--analyser-set-alpha',

			'--analyser-min-db',
			'--analyser-max-db',
		].map(v => getCSSvar(v));

		const fftSize             = (fade ? 2**tfF  : 2**tfB ) * 4;   // Nr. bands
		const binLengthFactor     = (fade ? 4       : 1      );
		const peakHeight          = (fade ? 2       : 2      );   // Size of peak indicator (on top of bars)
		const peakColor           = (fade ? peakClr : '#fff' );   // Color of peak indicator (Bg with new fade)
		const peakOffset          = (fade ? -1      : -1     );   // bars 1px down, prevent gap below "flames"
		const barWidthFactor      = (fade ? 2       : 1.02   );
		const barHeightFactor     = (fade ? fadeBar : 1-peakHeight/h);   // scale bar height
		const barGap              = (fade ? 0       : 1      );
		const baseHeight          = (fade ? baseHgt : 0      );   // px at bottom, always full color rainbow
		const luminosity          = 50;
		const fullDecaySeconds    = 3;


// CANVAS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		if (canvas.checkVisibility()) {
			canvas.width  = canvas.offsetWidth - 2*padding;
			canvas.height = canvas.offsetHeight - 2*padding;
		}

		const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
		//...?? NOT needed?? //...canvasCtx.translate(0.5, 0.5);

		canvasCtx.fillStyle = initialCanvasBg;
		canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

		function fade_alpha(alpha = applyFadeAlpha) {
			const [w, h]  = [canvas.width, canvas.height];
			const imgData = canvasCtx.getImageData(0, 0, w, h);
			const data    = imgData.data;

			for (let i=0, y=0 ; y < 1+canvas.height ; y++) {
				for (let x=0 ; x < canvas.width ; x++, i+=4) {
					const R = data[i + 0];
					const G = data[i + 1];
					const B = data[i + 2];
		if (false) {
					// Move colors towards red
					const f = 1;
					const j = i//(nr_pixels - 1) - (i + w);
					const R = Math.max(0, data[j + 0] - f);
					const G = Math.max(0, data[j + 1] - f);
					const B = Math.max(0, data[j + 2] - f);
		}
					data[i + 0] = R;
					data[i + 1] = G;
					data[i + 2] = B;
					data[i + 3] = applyFadeAlpha;
				}
			}

			canvasCtx.putImageData(imgData, 0, 0);
		}


// ANALYSER //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const analyser = audioContext.createAnalyser();
		analyser.maxDecibels = minDecibels;
		analyser.minDecibels = maxDecibels;
		stream.connect(analyser);

		analyser.fftSize   = fftSize;
		const bufferLength = Math.floor(analyser.frequencyBinCount * binLengthFactor);
		const dataArray    = new Uint8Array(bufferLength);


// SPECTROGRAM ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const nrOctaves    = Math.log2(audioContext.sampleRate / 20);
		const octaveStep   = canvas.width / nrOctaves;
		const octaveOffset = (canvas.width - octaveStep * Math.floor(nrOctaves)) / 2;

		const barMax = Array(bufferLength).fill(0);
		const heightConvert = (
			(fade)
			? (canvas.height - baseHeight) / 256/*1 byte*/ * barHeightFactor
			: h / 255 * barHeightFactor
		);

		let lastTime = 0;
		function draw(timestamp) {
			if (!self.running) return;

			requestAnimationFrame(draw);

			const now = Date.now();
			if (now - self.lastFPStime > 1000) {
				self.fps = self.frameCount;
				self.lastFPStime = now;
			}

			if (self.paused) return;

			const elapsedSeconds = (timestamp - lastTime) / 1000 / fullDecaySeconds;
			lastTime = timestamp;
			const reduceMax = fade ? 1 : (canvas.height * elapsedSeconds) || 0;

			analyser.getByteFrequencyData(dataArray);

			const [w, h] = [canvas.width, canvas.height];

			if (fade) {
				canvasCtx.drawImage(canvas, fadeOffsetX, fadeOffsetY);
				if (fadeBgColor != 'transparent') {
					canvasCtx.fillStyle = fadeBgColor;
					canvasCtx.fillRect(0, 0, w, h);
				}
				if (applyFadeAlpha) fade_alpha();
			} else {
				//...canvasCtx.fillStyle = initialCanvasBg;
				//...canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
				canvasCtx.clearRect(0, 0, w, h);
			}


// COLUMNS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

			const barWidth = (
				(fade)
				? 1*fadeBarWidth
				: Math.floor((canvas.width / bufferLength) * barWidthFactor)
			);

			for (let i = 0, x = 0; i < bufferLength; i++, x += barWidth+barGap) {
				const j = fade ? Math.floor(i / (frequencyZoom * self.frequencyZoom)) : i;
				const barHeight = (fade ? self.heightZoom : 1) * heightConvert * dataArray[j];


// BARS //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
				//... Blue still too dark

				const hue = Math.floor((x / canvas.width) * 360 * spectrumColorFactor);
				const lum = (x) => clamp((1 - Math.abs((x - (360/360)) * 1))**2 , 0, 1);

				const r = i / bufferLength;
				const dx = (r - 0.475) / blueWidth;
				const d = (2 + Math.max(0, blueLight-dx*dx)) / 2;
				const l = fade
					? 50 //...* lum(i*frequencyZoom/bufferLength) //* d
					: 45;

				// Render
				canvasCtx.fillStyle = `hsl(${hue}deg 100% ${l}%)`;
				canvasCtx.fillRect(x, peakOffset, barWidth, Math.floor(barHeight));

				canvasCtx.fillStyle = peakColor;
				const y = Math.floor(barMax[i]);
				canvasCtx.fillRect(x, y + peakOffset, barWidth, peakHeight);

				// Falling peaks
				barMax[i] = Math.max(1, barMax[i] - reduceMax, barHeight);
			}
			//...canvasCtx.strokeStyle = '#ffcc0010';
			//...canvasCtx.stroke();

			// Octave markers
			canvasCtx.fillStyle = getCSSvar('--border-color');
			for (let x = 0; x < canvas.width; octaveStep, x+=octaveStep) {
				canvasCtx.fillRect(Math.floor(octaveOffset + x), canvas.height - 2, 1, 1);
			}

			// Inset "shadow"
			if (INSET_BORDER) {
				canvasCtx.strokeStyle = getCSSvar('--page-bg-color');
				canvasCtx.beginPath();
				canvasCtx.lineWidth = 1;
				canvasCtx.rect(0.5, 0.5, w-0.5, h-0.5);
				canvasCtx.stroke();
				canvasCtx.lineWidth = 1;
			}

			if (DEBUG.CANVAS_SIZING) renderDebugDots(canvas, canvasCtx);
		}

		self.running = true;
		draw();

		return analyser;
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_wheel(event) {
		if (event.shiftKey) {
			if (event.deltaY > 0) {
				self.frequencyZoom /= 1.1;
			} else {
				self.frequencyZoom *= 1.1;
			}
			console.log(self.frequencyZoom);
		} else {
			if (event.deltaY > 0) {
				self.heightZoom /= 1.1;
			} else {
				self.heightZoom *= 1.1;
			}
		}
	}

	function on_mousedown(event) {
		if (event.button == 2) {
			self.heightZoom = 1;
			self.frequencyZoom = 1;
		}
	}

	function on_contextmenu(event) {
		if (event.shiftKey || event.ctrlKey || event.altKey) return;
		event.preventDefault();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// METHODS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.timeout;

	this.suspend = function() {
		const delay = 0;
		self.timeout = setTimeout(() => self.paused = true, delay);
	}

	this.resume = function() {
		clearTimeout(self.timeout);
		self.paused = false;
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// LOCAL STORAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.saveSettings = function() {
		if (DEBUG.STORAGE) console.log(
			'%cSaving settings%c to localStorage: ' + STORAGE_KEY, 'color:#c40', 'color:unset',
		);

		const data = { mode, heightZoom: self.heightZoom };
		const json = JSON.stringify(data);
		localStorage.setItem(STORAGE_KEY, json);
	}

	this.loadSettings = function() {
		const json = localStorage.getItem(STORAGE_KEY);
		if (json) {
			if (DEBUG.STORAGE) console.log(
				'%cLoading settings%c from localStorage:' + STORAGE_KEY, 'color:#47f', 'color:unset',
			);
			const values = JSON.parse(json);
			if (mode === undefined) mode = values.mode;
			if (values.heightZoom) self.heightZoom = values.heightZoom;
		}
	}

	this.clearSettings = function() {
		localStorage.removeItem(STORAGE_KEY);

		if (DEBUG.STORAGE) console.log('%cStorage cleared:%c ' + STORAGE_KEY, 'color:red', 'color:unset');
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.instanceNr = ++instanceNr;

	this.exit = function() {
		self.running = false;
		audioSource.disconnect(self.output);
		self.output.disconnect();

		if (WHEEL_ZOOM) {
			canvas.removeEventListener('wheel'      , on_wheel);
			canvas.removeEventListener('mousedown'  , on_mousedown);
			canvas.removeEventListener('contextmenu', on_contextmenu);
		}

		if (!clearConfig) self.saveSettings();
		if (DEBUG.INSTANCES) console.log('SpectrumAnalyser: exit', self.instanceNr);
	}

	this.init = function() {
		self.heightZoom = 1;
		self.frequencyZoom = 1;

		if (clearConfig) {
			self.clearSettings();
		} else {
			//... Breaks playlist remembering setting
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		}

		MODES.forEach(m => canvas.classList.toggle(m, m == MODES[mode]));
		canvas.classList.toggle('fade', MODES[mode] != 'bars');
		if (DEBUG.SPECTRUM_ANALYSER) console.log('Mode:', mode, '-', MODES[mode], '-', canvas.className);

		self.paused = false;
		self.output = self.startAnalyser(audioSource, canvas, mode);

		if (WHEEL_ZOOM) {
			canvas.addEventListener('wheel'      , on_wheel);
			canvas.addEventListener('mousedown'  , on_mousedown);
			canvas.addEventListener('contextmenu', on_contextmenu);
		}
	}

	self.init();
}


//EOF
