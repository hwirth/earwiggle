// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export const PROGRAM_NAME    = 'Earwiggle Music Player';
export const PROGRAM_VERSION = 'alpha2.2';

console.log(
	`%c<<< %c${PROGRAM_NAME.toUpperCase()} ${PROGRAM_VERSION}%c >>>`,
	'font-weight:bold', 'color:red;font-weight:bold', 'color:unset',
);

const GETParams     = new window.URLSearchParams(window.location.search);
const dev_server    = (location.hostname == 'harald.ist.neu');
const debug_switch  = (GETParams.get('debug') !== null);
const debug_enabled = dev_server ^ debug_switch;

console.log('<< DEBUG enabled >>');

export const DEBUG = {
	ENABLED           : debug_enabled,          // General logging

	CLEAR_STORAGE     : false,                  // One-off EMERGENCY CLEAR: Remove localStorage everywhere

	AUDIO_CONTEXT     : debug_enabled && false,
	AUDIO_ELEMENT     : debug_enabled && false,
	AUDIO_EVENTS      : debug_enabled && false,
	AUDIO_PLAYLIST    : debug_enabled && !false,
	EQ_FILTERS        : debug_enabled && false,   // Log EQ filter audio nodes
	GRAPHIC_EQUALIZER : debug_enabled && false,
	MUSIC_LIBRARY     : debug_enabled && false,
	PLAYLIST          : debug_enabled && false,
	SETTINGS          : debug_enabled && !false,
	STORAGE           : debug_enabled && !false,
	STREAMS           : debug_enabled && false,
	WAKE_LOCK         : debug_enabled && false,
	WAVE_FORM         : debug_enabled && false,
	TEST_SOUNDS       : debug_enabled && !true,

	TIMES: { INDEX: window.WIGGLE_INDEX_TIME },
};

export const SETTINGS = {

	CHECK_AUTOPLAY  : !true,
	SHOW_STAR_FIELD : true,

	DOM_SELECTORS: {
		musicPlayer   : '.audio_player',
		filterForm    : 'form.filter',
		filterTerm    : '[name=filter_text]',
		filterApply   : '[name=filter_apply]',
		filterClear   : '[name=filter_clear]',

		back          : '[name=back]',
		stop          : '[name=stop]',
		pause         : '[name=pause]',
		play          : '[name=play]',
		next          : '[name=next]',
		volume        : '[name=volume]',
		softer        : '[name=volume_down]',
		mute          : '[name=volume_mute]',
		louder        : '[name=volume_up]',
		advanced      : '[name=advanced]',
		progress      : '[name=progress]',
		loopList      : '[name=loop_list]',
		loopSong      : '[name=loop_song]',
		timestamp     : '.timestamp',
		remaining     : '.remaining',
		config        : '[name=config]',
		import        : '[name=import]',

		lcdList       : 'time .list',
		lcdSong       : 'time .song',
		lcdPause      : 'time .pause',
		lcdStars      : 'time .stars',

		reels         : '.reels',

		albumlist     : '.albumlist',
		playlist      : '.playlist',
		playingArtist : '.now_playing .artist',
		playingAlbum  : '.now_playing .album',
		playingSong   : '.now_playing .song',
		albumCover    : '.album_cover img',
		comments      : '.comments',
		waveForm      : '.waveform',
		equalizer     : '.equalizer',
		eqBands       : 'ALL .equalizer input',
		eqFreqs       : 'ALL .equalizer span',
		analyser      : '.analyser',
		lyrics        : '.lyrics',
		debugStats    : '.debug_stats',
	},

	AUDIO_PLAYER: {
		STORAGE_KEY      : 'earwigglePlayer',
		POST_AMP_VOLUME  : 1,
		MAX_VOLUME       : 1.25,
		ITEM_INTO_VIEW   : false,   //
		USE_UPDATE_TIMER : true,    // true: setTimeout for timestamp faster than audio.ontimeupdate
		TEST_SOUNDS      : !false,
	},

	GRAPHIC_EQUALIZER: {
		STORAGE_KEY      : 'earwiggleGraphicEqualizer',
		FREQUENCY_MIN    : 20,
		FREQUENCY_MAX    : 16000,   // Max. 22050
		FREQUENCY_CURVE  : 1,       // c < 1: Base separated more (16, 98, 352...), c > 1: Bases closer (16, 64, 237...)
		BAND_SLIDER_STEP : 0.1,     // Change of range input value [-1..+1] with mouse wheel

		CHAIN_LENGTH     : 8,       // Nr. chained filters per band, increases EQ effectiveness and CPU load
		FILTER_GAIN      : 2,       // Factor for gain value of the filters, increases EQ effectiveness, default 1
		Q_FACTOR         : 1.8,     // Tweak band width of the filters, q > 1: narrow, q < 1: broad
		FILTER_Q         : 1.4,     //... Now dynamic
	},

	SPECTRUM_ANALYSER: {
		STORAGE_KEY   :  'earwiggleSpectrumAnalyser',
		MIN_DECIBELS  : -30,    // -30
		MAX_DECIBELS  : -120,   // -100
		WIDTH         : null,   //...css var
		HEIGHT        : 128,
		TOP_FREQ      : 2**( 0 ),//... goes away
	},
};

const CSS_GRID_LAYOUTS = {
	DESKTOP : (`
		EMPTY1   playing   EMPTY2
		album    cover     lyrics
		filter   cover     lyrics
		playlist cover     lyrics
		playlist analyser  lyrics
		playlist eqializer lyrics
		playlist waveform  lyrics
		playlist cotnrols  lyrics
	`),
};

//EOF
