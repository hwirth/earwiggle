// helpers.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

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
			newElement.dataset[key] = value;
		});
	}

	if (definition.events) {
		Object.entries(definition.events).forEach(([key, value]) => {
			newElement.addEventListener(key, value);
		});
	}

	return newElement;
}

export const getCSSvar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name);
export const setCSSvar = (name, value) => document.documentElement.style.setProperty(name, value);

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

export function extensionJpg(filename) {
	return filename.replace(/\.[^/.]+$/, '.jpg');
}



export function prefersReducedMotion() {
	return false && (
		window.matchMedia('(prefers-reduced-motion: reduce)') === true
		|| window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
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
	if (enable === null) enable = !wake_lock;

	const method    = enable ? 'request' : 'release';
	const parameter = enable ? undefined : wake_lock;

	if ('wakeLock' in navigator) try {
		if (enable) {
			wake_lock = navigator.wakeLock.request();
			document.body.classList.add('wake_lock');
		} else {
			wake_lock.then(wl => wl.release());
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
	console.log('wakeLock:', wake_lock);
}

//EOF
