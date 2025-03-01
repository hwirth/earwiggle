// spectrum_analyser.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { clamp, newElement, getCSSvar } from './helpers.js';

let instanceNr = 0;

export function SpectrumAnalyser(parameters) {
	const self = this;

	const { SETTINGS, DEBUG, audioContext, audioSource, canvas, fade, loadConfig } = parameters;
	const { STORAGE_KEY, TOP_FREQ, MIN_DECIBELS, MAX_DECIBELS } = parameters.SETTINGS.SPECTRUM_ANALYSER;

	this.stream;
	this.running;
	this.paused;
	this.output;

	this.startAnalyser = function(stream, canvas, fade) {
		// This assumes canvas.style = transform:scaleY(-1)
		if (!getComputedStyle(canvas).transform) console.error(
			'You probably want to set transform:scaleY(-1) on the canvas for the spectrum analyser',
		);

		const [w, h] = [canvas.width, canvas.height];
		const [
			fadeBar, peakClr, baseHgt,
			fadeBgColor, spectrumColorFactor, fadeOffsetX, fadeOffsetY,
			hideBaseWidth, hideBaseShift, blueLight, blueWidth,
			frequencyZoom, tfB, tfF, fadeBarWidth,
		] = [
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
		].map(v => getCSSvar(v));

		const TF = TOP_FREQ;   // TOP_FREQ : 2**( 0 ),
		//const TFb = 2**tfBars;  // 1024
		//const TFf = 2**tfFade;  // 64
//console.log( TF, TFb, TFf);
		//const fftSize             = (fade ? TFf     : TFb    );   // Nr. bands
		//const binLengthFactor     = (fade ? 1/TFf   : 1      );

		//const fftSize             = (fade ? 256*TF  : 16) * 4;   // Nr. bands
		const fftSize             = (fade ? 2**tfF  : 2**tfB ) * 4;   // Nr. bands
		const binLengthFactor     = (fade ? 4       : 1      );
		const peakHeight          = (fade ? 2       : 2      );   // Size of peak indicator (on top of bars)
		const peakColor           = (fade ? peakClr : '#fff' );   // Color of peak indicator (Bg with new fade)
		const peakOffset          = (fade ? -1      : -1     );   // bars 1px down, prevent gap below "flames"
		const barWidthFactor      = (fade ? 2       : 1      );
		const barHeightFactor     = (fade ? fadeBar : 1-2/h  );   // scale bar height
		const barGap              = (fade ? 0       : 1      );
		const baseHeight          = (fade ? baseHgt : 0      );   // px at bottom, always full color rainbow
		const luminosity          = 50;
		const fullDecaySeconds    = 3;
		const applyFadeAlpha      = getCSSvar('--analyser-set-alpha') == 'true';


// CANVAS ////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		/*//...
			const ratio = (
				window.devicePixelRatio /
				(document.createElement('canvas').getContext('2d').backingStorePixelRatio || 1)
			);
			const style = getComputedStyle(canvas);
			const borderPadding = (parseInt(style.borderWidth) + parseInt(style.paddingLeft)) * 2 * ratio;
		*/
		const ratio = 1;
		//const borderPadding = getCSSvar('--control-padding');
		const borderPadding = 0;

		const offset = 2 * parseInt(borderPadding, 10);
		if (canvas.checkVisibility()) {
			canvas.setAttribute('width' , canvas.width  = canvas.offsetWidth  * ratio + offset);
			canvas.setAttribute('height', canvas.height = canvas.offsetHeight * ratio + offset);
		}

		const canvasCtx = canvas.getContext('2d', { willReadFrequently: true });
		//...?? NOT needed?? //...canvasCtx.translate(0.5, 0.5);

		function fade_alpha() {
			// Fade dark areas
			const [w, h]    = [canvas.width, canvas.height];
			const imgData   = canvasCtx.getImageData(0, 0, w, h);
			const data      = imgData.data;

			for (let i=0, y=0 ; y < 1+canvas.height ; y++) {
				for (let x=0 ; x < canvas.width ; x++, i+=4) {

if (false) {
					// Move colors towards red
					const f = 1;
					const j = i//(nr_pixels - 1) - (i + w);
					const R = Math.max(0, data[j + 0] - f);
					const G = Math.max(0, data[j + 1] - f);
					const B = Math.max(0, data[j + 2] - f);
					data[i + 0] = R;
					data[i + 1] = G;
					data[i + 2] = B;
}
					// Set alpha
					data[i + 3] = 225;
				}
			}

			canvasCtx.putImageData(imgData, 0, 0);
		}


// ANALYSER //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const analyser = audioContext.createAnalyser();
		analyser.maxDecibels = MIN_DECIBELS;
		analyser.minDecibels = MAX_DECIBELS;
		stream.connect(analyser);

		analyser.fftSize   = fftSize;
		const bufferLength = Math.floor(analyser.frequencyBinCount * binLengthFactor);
		const dataArray    = new Uint8Array(bufferLength);


// SPECTROGRAM ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

		const nrOctaves    = Math.log2(audioContext.sampleRate / 20);
		const octaveStep   = canvas.width / nrOctaves;
		const octaveOffset = (canvas.width - octaveStep * Math.floor(nrOctaves)) / 2;

		const barMax = Array(bufferLength).fill(0);
		const heightConvert = (canvas.height - baseHeight) / 256/*1 byte*/ * barHeightFactor;

		let lastTime = 0;
		function draw(timestamp) {
			if (!self.running) return;

			requestAnimationFrame(draw);

			if (canvas.width == 0) return;

			const now = Date.now();
			if (now - self.lastFPStime > 1000) {
				self.fps = self.frameCount;
				self.lastFPStime = now;
			}

			if (self.paused) return;

			//...if (!canvas.checkVisibility()) return;

			const elapsedSeconds = (timestamp - lastTime) / 1000 / fullDecaySeconds;
			lastTime = timestamp;
			const reduceMax = fade ? 1 : (canvas.height * elapsedSeconds) || 0;

			analyser.getByteFrequencyData(dataArray);

			if (fade) {
				canvasCtx.drawImage(canvas, fadeOffsetX, fadeOffsetY);
				if (fadeBgColor != 'transparent') {
					canvasCtx.fillStyle = fadeBgColor;
					canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
				}
				if (applyFadeAlpha) fade_alpha();
			} else {
				canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
			}


// COLUMNS ///////////////////////////////////////////////////////////////////////////////////////////////////////119:/

			const barWidth = fade ? 1*fadeBarWidth : Math.floor((canvas.width / bufferLength) * barWidthFactor);

			const scaleFactor = Math.log10(256) / 255;
			const scaleValueA = y => Math.log10(y + 1) / scaleFactor;   // Highlight base
			const scaleValueB = y => (y / 256)**4 * 255;                // Highlight treble

			//...canvasCtx.beginPath;
			//...canvasCtx.moveTo(0, dataArray[0]);
			for (let i = 0, x = 0; i < bufferLength; i++, x += barWidth+barGap) {
				//...const c = canvas.height;
				//...canvasCtx.moveTo(x*c, dataArray[0]/256*canvas.height*c);
				//...if (x % 8 == 7) canvasCtx.lineTo(x, dataArray[0]/256*canvas.height);

				// CALCULATE BAR HEIGHT
				// Remove always excessive base values in the Analyser node
				const r = i / bufferLength;

				// Clamp inverted 1/(r) to [0..1]
				const reduce_base_factor = clamp((r - hideBaseShift)/hideBaseWidth, 0, 1)**2;

				// Get bar height
				const j = Math.floor(i / frequencyZoom);
				const scaled_value = scaleValueB(dataArray[j]);
				const barHeight = fade ? (
					baseHeight - peakOffset
					+ scaled_value
					* reduce_base_factor
					//* (r + 0.5) * 2.5
					* heightConvert
				) : scaled_value * 0.25;


// BARS //////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
				//... Blue still too dark

				const hue = Math.floor((x / canvas.width) * 360 * spectrumColorFactor);
				const lum = (x) => clamp((1 - Math.abs((x - (360/360)) * 1))**2 , 0, 1);

				const dx = (r - 0.475) / blueWidth;
				const d = (2 + Math.max(0, blueLight-dx*dx)) / 2;
				const l = fade
					? 50 //* lum(i*frequencyZoom/bufferLength) //* d
					: 35;

				//const l = 50;

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

			canvasCtx.fillStyle = getCSSvar('--border-color');
			for (let x = 0; x < canvas.width; octaveStep, x+=octaveStep) {
				canvasCtx.fillRect(Math.floor(octaveOffset + x), canvas.height - 2, 1, 1);
			}
		}

		self.running = true;
		draw();

		return analyser;
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
		if (DEBUG.STORAGE) console.log('Saving settings to localStorage: %c' + STORAGE_KEY, 'color:#c40');
		const data = { fade };
		const json = JSON.stringify(data);
		localStorage.setItem(STORAGE_KEY, json);
	}

	this.loadSettings = function() {
		if (DEBUG.STORAGE) console.log('Loading settings from localStorage: %c' + STORAGE_KEY, 'color:#47f');
		const json = localStorage.getItem(STORAGE_KEY);
		if (json) {
			const values = JSON.parse(json);
			if (fade === undefined) fade = values.fade;
		}
	}

	this.clearSettings = function() {
		localStorage.removeItem(STORAGE_KEY);
		if (DEBUG.STORAGE) console.log('Storage cleared: %c' + STORAGE_KEY, 'color:red');
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.instanceNr = ++instanceNr;

	this.exit = function() {
		self.running = false;
		audioSource.disconnect(self.output);
		self.output.disconnect();

		if (!DEBUG.CLEAR_STORAGE) self.saveSettings();
		if (DEBUG.ENABLED) console.log('SpectrumAnalyser: exit', self.instanceNr);
	}

	this.init = function() {
		if (DEBUG.CLEAR_STORAGE) {
			self.clearSettings();
		} else {
			//... Breaks playlist remembering setting
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		}

		self.paused = false;
		self.output = self.startAnalyser(audioSource, canvas, fade);
		canvas.classList.toggle('fade', fade);
	}

	self.init();
}


//EOF
