// waveform.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG } from './main.js';
import { clamp, newElement, getCSSVariable, format_time } from './helpers.js';

const HOLLOW_INDICATOR = false;

export function Waveform(audioContext, audioElement, canvas) {
	const self = this;

	this.abortController;

	this.canvasContext;

	this.rendering;
	this.cachedCanvas;
	this.hollowIndicator;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROGRESS INDICATOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.saveCanvas = function() {
		const ctx = self.canvasContext;
		self.cachedCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
	}

	this.restoreCanvas = function() {
		const ctx = self.canvasContext;
		ctx.putImageData(self.cachedCanvas, 0, 0);
	}


	this.showProgress = function(ratio) {
		//...if (!canvas.checkVisibility()) return;

		self.restoreCanvas();
		const x = Math.floor((canvas.width - 1) * ratio);
		const h = canvas.height;
		const ctx = self.canvasContext;

		if (self.hollowIndicator) {
			self.canvasContext.fillStyle = getCSSVariable('--waveform-progress-shadow');
			self.canvasContext.fillRect(x-3, 0, 2, h);
			self.canvasContext.fillRect(x+2, 0, 2, h);

			self.canvasContext.fillStyle = getCSSVariable('--waveform-progress-color');
			self.canvasContext.fillRect(x-2, 2, 1, h-4);
			self.canvasContext.fillRect(x+2, 2, 1, h-4);

			self.canvasContext.fillRect(x-1,   1, 1, 1);
			self.canvasContext.fillRect(x+1,   1, 1, 1);
			self.canvasContext.fillRect(x-1, h-2, 1, 1);
			self.canvasContext.fillRect(x+1, h-2, 1, 1);

			self.canvasContext.fillRect(x,   0, 1, 1);
			self.canvasContext.fillRect(x, h-1, 1, 1);
		} else {
			self.canvasContext.fillStyle = getCSSVariable('--waveform-progress-shadow');
			self.canvasContext.fillRect(x-3, 0, 1, h);
			self.canvasContext.fillRect(x+3, 0, 1, h);

			self.canvasContext.fillStyle = getCSSVariable('--waveform-progress-color');
			self.canvasContext.fillRect(x-1, 0, 1, h);
			self.canvasContext.fillRect(x+1, 0, 1, h);

			self.canvasContext.fillRect(x-3, 0, 1, 1.5);
			self.canvasContext.fillRect(x-2, 0, 1, 3  );
			self.canvasContext.fillRect(x+2, 0, 1, 3  );
			self.canvasContext.fillRect(x+3, 0, 1, 1.5);

			self.canvasContext.fillRect(x-3, h-1.5, 1, 1.5);
			self.canvasContext.fillRect(x-2, h-3  , 1, 3  );
			self.canvasContext.fillRect(x+2, h-3  , 1, 3  );
			self.canvasContext.fillRect(x+3, h-1.5, 1, 1.5);
		}
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// RENDER
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.reset = function() {
		const ctx = self.canvasContext;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = getCSSVariable('--waveform-empty-color-1');
		ctx.fillRect(0, Math.floor(canvas.height / 2), canvas.width, 1);

		const midY = canvas.height / 2;
		ctx.fillStyle = getCSSVariable('--waveform-empty-color-1');
		const y = (x, f) => Math.sin(x / canvas.width * Math.PI * f) * midY * 0.8;
		for (let x = 0; x < canvas.width; x++) {
			const y0 = y(x, 4); ctx.fillRect(x, midY-y0, 1, 2*y0);
			const y1 = y(x, 7); ctx.fillRect(x, midY-y1, 1, 2*y1);
		}

		self.saveCanvas();
		self.showProgress(0);
	}

	this.showError = function() {
		const ctx = self.canvasContext;
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

	this.render = async function() {
		if (self.abortController) {
			// User skipped to another song while we were loading
			if (DEBUG) console.log('Waveform aborting fetch:', audioElement.src);
			self.abortController.abort();
		}

		self.abortController = new AbortController();
		let response = null;
		try {
			if (DEBUG) console.log('Waveform re-fetching:', audioElement.src);

			response = await fetch(
				audioElement.src,
				{ signal: self.abortController.signal },
			).catch(wiggleREJECT);

			if (DEBUG) console.log('Waveform response:', response);
		}
		catch (e) {
			console.error(`Error while fetching ${audioElement.src}`);
			self.abortController = null;
			return;
		}
		self.abortController = null;

		const audioData = await response.arrayBuffer().catch(wiggleREJECT);
		const buffer    = await audioContext.decodeAudioData(audioData).catch(wiggleREJECT);

		const is_stereo = buffer.numberOfChannels >= 2;
		if (buffer.numberOfChannels > 2 || buffer.numberOfChannels < 1) console.error(
			'Unexpected number of channels:' + buffer.numberOfChannels,
		);

		const leftChannel  = buffer.getChannelData(0);
		const rightChannel = buffer.getChannelData(is_stereo ? 1 : 0);

		const maxX  = canvas.width;
		const midY  = Math.floor(canvas.height / 2);

		const samplesPerPixel = buffer.length / maxX;

		const ctx = self.canvasContext;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const left_color_max  = getCSSVariable('--waveform-left-color-max');
		const left_color_avg  = getCSSVariable('--waveform-left-color-avg');
		const right_color_max = getCSSVariable('--waveform-right-color-max');
		const right_color_avg = getCSSVariable('--waveform-right-color-avg');

		let last_update_time = Date.now();
		for (let x = 0; x < maxX; x++) {
			const tOffset = Math.floor(x * samplesPerPixel);

			let sumLeft = 0;
			let sumRight = 0;
			let maxLeft = 0;
			let maxRight = 0;
			for (let t = 0; t < samplesPerPixel; t++) {
				const i = tOffset + t;
				const left  = Math.abs(leftChannel[i]);
				const right = Math.abs(rightChannel[i])
				if (left  > maxLeft ) maxLeft  = left;
				if (right > maxRight) maxRight = right;
				sumLeft  += left;
				sumRight += right;
			}
			const yMaxLeft  = maxLeft  * midY;
			const yMaxRight = maxRight * midY;
			ctx.fillStyle = is_stereo ? left_color_max : right_color_max;
			ctx.fillRect(x, midY - yMaxLeft, 1, yMaxLeft);
			ctx.fillStyle = right_color_max;
			ctx.fillRect(x, midY, 1, yMaxRight);

			const yAvgLeft  = sumLeft  / samplesPerPixel * midY * 3;
			const yAvgRight = sumRight / samplesPerPixel * midY * 3;
			ctx.fillStyle = is_stereo ? left_color_avg : right_color_avg;
			ctx.fillRect(x, midY - yAvgLeft, 1, yAvgLeft);
			ctx.fillStyle = right_color_avg;
			ctx.fillRect(x, midY, 1, yAvgRight);

			/*//... self.rendering logic missing
			const elapsed_ms = Date.now() - last_update_time;
			if (elapsed_ms > 20) {
				await new Promise(done => setTimeout(done, 100));
				last_update_time = Date.now();
			}
			*/
		}

		self.saveCanvas();
	}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	this.exit = function() {
	}

	this.init = async function() {
		self.cachedCanvas = null;
		self.rendering    = false;

console.group('Waveform.init');
console.log(canvas.width, canvas.offsetWidth);
console.log(canvas.height, canvas.offsetHeight);
console.groupEnd();

		canvas.width  = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;

		// Lying to the browser about willReadFrequently to make it shut up
		self.canvasContext = canvas.getContext('2d', { willReadFrequently: !true });
		//... Not required for fillRect: self.canvasContext.translate(0.5, 0.5);

		self.hollowIndicator = false;
		self.reset();
		self.showProgress(0);

		audioElement.addEventListener('canplaythrough', this.render);
	}

	return self.init().then(() => self);   // const waveform = await new Waveform();
}


//EOF
