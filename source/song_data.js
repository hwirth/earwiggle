// song_data.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { untab } from './helpers.js';

export const songData = async function(parameters) {
	const { SETTINGS, DEBUG } = parameters;

	const urls = [
		'../../sites/oe/diary/?page=11',
		'../../sites/oe/diary/?page=13',
		'../../sites/oe/diary/?page=16',
	];

	async function loadPoem(fileName) {
		const response = await fetch(fileName);
		const html     = await response.text();

		const parser = new DOMParser();
		const newDocument = parser.parseFromString(html, 'text/html');
		const poem = newDocument.querySelector('.poem');
		return untab(poem.innerText);
	}

	const no_annotaions = (prev, line) => (line[0] == '[') ? prev : [...prev, line];
	const reduced = text => text.split('\n').reduce(no_annotaions, []).join('\n').replaceAll('\n\n\n', '\n\n');

	const load = (url) => new Promise(done => loadPoem(url).then(done));
	const lyrics = (await Promise.all(urls.map(load))).map(reduced);

	const data = {
		songs: [
			{
				duration : 5*60+38,
				artist   : 'Harry Furios',
				album    : 'Orchestronica Classica',
				title    : 'Für Chris',
				image    : 'psionic_guitar.png',
				url      : 'music/Fuer_Chris_lo.mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FL_Studio" target="_blank">Fruity Loops 3.5</a>',
			},
			{
				duration : 2*60+48,
				artist   : 'Harry Furios',
				album    : 'Orchestronica Furiosa',
				title    : 'Mule 2000',
				image    : 'orchestronica_furiosa.png',
				url      : 'music/mule2k.mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FL_Studio" target="_blank">Fruity Loops 3.5</a>',
				fadeStart  : 4,
				fadeLength : 2,
			},
			{
				duration : 4*60+50,
				artist   : 'Harry Furios',
				album    : 'Orchestronica Furiosa',
				title    : 'Saturn',
				image    : 'orchestronica_furiosa.png',
				url      : 'music/Saturn_hi.mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FL_Studio" target="_blank">Fruity Loops 3.5</a>',
			},
			{
				duration : 16*60+3,
				artist   : 'Harry Furios',
				album    : DEBUG ? 'Technosis' : 'Orchestronica Furiosa',
				title    : 'technosis-19',
				//image    : 'orchestronica_furiosa.png',
				image    : 'technosis.png',
				url      : 'music/technosis-19.mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FL_Studio" target="_blank">Fruity Loops 3.5</a>',
			},
		//
			{
				duration : 7*60+30,
				artist   : 'Harry Furios',
				album    : 'Noise Pollution',
				title    : 'Smalltalk on Acid',
				image    : 'plutonium.png',//'hourglass.png',
				url      : 'music/HarryF%20-%20Smalltalk%20on%20Acid.mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FastTracker_2" target="_blank">Fast Tracker II</a>',
			},
			{
				duration : 3*60+29,
				artist   : 'Harry Furios',
				album    : 'Noise Pollution',
				title    : 'Plutonium (Lea al Tarion)',
				image    : 'plutonium.png',
				url      : 'music/HarryF%20-%20Plutonium%20(Lea%20al%20Tarion).mp3',
				comments : '<a href="https://en.wikipedia.org/wiki/FastTracker_2" target="_blank">Fast Tracker II</a>',
			},
			{
				duration : 8*60+35,
				artist   : 'Harry Furios',
				album    : 'May First',
				title    : 'Soundtrack',
				//image    : 'plutonium.png',
				image    : 'may_first.png',
				url      : 'music/may_first.mp3',
				comments : 'Game music for <a href="https://github.com/hwirth/may_first" target="_blank">May First</a>',
			},
			{
				duration : 9*60+30,
				artist   : 'Harry Furios',
				album    : 'Dbris Corporation',
				title    : 'Pirate Theme',
				image    : 'dbris.png',
				url      : 'music/DBRIS1.mp3',
				comments : 'Game music for <a href="https://harald.ist.org/sites/dbris/" target="_blank">DBRIS</a>',
			},
		//
			{
				duration : 2*60+35,
				artist   : 'Hjalvandar',
				album    : 'Loot, Lag and Love',
				title    : 'Loot and Laughter in Avadon',
				image    : 'loot_and_laughter_in_avadon.jpeg',
				url      : 'music/Loot%20and%20Laughter%20in%20Avadon.mp3',
				lyrics   : lyrics[0],
				comments : '<a href="https://en.wikipedia.org/wiki/Ultima_Online" target="_blank">Ultima Online</a> poems,<br>sonified with <a href="https://suno.com/" target="_blank">Suno <abbr>AI</abbr></a>',
			},
			{
				duration : 2*60+39,
				artist   : 'Hjalvandar',
				album    : 'Loot, Lag and Love',
				title    : 'The Bumbling Battles of the Skittish Squire',
				image    : 'Loot,%20Lag%20and%20Love.webp',
				url      : 'music/The%20Bumbling%20Battles%20of%20the%20Skittish%20Squire.mp3',
				lyrics   : lyrics[1],
				comments : '<a href="https://en.wikipedia.org/wiki/Ultima_Online" target="_blank">Ultima Online</a> poems,<br>sonified with <a href="https://suno.com/" target="_blank">Suno <abbr>AI</abbr></a>',
			},
			{
				duration : 3*60+55,
				artist   : 'Hjalvandar',
				album    : 'Loot, Lag and Love',
				title    : 'The Dragon\'s Vow',
				image    : 'the_dragons_vow.jpeg',
				url      : 'music/The%20Dragon%27s%20Vow.mp3',
				lyrics   : lyrics[2],
				comments : '<a href="https://en.wikipedia.org/wiki/Ultima_Online" target="_blank">Ultima Online</a> poems,<br>sonified with <a href="https://suno.com/" target="_blank">Suno <abbr>AI</abbr></a>',
			},
		//
			{
				duration : 0,
				artist   : 'Earwiggle <abbr>EQ</abbr> Test',
				album    : 'White noise',
				title    : '-6 <abbr>dBFS</abbr>, uniform distribution',
				image    : 'earwiggle_music_player.png',
				url      : 'test/whitenoise_-6dBFS_uniform.wav',
				comments : 'Downloaded from <a href="https://www.audiocheck.net/testtones_whitenoise.php" target="_blank">audiocheck.net</a>',
				loop     : true,
				debug    : true,
			},
			{
				duration : 0,
				artist   : 'Earwiggle <abbr>EQ</abbr> Test',
				album    : 'White noise',
				title    : '0 <abbr>dBFS</abbr>, gaussian distribution',
				image    : 'earwiggle_music_player.png',
				url      : 'test/whitenoise_0dBFS_gaussian.wav',
				comments : 'Downloaded from <a href="https://www.audiocheck.net/testtones_whitenoise.php" target="_blank">audiocheck.net</a>',
				loop     : true,
				debug    : true,
			},
			{
				duration : 0,
				artist   : 'Earwiggle <abbr>EQ</abbr> Test',
				album    : 'Sine sweep',
				title    : '20Hz to 20Khz, linear',
				image    : 'earwiggle_music_player.png',
				url      : 'test/sinesweep_20-20k_linear.ogg',
				comments : 'Downloaded from <a href="https://www.audiocheck.net/testtones_whitenoise.php" target="_blank">audiocheck.net</a>',
				debug    : true,
			},
			{
				duration : 0,
				artist   : 'Earwiggle <abbr>EQ</abbr> Test',
				album    : 'Sine sweep',
				title    : '20Hz to 20Khz, logarithmic',
				image    : 'earwiggle_music_player.png',
				url      : 'test/sinesweep_20-20k_logarithmic.ogg',
				comments : 'Downloaded from <a href="https://www.audiocheck.net/testtones_whitenoise.php" target="_blank">audiocheck.net</a>',
				debug    : true,
			},

			// File upload
			{
				duration : 0,
				artist   : 'Local Files',
				album    : 'Play Your Music',
				title    : '<strong>&uArr; Click to select</strong>',
				image    : 'UPLOAD_FILE.png',
				url      : null,
				comments : 'Music on your computer',
				trigger  : 'upload',
			},
		],
	};

	const album_names = [...new Set(data.songs.flatMap(s => s.album))];
	data.albums = album_names.map(a => data.songs.find(s => s.album == a));

	return data;
}


//EOF
