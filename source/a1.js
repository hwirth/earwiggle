// spectrum_analyser.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { clamp, newElement, getCSSVariable } from './helpers.js';

let instanceNr = 0;

export function SpectrumAnalyser(parameters) {
	const self = this;

	const {
		SETTINGS, DEBUG,
		audioContext, audioSource,
		canvas, fade,
		loadConfig,
	} = parameters;
	const { STORAGE_KEY, TOP_FREQ, MIN_DECIBELS, MAX_DECIBELS  } = parameters.SETTINGS.SPECTRUM_ANALYSER;

	this.stream;
	this.running;
	this.paused;
	this.output;

	this.startAnalyser = function(stream, canvas, fade) {
		// This assumes canvas.style = transform:scaleY(-1)
		if (!getComputedStyle(canvas).transform) console.error(
			'You probably want to set transform:scaleY(-1) on the canvas for the spectrum analyser',
		);

		const fftSize          = (fade ? 512*TOP_FREQ : 32) * 4;   // Nr. bands
		const binLengthFactor  = (fade ? 1/TOP_FREQ  : 1 );
		const barWidthFactor   = (fade ? 2       : 1.01  );
		const barHeightFactor  = (fade ? 0.75    : 0.9   );
		const barGap           = (fade ? 0       : 1     );
		const peakHeight       = (fade ? 1       : 1     );
		const peakOffset       = (fade ? -1      : -1    );   // -1: bars 1px down, prevent gap below "flames"
		const peakColor        = (fade ? '#fff'  : '#fff');
		const fillColor        = '#00000006';
		//...const luminosity       = 25;
		const fadeOffsetX      = 0;
		const fadeOffsetY      = 0.5;
		const fullDecaySeconds = 3;

		const analyser = audioContext.createAnalyser();
		analyser.maxDecibels = MIN_DECIBELS;
		analyser.minDecibels = MAX_DECIBELS;
		stream.connect(analyser);
	/*//...
		const ratio = (
			window.devicePixelRatio /
			(document.createElement('canvas').getContext('2d').backingStorePixelRatio || 1)
		);
		const style = getComputedStyle(canvas);
		const borderPadding = (parseInt(style.borderWidth) + parseInt(style.paddingLeft)) * 2 * ratio;
	*/
		const ratio = 1;
		const borderPadding = 4;

		canvas.setAttribute('width', canvas.width  = canvas.offsetWidth * ratio - borderPadding);
		canvas.setAttribute('height', canvas.height = canvas.offsetHeight * ratio - borderPadding);

		const ctx = canvas.getContext('2d', {alpha: true} );
		//...?? NOT needed?? //...ctx.translate(0.5, 0.5);

		analyser.fftSize   = fftSize;
		const bufferLength = Math.floor(analyser.frequencyBinCount * binLengthFactor);
		const dataArray    = new Uint8Array(bufferLength);

		const barMax = Array(bufferLength).fill(0);
		const heightConvert = canvas.height / 256/*1 byte*/ * barHeightFactor;

		const nrOctaves    = Math.log2(audioContext.sampleRate / 20);
		const octaveStep   = canvas.width / nrOctaves;
		const octaveOffset = (canvas.width - octaveStep * Math.floor(nrOctaves)) / 2;

		function fade_alpha() {
			// Fade dark areas
			const [w, h]    = [canvas.width, canvas.height];
			const imgData   = ctx.getImageData(0, 0, w, h);
			const data      = imgData.data;
			const nr_pixels = w*h;

			//ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (let i=0, y=0 ; y < 1+canvas.height ; y++) {
				for (let x=0 ; x < canvas.width ; x++, i+=4) {
					const j = i//(nr_pixels - 1) - (i + w);

					const f = 8;
					const R = Math.max(0, data[j + 0] - f);
					const G = Math.max(0, data[j + 1] - f*1);
					const B = Math.max(0, data[j + 2] - f*1);
					const A = data[j + 3];

					const lum = (R+G+B)/3;

					data[i + 0] = R;
					data[i + 1] = G;
					data[i + 2] = B;
					data[i + 3] = 64; //clamp(lum - 64, 64, 255);
				}
			}

			ctx.putImageData(imgData, 0, 0);
		}

		let lastTime = 0;
		function draw(timestamp) {
			if (!self.running) return;

			requestAnimationFrame(draw);

			if (self.paused) return;
			//...if (!canvas.checkVisibility()) return;

			const elapsedSeconds = (timestamp - lastTime) / 1000 / fullDecaySeconds;
			lastTime = timestamp;
			const reduceMax = fade ? 1 : (canvas.height * elapsedSeconds) || 0;

			analyser.getByteFrequencyData(dataArray);

			if (fade) {
				ctx.drawImage(canvas, fadeOffsetX, fadeOffsetY);
				fade_alpha();
				//ctx.fillStyle = fillColor;
				//ctx.fillRect(0, 0, canvas.width, canvas.height);
			} else {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
			}

			const barWidth = (canvas.width / bufferLength) * barWidthFactor;

			const scaleFactor = Math.log10(256) / 255;
			const scaleValueA = y => Math.log10(y + 1) / scaleFactor;   // Highlight base
			const scaleValueB = y => (y / 255)**2 * 255;                // Highlight treble
const luminosity = fade ? 35 : 40;
const saturation = 33;
			for (let i = 0, x = 0; i < bufferLength; i++, x += barWidth+barGap) {
	//if (!fade || fade && (Math.floor(i/4) % 2)) {
				const bh = scaleValueB(dataArray[i]) * heightConvert - peakOffset;
				const barHeight = canvas.height * 0.1 + bh;

				let hue = Math.floor((i / bufferLength) * 360 * barWidthFactor);
				//...ctx.fillStyle = `hsl(${hue}deg ${saturation}% ${luminosity * 0}%)`;
				//...ctx.fillStyle = '#0488';
			/*
				hue = Math.floor(
					(150 + hue/6) % 360
				);
			*/
				ctx.fillStyle = `hsl(${hue}deg 100% ${luminosity}%)`;
				ctx.fillRect(x, peakOffset, barWidth, Math.floor(barHeight));

				ctx.fillStyle = peakColor;
				const y = Math.floor(barMax[i]);
				ctx.fillRect(x, y + peakOffset, barWidth, peakHeight);

				barMax[i] = Math.max(1, barMax[i] - reduceMax, barHeight);
	//}
			}

			ctx.fillStyle = getCSSVariable('--border-color');
			for (let x = 0; x < canvas.width; octaveStep, x+=octaveStep) {
				ctx.fillRect(Math.floor(octaveOffset + x), canvas.height - 2, 1, 1);
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
