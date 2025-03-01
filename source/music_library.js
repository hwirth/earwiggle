// data.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { songData } from './song_data.js';

function normalize(string) {
	const div = document.createElement('div');
	div.innerHTML = string;
	div.querySelectorAll('*').forEach(element => element.remove());
	return div.innerText.replace(/\s+/g, ' ').toLowerCase();
}

export class MusicLibrary {
	constructor(parameters) {  // Expect to pass through SETTINGS, DEBUG to songData()
		this.songs       = [];
		this.albums      = [];
		this.albumNames  = [];
		this.artistNames = [];

		return new Promise(async(resolve) => {
			const data = await songData(parameters);

			const allowed = entry => !entry.debug || parameters.SETTINGS.AUDIO_PLAYER.TEST_SOUNDS;
			this.songs  = data.songs.filter(allowed);
			this.albums = data.albums.filter(allowed);

			this.albumNames  = [...new Set(this.songs.flatMap(s => s.album ))];
			this.artistNames = [...new Set(this.songs.flatMap(s => s.artist))];

			if (parameters.DEBUG.MUSIC_LIBRARY) {
				console.group('MusicLibrary');
				console.log(this.songs      .length, 'songs'  , this.songs      );
				console.log(this.artistNames.length, 'artists', this.artistNames);
				console.log(this.albumNames .length, 'albums' , this.albumNames );
				console.groupEnd();
			}

			resolve(this);
		});
	}

	findStrict = (key, value, songs = null) => {
		if (!songs) songs = this.songs;
		return songs.filter(s => normalize(s[key]) == value);
	}

	findFuzzy = (key, value, songs) => {
		if (!songs) songs = this.songs;
		return this.songs.filter(s => normalize(s[key]).includes(value));
	}

	songsByArtist = (name, songs = null) => {
		return this.findFuzzy('artist', normalize(name), songs);
	}

	songsByAlbum = (name, songs = null) => {
		return this.findFuzzy('album' , normalize(name), songs);
	}

	songsByTitle = (name, songs = null) => {
		return this.findFuzzy('title' , normalize(name), songs);
	}

	songsByAny = (filter, songs = null) => [...new Set([
		...this.songsByArtist(filter),
		...this.songsByAlbum (filter),
		...this.songsByTitle (filter),
	])];

	addSong = (entry) => {
		this.songs.push(entry);
		//...albumNames, artistNames
	}
}


//EOF
