BOOT PROCESS
============
index.html   Made to load quickly and show a spash screen. Errors while initializing are shown to the user
boot.js      Prepares the browser so the actual application can start (Audio autoplay, unhandled rejections)
main.js      The actual Earwiggle Music Player


DEBUG
=====
 ./?debug  enables console logging and loads test sounds
grep for comments like //... (Things not yet properly done or polished)

PNG for items matching [data-trigger] hardcoded to allow floating icons


TODO
====
[ ] body.initializing - not going away - providing text-align:Center to albums
[ ] Extra padding/margin for focus outline creates issues
[ ] Move variables to .audio_player (keep them private to us), rename --player-* (--player-items too specific)
[ ] Controls: Play button when nothing yet selected starts first visible
[#} When Local Files clicked, remain until album clicked, and use filter for local only
[#] Local Files: remove icon
[ ] Save settings: Don't do in modules, only when main exits
[?] Integrate starfield
[E] Playlist not looping, ends: Stop not pressed
[E] Custom range inputs on iOS not working
[ ] Albumlist: Top div artist:*, bottom album:*
[ ] Dragdrop reorder playlist
[ ] ?filter=artist:Hjalvandar
[E] Albumlist: Not updating when new albums added (upload)
[!] Albumlist: Filter according to term, show something for not matches
[E] Albumlist/Playlist: Album selected needs to scroll into view when on full list (filter celeared) clicked
[E] Albumlist/Playlist: Album selected with playing song needs to select the song
[E] Pause while Stopped
[#] Playlist progresses, "clicks" album (focus for 200ms) without changing filter results
[#] Enter "clicks" item
[ ] Cursor keys unused axis: focus next element, or change grid section (album <-> filter <-> playlist
[*] Filter also selects/focuses album
[*] Current album:brighter/thicker border
[ ] Adding local files does not add an album
[!] Tabindex + Focus
[ ] Library: Sort alphabetically
[ ] MusicLibrary: Refactor to work better once a backend exists (Update playlist)
[!] Playlist: Duration, Genre
[ ] Playlist: Custom playlists
[!] Filter: "artist:Hjalvandar"
[!] Waveform: Cache waves (RAM)
[?] Waveform: Render wave progressively, as the data comes in
[?] Filter: multiple terms, comma separated
[ ] Loop/play by selecting playlist items (checkbox)
[ ] SA: Waterfall mode
[ ] SA: Draw frequencies logarithmically (strech base)
[?] SA: Stop/Pause: Fade out/in
[?] EQ: Presets, save, per song
[?] EQ: Q-Value input: Factor
[?] EQ: Q-Value input: Fixed/algorithmic
[?] EQ: Bands: Linear, preset, algorithmic
[?] EQ: Bands: Amount
[ ] Download Icon
[ ] Clipping LED
[?] Lyrics: Timestamps (Karaoke)
[e] Spectrum Analyser: x-calculations still not 100% correct
[?] Volume normalizing (Scan, adjust; Requires full load)
[?] Loop Song: Use <audio loop>


Code Parking Space
==================
You can safely ignore the rest of this file.


@font-face {
	font-family: 'Galatia SIL';
	src:
		local('Galatia SIL'),
		local('GalatiaSIL'),
		url('fonts/GalatiaSIL.woff2') format('woff2'),
		url('fonts/GalatiaSIL.woff') format('woff') ;
	font-weight: normal;
	font-style: normal;
	font-display: swap;
}
@font-face {
    font-family: 'Gandhi Serif';
    src: local('Gandhi Serif'), local('GandhiSerif-Regular'),
        url('fonts/GandhiSerif-Regular.woff2') format('woff2'),
        url('fonts/GandhiSerif-Regular.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
@font-face {
    font-family: 'Libertinus Serif';
    src: local('Libertinus Serif Regular'), local('LibertinusSerif-Regular'),
        url('fonts/LibertinusSerif-Regular.woff2') format('woff2'),
        url('fonts/LibertinusSerif-Regular.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
@font-face {
    font-family: 'Noto Serif';
    src: local('Noto Serif'), local('NotoSerif'),
        url('fonts/NotoSerif.woff2') format('woff2'),
        url('fonts/NotoSerif.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
