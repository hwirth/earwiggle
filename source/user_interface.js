// user_interface.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { untab } from './helpers.js';

export const UserInterface = function(parameters) {
	const self = this;

	const { SETTINGS, DEBUG } = parameters;
	const { DOM_SELECTORS } = SETTINGS;

	this.initialized = false;

	this.elements;

	const DOM_META =  {};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// VISIBILITY CONTROL
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.toggleSegment = function (element_name, enable = null) {
		switch (element_name) {
			case 'now_playing': {
				break;
			}
			case 'controls': {
				break;
			}
			case 'waveform': {
				break;
			}
			case 'equalizer': {
				break;
			}
			case 'spectrum_analyser': {
				break;
			}
			case 'albumlist': {
				break;
			}
			case 'filter': {
				break;
			}
			case 'playlist': {
				break;
			}
		}
	}

	this.togglePressed = function (element_name, enable = null) {
		if (enable === null) enable = !self.elements[element_name].classList.contains('pressed');
		self.elements[element_name].classList.toggle('pressed', enable);
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SEGMENTS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	DOM_META.CONTROLS = {
		name: 'controls',
		enabledButtons: ['stop', 'advanced', 'loop_list']
	};


	this.newControls = function() {
	}

	this.newWaveForm = function() {
	};

	this.newEqualizer = function() {
	}

	this.newAnalyser = function() {
	}

	this.newFilterForm = function() {
	}

	this.newAlbumList = function() {
	}

	this.newPlayList = function() {
	};

	this.newNowPlaying = function() {
	}

	this.newLyrics = function() {
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function() {
		self.initialized = false;
	}

	this.init = async function() {
		if (self.initialized) self.exit();

		self.elements = {};
		Object.entries(DOM_SELECTORS).forEach(([key, selector]) => {
			if (selector.slice(0, 4) == 'ALL ') {
				self.elements[key] = document.querySelectorAll(selector.slice(4));
			} else {
				self.elements[key] = document.querySelector(selector);
			}
		});


		self.initialized = true;
	}


	return self.init().then(() => self);   // const ui = await new UserInterface();
}


//EOF
