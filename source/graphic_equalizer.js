// graphic_equalizer.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG } from './main.js';
import { clamp, newElement } from './helpers.js';

const STORAGE_KEY      = 'earwiggleGraphicEqualizer';
const FREQUENCY_MIN    = 20;
const FREQUENCY_MAX    = 16000;   // Max. 22050
const FREQUENCY_CURVE  = 1;       // c < 1: Base separated more (16, 98, 352...), c > 1: Bases closer (16, 64, 237...)
const BAND_SLIDER_STEP = 0.1;     // Change of range input value [-1..+1] with mouse wheel

const CHAIN_LENGTH     = 8;       // Nr. chained filters per band, increases EQ effectiveness and CPU load
const FILTER_GAIN      = 2;       // Factor for gain value of the filters, increases EQ effectiveness, default 1
const Q_FACTOR         = 1;       // Tweak band width of the filters, q > 1: narrow, q < 1: broad
const FILTER_Q         = 1.4;     //... Now dynamic

export function GraphicEqualizer(audioContext, source, rangeInputs, freqSpans, loadConfig) {
	const self = this;

	this.filters;
	this.output;

	this.scaleMode = [
		'linear'   ,   // Apply slider value to filter directly
		'sensitive',   //
		'dull'     ,   // Fine control around the center
	][0];


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SET FILTER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function set_filter(band, value) {
		for (let f = 0; f < CHAIN_LENGTH-1; f++) {
			switch (self.scaleMode) {
				case 'linear': {
					self.filters[band][f].gain.value = FILTER_GAIN * value;
					break;
				}
				case 'sensitive': {
					self.filters[band][f].gain.value = (FILTER_GAIN * Math.sqrt(value)) || 0;
					break;
				}
				case 'dull': {
					self.filters[band][f].gain.value = FILTER_GAIN * value**2 * Math.sign(value);
					break;
				}
			}
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// UI EVENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function on_band_input(event) {
		const input = event.target;
		const index = parseInt(input.dataset.index);
		set_filter(index, parseFloat(input.value));
	}

	function on_band_wheel(event) {
		event.preventDefault();

		const step  = BAND_SLIDER_STEP;
		const sign  = -Math.sign(event.deltaY);
		const value = parseFloat(event.target.value);
		event.target.value = clamp(value + step*sign, -1, +1);

		on_band_input(event);
	}

	function on_band_reset(event) {
		if (event.shiftKey === true || event.ctrlKey == true || event.button === 1) {
			return;
		}

		switch (event.button) {
			case 0: {
				return;
			}
			case 1: {
				self.reset();
				break;
			}
			case 2: {
				event.target.value = 0;
				on_band_input(event);
				break;
			}
		}

		event.preventDefault();
	}

	function prevent_context_menu(event) {
		if (event.shiftKey === true || event.ctrlKey === true) {
			return;
		}

		event.preventDefault();
	}


	this.reset = function() {
		rangeInputs.forEach((input, index) => {
			input.value = 0;
			set_filter(index, 0);
		});
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// LOCAL STORAGE
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.saveSettings = function() {
		if (DEBUG) console.log('Saving settings to localStorage: %c' + STORAGE_KEY, 'color:#c40');
		const data = [...rangeInputs].map(input => parseFloat(input.value));
		const json = JSON.stringify(data);
		localStorage.setItem(STORAGE_KEY, json);
	}

	this.loadSettings = function() {
		if (DEBUG) console.log('Loading settings from localStorage: %c' + STORAGE_KEY, 'color:#47f');

		const json = localStorage.getItem(STORAGE_KEY);
		if (json) {
			const values = JSON.parse(json);
			values.forEach((value, index) => {
				set_filter(index, value);
				rangeInputs[index].value = value;
			});
		}
	}

	this.clearSettings = function() {
		localStorage.removeItem(STORAGE_KEY);
		if (DEBUG) console.log('Settings cleared: %c' + STORAGE_KEY, 'color:red');
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function() {
		if (DEBUG) console.log('GraphicEqualizer: exit');

		source.disconnect(self.filters[0]);
		for (let b = 0; b < self.nrBands; b++) {
			for (let f = 0; f < CHAIN_LENGTH; f++) {
				self.filters[b][f].disconnect();
			}
		}
		self.output.disconnect();

		rangeInputs.forEach(i => {
			i.removeEventListener('input'      , on_band_input);
			i.removeEventListener('wheel'      , on_band_wheel);
			i.removeEventListener('mousedown'  , on_band_reset);
			i.removeEventListener('contextmenu', prevent_context_menu);
		});
		removeEventListener('beforeunload', self.saveSettings);

		self.saveSettings();
	}

	this.init = function() {
		if (DEBUG) console.log('GraphicEqualizer source:', source.channelCount, 'channels');

		self.nrBands = rangeInputs.length;

		// Calculate frequencies and Q-values for the bands, separation can be controlled with FREQUENCY_CURVE
		const n    = self.nrBands;
		const fMin = FREQUENCY_MIN;
		const fMax = FREQUENCY_MAX
		const c    = FREQUENCY_CURVE;
		const f    = 1 / 2**(n-1);

		const toFrequency = (_, i) => {
			const x1 = (2**i) / 2**(n-1);
			const x2 = (x1 - f) / (1 - f);
			const r = fMin + (fMax-fMin) * x2**c;
			return Math.round(r);
		}
		const frequencies = Array.from({ length: n }).map(toFrequency);
		if (DEBUG) console.log('GraphicEqualizer frequencies:', frequencies);

		const toQValue = (_, i) => Math.sqrt(i > 0 ? frequencies[i] / frequencies[i - 1] : 1) * Q_FACTOR;
		const QValues = frequencies.map(toQValue);

		// Create all filters
		if (DEBUG) console.groupCollapsed(
			'GraphicEqualizer: Creating',
			self.nrBands,
			'*',
			CHAIN_LENGTH,
			'=',
			self.nrBands * CHAIN_LENGTH,
			'filters',
		);

		self.filters = Array.from({ length: self.nrBands });
		for (let b = 0; b < self.nrBands; b++) {
			self.filters[b] = [];
			for (let f = 0; f < CHAIN_LENGTH; f++) {
				const filter = audioContext.createBiquadFilter();
				if (DEBUG) console.log(filter);
				filter.type            = 'peaking';
				filter.frequency.value = frequencies[b];
				filter.gain     .value = 0;
				filter.Q        .value = QValues[b]; //FILTER_Q;
				self.filters[b].push(filter);
			}
		}
		if (DEBUG) console.groupEnd();

		self.output = audioContext.createGain();

		source.connect(self.filters[0][0]);
		for (let b = 0; b < self.nrBands-1; b++) {
			for (let f = 0; f < CHAIN_LENGTH-1; f++) {
				self.filters[b][f].connect(self.filters[b][f + 1]);
			}
			self.filters[b][CHAIN_LENGTH - 1].connect(self.filters[b + 1][0]);
		}
		for (let f = 0; f < CHAIN_LENGTH-1; f++) {
			self.filters[self.nrBands - 1][f].connect(self.filters[self.nrBands - 1][f + 1]);
		}
		self.filters[self.nrBands - 1][CHAIN_LENGTH - 1].connect(self.output);


		// Event handlers

		rangeInputs.forEach((r, i) => {
			r.dataset.index = i;
			r.addEventListener('input'      , on_band_input);
			r.addEventListener('wheel'      , on_band_wheel);
			r.addEventListener('mousedown'  , on_band_reset);
			r.addEventListener('contextmenu', prevent_context_menu);

			const span = freqSpans[i];
			const f = frequencies[i];
			if (f <= 100) {
				span.innerText = f;
			}
			else if (f > 100 && f < 1000) {
				span.innerText = Math.round(f / 5)*5;
			}
			else {
				span.innerText = Math.round(f / 1000) + 'K';
			}

			set_filter(i, parseFloat(r.value));
		});

		if (loadConfig !== false) {
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		} else {
			self.clearSettings();
		}

		if (DEBUG) window.EQ = {
			load  : self.loadSettings,
			save  : self.saveSettings,
			clear : self.clearSettings,
			reset : self.reset,
		};
	}

	self.init();
}


//EOF
