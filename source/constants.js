// constants.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// EARWIGGLE MUSIC PLAYER - copy(l)eft 2025 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

export const PROGRAM_NAME    = 'Earwiggle Music Player';
export const PROGRAM_VERSION = 'alpha2.3';

const GETParams     = new window.URLSearchParams(window.location.search);
const dev_server    = (location.hostname == 'harald.ist.neu');
const debug_switch  = (GETParams.get('debug') !== null);
const debug_enabled = dev_server ^ debug_switch;

export const DEBUG = {
	ENABLED           : debug_enabled,          // General logging

	CLEAR_STORAGE     : false,                  // One-off emergency clear: Remove localStorage everywhere

	SLIDER_UPDATES    : debug_enabled && false,
	AUDIO_CONTEXT     : debug_enabled && false,
	AUDIO_ELEMENT     : debug_enabled && false,
	AUDIO_EVENTS      : debug_enabled && false,
	AUDIO_PLAYLIST    : debug_enabled && false,
	EQ_FILTERS        : debug_enabled && false,   // Log EQ filter audio nodes
	GRAPHIC_EQUALIZER : debug_enabled && false,
	SPECTRUM_ANALYSER : debug_enabled && !false,
	MUSIC_LIBRARY     : debug_enabled && false,
	PLAYLIST          : debug_enabled && false,
	SETTINGS          : debug_enabled && false,
	STORAGE           : debug_enabled && false,
	STREAMS           : debug_enabled && false,
	WAKE_LOCK         : debug_enabled && false,
	WAVE_FORM         : debug_enabled && false,
	CANVAS_SIZING     : debug_enabled && false,   // Smeared dots indicate problem
	TEST_SOUNDS       : debug_enabled && false,
	LAZY_LOADING      : debug_enabled && false,

	TIMES: { INDEX: window.WIGGLE_INDEX_TIME },
	ERRORS: { AMOUNT: 0 },
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
		toggleStars   : '[name=stars]',
		import        : '[name=import]',

		lcdList       : '.lcd .list',
		lcdSong       : '.lcd .song',
		lcdPause      : '.lcd .pause',
		lcdWakeLock   : '.lcd .wake_lock',

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
		adminForm     : '.debug_stats form',
		adminPassword : '[name=admin]',
		loadPassword  : '[name=loadPassword]',
		savePassword  : '[name=savePassword]',
	},

	CUSTOM_SLIDERS: {
		WHEEL_ALBUMS : true,
		WHEEL_EQ     : true,
		WHEEL_VOLUME : true,
		WHEEL_SEEK   : true,
	},

	MAIN: {
		//... mainGain
		BASE_VOLUME        : 0.5,
		VOLUME_ZOOM_FACTOR : Math.sqrt(2),
		VOLUME_ZOOM_MIN    : 1 / 1.25**20,
		VOLUME_ZOOM_MAX    : 10,
	},

	AUDIO_PLAYER: {
		//... not mainGain
		STORAGE_KEY        : 'earwigglePlayer',
		POST_AMP_VOLUME    : 1,
		MAX_VOLUME         : 1.0,     // No longer needed, allowed for the slider to go > 100%
		SCROLL_INTO_VIEW   : true,    // Focus new song in playlist (auto play)
		PRECISION_TIMER    : true,    // true: setTimeout for timestamp faster than audio.ontimeupdate
		BUTTON_BLINK_MS    : 133,
		TEST_SOUNDS        : !false,
		EXPONENTIAL_VOLUME : true,
		FIX_GRAPH_GLITCH   : false,   // false or ms: This fix should not be needed
		WHEEL_SEEK_SECONDS : 10,      // Seconds
	},

	WAVE_FORM: {
		HOLLOW_INDICATOR : false,
		PRE_CACHE_WAVES  : true,    // This loads ALL waves at start. needs refactor, if there's many songs
		INSET_BORDER     : !true,
	},

	GRAPHIC_EQUALIZER: {
		STORAGE_KEY      : 'earwiggleGraphicEqualizer',
		FREQUENCY_MIN    : 20,
		FREQUENCY_MAX    : 16000,     // Max. 22050
		FREQUENCY_CURVE  : 1,         // c < 1: Base separated more (16, 98, 352...), c > 1: Bases closer (16, 64, 237...)
		BAND_SLIDER_STEP : 0.1,       // Change of range input value [-1..+1] with mouse wheel
		CHAIN_LENGTH     : 8,         // Nr. chained filters per band, increases EQ effectiveness and CPU load
		FILTER_GAIN      : 2,         // Factor for gain value of the filters, increases EQ effectiveness, default 1
		Q_FACTOR         : 1.8,       // Tweak band width of the filters, q > 1: narrow, q < 1: broad
		FILTER_Q         : 1.4,       //... Now dynamic
	},

	SPECTRUM_ANALYSER: {
		STORAGE_KEY  :  'earwiggleSpectrumAnalyser',
		WIDTH        : null,         //...css var
		HEIGHT       : 128,
		TOP_FREQ     : 2**( 0 ),     //... goes away
		WHEEL_ZOOM   : true,
		INSET_BORDER : !true,
		MODES: [
			'bars',
			'mode3',    // Soft flames sideways
			'mode2e',   // Rainbow flames straight
			'mode2c',   // tall
			'mode2d',
			//'mode1',
			//'mode2b',
			//'mode2f',
			//'mode4',
			//'mode5',
		],
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
