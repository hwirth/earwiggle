// helpers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


if (!HTMLCanvasElement.prototype.checkVisibility) {
	HTMLCanvasElement.prototype.checkVisibility = function() {
		const rect = this.getBoundingClientRect();
		return (
			rect.top >= 0
			&& rect.left >= 0
			&& rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
			&& rect.right <= (window.innerWidth || document.documentElement.clientWidth)
		);
	};
}



export const GETParams = new window.URLSearchParams(window.location.search);

export function is_set (variable) {
	return (typeof variable != 'undefined');

}

export function is_bool (variable) {
	return (typeof variable == 'boolean');

}

export function clamp (value, min, max) {
	return Math.min( max, Math.max( min, value ));

}

export function untab(string) {
	const to_untabbed = (s) => s.replaceAll('\t', '');
	const lines = '\n';
	return string.trim().split(lines).map(to_untabbed).join(lines);
}

export function ucFirst(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

export function newElement(definition) {
	if (definition.tagName == undefined) {
		console.error('newElement without tagName:', definition);
		debugger;
	}

	const newElement = document.createElement(definition.tagName);

	if (definition.className) newElement.className = definition.className;
	if (definition.innerHTML) newElement.innerHTML = definition.innerHTML;
	if (definition.innerText) newElement.innerHTML = definition.innerText;

	if (definition.children) newElement.append(...definition.children);

	if (definition.attributes) {
		Object.entries(definition.attributes).forEach(([key, value]) => {
			newElement.setAttribute(key, value);
		});
	}

	if (definition.dataset) {
		Object.entries(definition.dataset).forEach(([key, value]) => {
			if (value !== undefined) {
				newElement.dataset[key] = value;
			}
		});
	}

	if (definition.events) {
		Object.entries(definition.events).forEach(([key, value]) => {
			newElement.addEventListener(key, value);
		});
	}

	return newElement;
}

export const getCSSvar = (name, target = document.documentElement) => getComputedStyle(target).getPropertyValue(name);
export const setCSSvar = (name, value, target = document.documentElement) => target.style.setProperty(name, value);

export function triggerDownload(content, filename, mimeType = 'application/octet-stream') {
	const blob = new Blob([content], { type: 'application/octet-stream' });
	const url = URL.createObjectURL(blob);

	const link = newElement({
		tagName : 'a',
		attributes : {
			href     : url,
			download : filename,
		},
	});

	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function format_time(time) {
	if (isNaN(time)) return '--:--:--.-';

	const hours   = Math.floor(time / 3600);
	const minutes = Math.floor(time / 60) % 60;
	const seconds = Math.floor(time) % 60;
	const tenths  = Math.floor((time * 10) % 10);
	return (
			(hours   < 10 ? '0'+hours   : hours  )
		+ ':' + (minutes < 10 ? '0'+minutes : minutes)
		+ ':' + (seconds < 10 ? '0'+seconds : seconds)
		+ '.' + tenths
	);
}

export function changeFileExtension(filename, extension = '.jpg') {
	return filename.replace(/\.[^/.]+$/, extension);
}

export function prefersReducedMotion() {
	const test = `(prefers-reduced-motion: reduce)`;
	return window.matchMedia(test) === true || window.matchMedia(test).matches;
/*
	return (
		window.matchMedia('(prefers-reduced-motion: reduce)') === true
		|| window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
*/
}

export function prefersColorScheme(scheme = 'dark') {
	const test = `(prefers-color-scheme: ${scheme})`;
	return window.matchMedia(test) === true || window.matchMedia(test).matches;
}

export function isMobileDevice() {
	//... Not reliable. Let's hope we get a real API for this in the future
	return (
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
	);
}

export function isSafari() {
	//... Not reliable. Let's hope we get a real API for this in the future
	return (
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
	);
}

let wake_lock = null;
export async function wakeLock(enable = null) {
	if (!!wake_lock == enable) return;
	if (enable === null) enable = !wake_lock;

	const method    = enable ? 'request' : 'release';
	const parameter = enable ? undefined : wake_lock;

	if ('wakeLock' in navigator) try {
		if (enable) {
			wake_lock = navigator.wakeLock.request();
			document.body.classList.add('wake_lock');
		} else {
			wake_lock?.then(wl => wl.release());
			wake_lock = null;
			document.body.classList.remove('wake_lock');
		}
	} catch (error) {
		console.log('%cwakeLock failed:', 'color:red', method, error);
		wake_lock = null;
		console.error('Wakelock failed ' + method);
		document.body.classList.remove('wake_lock');
	}

	document.body.classList.toggle('wake_lock', wake_lock && !wake_lock?.released);
	//...console.log('>>> helpers: wakeLock:', wake_lock);

	return wake_lock;
}


export function renderDebugDots(canvas, ctx) {
	const [w, h] = [canvas.width, canvas.height];
	ctx.fillStyle = '#fc0';
	for (let x = 0; x < w; x++) {
		//ctx.fillStyle = x % 2 ? '#08f' : '#fc0';
		//ctx.fillRect(x,   0, 1, 1);
		//ctx.fillRect(x, h-1, 1, 1);
		for (let y = 0; y < w; y++) {
			//ctx.fillStyle = y % 2 ? '#08f' : '#fc0';
			//ctx.fillRect(  0, y, 1, 1);
			//ctx.fillRect(w-1, y, 1, 1);
			ctx.fillStyle = (y % 2 + x % 2) ? '#000' : '#fc0';
			ctx.fillRect(  x, y, 1, 1);
		}
	}
}


//EOF
