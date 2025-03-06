// graphic_equalizer.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { clamp, newElement } from './helpers.js';

let instanceNr = 0;

export function GraphicEqualizer(parameters) {
	const self = this;

	const {
		SETTINGS, DEBUG,
		audioContext, source, container, rangeInputs, freqSpans,
		clearConfig,
	 } = parameters;

	const {
		STORAGE_KEY,
		BAND_SLIDER_STEP, Q_FACTOR,
		FREQUENCY_CURVE, FREQUENCY_MIN, FREQUENCY_MAX,
		CHAIN_LENGTH, FILTER_GAIN, FILTER_Q,
	} = SETTINGS.GRAPHIC_EQUALIZER;

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
		if (event.button != 2 || event.ctrlKey || event.altKey) return;

		if (event.shiftKey) {
			self.reset();
		} else {
			event.target.value = 0;
			on_band_input(event);
		}
	}

	function prevent_context_menu(event) {
		if (event.target.type == 'range') {
			event.preventDefault();   // Don't interfere with on_band_reset
		}
	}


	function on_touchmove(event) {
		if (event.target.tagName != 'INPUT') {
			//... Kills ALL touch. We need to just not scroll
			//...event.preventDefault();
		}
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
		if (DEBUG.STORAGE) console.log(
			'%cSaving settings%c to localStorage: ' + STORAGE_KEY, 'color:#c40', 'color:unset',
		);

		const data = [...rangeInputs].map(input => parseFloat(input.value));
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
			values.forEach((value, index) => {
				set_filter(index, value);
				rangeInputs[index].value = value;
			});
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
		source.disconnect(self.filters[0]);
		for (let b = 0; b < self.nrBands; b++) {
			for (let f = 0; f < CHAIN_LENGTH; f++) {
				self.filters[b][f].disconnect();
			}
		}
		self.output.disconnect();

		container.removeEventListener('touchmove'  , on_touchmove);
		rangeInputs.forEach(i => {
			i.removeEventListener('input'      , on_band_input);
			i.removeEventListener('wheel'      , on_band_wheel);
			i.removeEventListener('mousedown'  , on_band_reset);
			i.removeEventListener('contextmenu', prevent_context_menu);
		});
		removeEventListener('beforeunload', self.saveSettings);

		if (!clearConfig) self.saveSettings();
		if (DEBUG.INSTANCES) console.log('GraphicEqualizer: exit', self.instanceNr);
	}

	this.init = function() {
		if (DEBUG.STREAMS) console.log('GraphicEqualizer source:', source.channelCount, 'channels');

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
		if (DEBUG.GRAPHIC_EQUALIZER) console.log('GraphicEqualizer frequencies:', frequencies);

		const toQValue = (_, i) => Math.sqrt(i > 0 ? frequencies[i] / frequencies[i - 1] : 1) * Q_FACTOR;
		const QValues = frequencies.map(toQValue);

		// Create all filters
		if (DEBUG.EQ_FILTERS) console.groupCollapsed(
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
				if (DEBUG.EQ_FILTERS) console.log(filter);
				filter.type            = 'peaking';
				filter.frequency.value = frequencies[b];
				filter.gain     .value = 0;
				filter.Q        .value = QValues[b]; //FILTER_Q;
				self.filters[b].push(filter);
			}
		}
		if (DEBUG.EQ_FILTERS) console.groupEnd();

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

		container.addEventListener('touchmove', on_touchmove);

		rangeInputs.forEach((r, i) => {
			r.dataset.index = i;
			r.addEventListener('input'      , on_band_input);
			r.addEventListener('mousedown'  , on_band_reset);
			r.addEventListener('contextmenu', prevent_context_menu);

			if (SETTINGS.CUSTOM_SLIDERS.WHEEL_EQ) {
				r.addEventListener('wheel', on_band_wheel);
			}

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

		if (clearConfig) {
			self.clearSettings();
		} else {
			self.loadSettings();
			addEventListener('beforeunload', self.saveSettings);
		}

		if (DEBUG.ENABLED) window.EQ = {
			load  : self.loadSettings,
			save  : self.saveSettings,
			clear : self.clearSettings,
			reset : self.reset,
		};
	}

	self.init();
}


//EOF
