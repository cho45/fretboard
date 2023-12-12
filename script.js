import {
	Fretboard,
	Systems,
	FretboardSystem
} from 'https://cdn.jsdelivr.net/npm/@moonwave99/fretboard.js@0.2.13/+esm';

import Note from 'https://cdn.jsdelivr.net/npm/@tonaljs/note@4.10.0/+esm';

const MAJOR_CAGED_BOXES0 =  [
	{
		box: [
			'34-5',
			'71-2',
			'5-6-',
			'2-34',
			'6-71',
			'34-5'
		],
		baseChroma: Note.chroma('C'),
	},    
	{
		box: [
			'-5-6-',
			'-2-34',
			'6-71-',
			'34-5-',
			'71-2-',
			'-5-6-'
		],
		baseChroma: Note.chroma('A#'),
	},
	{
		box: [
			'-6-71',
			'-34-5',
			'71-2-',
			'-5-6-',
			'-2-34',
			'-6-71'
		],
		baseChroma: Note.chroma('G#'),
	},        
	{
		box: [
			'71-2',
			'-5-6',
			'2-34',
			'6-71',
			'34-5',
			'71-2'
		],
		baseChroma: Note.chroma('E#'),
	},    
	{
		box: [
			'-2-34',
			'-6-71',
			'34-5',
			'71-2-',
			'-5-6-',
			'-2-34'
		],
		baseChroma: Note.chroma('D#'),
	},    
];

const MAJOR_CAGED_BOXES =  [
	{
		box: [
			'34-5',
			'71-2',
			'5-6-',
			'2-34',
			'6-71',
			'34-5'
		],
		baseChroma: Note.chroma('C'),
	},    
	{
		box: [
			'5-6-7',
			'--34-',
			'-71-2',
			'4-5-6',
			'1-2-3',
			'5-6-7'
		],
		baseChroma: Note.chroma('A'),
	},
	{
		box: [
			'6-71',
			'34-5',
			'1-2-',
			'5-6-7',
			'2-34',
			'6-71'
		],
		baseChroma: Note.chroma('G'),
	},        
	{
		box: [
			'1-2-3',
			'--6-7',
			'-34-5',
			'-71-2',
			'4-5-6',
			'1-2-7'
		],
		baseChroma: Note.chroma('E'),
	},    
	{
		box: [
			'2-34',
			'6-71',
			'4-5-',
			'1-2-3',
			'5-6-7',
			'2-34'
		],
		baseChroma: Note.chroma('D'),
	},    
];


Vue.createApp({
	data() {
		return {
			box: 0,
			useOpenString: false,
			boxForm: "",
			root: "C",
			roots: [
				"C",
				"C#",
				"D",
				"Eb",
				"E",
				"F",
				"F#",
				"G",
				"Ab",
				"A",
				"Bb",
				"B",
			],
			scale: "major pentatonic",
			scales: [
				"major pentatonic",
				"minor pentatonic"
			],
		}
	},

	computed: {
	},

	watch: {
		box: function () {
			console.log(this.box);
			this.updateFretboard();
			this.updateHashParams();
		},
		scale: function () {
			this.updateFretboard();
		},
		root: function () {
			this.updateFretboard();
			this.updateHashParams();
		},
		useOpenString: function() {
			this.updateFretboard();
		},
	},

	mounted() {
		this.loadHashParams();

		const commonOpts = {
			stringWidth: [1, 1, 1, 1.5, 2, 2.5],
			fretCount: 22,
			fretWidth: 1.5,
			fretColor: '#999999',
			nutWidth: 7,
			nutColor: '#666666',
			scaleFrets: true,
			middleFretColor: "#333333",
			middleFretWidth: 1.5,
			height: 200,
			width: 1280,
			dotSize: 25,
			dotStrokeWidth: 2,
			dotTextSize: 13,
			showFretNumbers: true,
			fretNumbersHeight: 40,
			fretNumbersMargin: 10,
			fretNumbersColor: "#333333",
			font: "Roboto",
			dotText: ({ note, octave, interval }) => `${interval}`,
//			dotStrokeColor: ({ interval, inBox }) =>
//				!inBox
//				? "#efefef"
//				: interval === '1P'
//				? "#990000"
//				: "#000000",
//			dotFill: ({ interval, inBox }) =>
//				!inBox
//				? "#efefef"
//				: interval === '1P'
//				? "#990000"
//				: "#000000"
			dotStrokeColor: ({ interval, inBox }) =>
				!inBox
				? "#ffffff"
				: interval === '1P'
				? "#000000"
				: "#000000",
			dotFill: ({ interval, inBox, note }) =>
				!inBox
				? `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 90%, 90%)`
				: `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 40%, 100%)`
		};

		this.fretboardAll = new Fretboard({
			...commonOpts,
			el: '#fretboard-all',
			dotText: ({ note, octave, interval }) => `${Note.enharmonic(note)}`,
			dotStrokeColor: ({ note }) =>
				Note.get(note).chroma !== Note.get(this.root).chroma
				? "#ffffff"
				: "#000000",
			dotFill: ({ note }) =>
				Note.get(note).chroma !== Note.get(this.root).chroma
				? `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 90%, 90%)`
				: `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 40%, 100%)`
		});

		this.fretboardPentatonic = new Fretboard({
			el: '#fretboard-pentatonic',
			...commonOpts
		});

		this.fretboardMajor = new Fretboard({
			el: '#fretboard-major',
			...commonOpts
		});
		this.fretboardMajor2 = new Fretboard({
			el: '#fretboard-major2',
			...commonOpts
		});

		window.FretboardSystem = FretboardSystem;
		window.Note = Note;

//		fretboard.setDots([
//			{
//				string: 5,
//				fret: 3,
//			},
//			{
//				string: 4,
//				fret: 2,
//			},
//			{
//				string: 2,
//				fret: 1,
//			},
//		]);
//
//		fretboard.render();

		this.updateFretboard();

		window.addEventListener("keydown", (e) => {
			e.stopPropagation();
			const key =
				(e.ctrlKey  ? 'Ctrl-'  : '') +
				(e.shiftKey ? 'Shift-' : '') +
				(e.altKey   ? 'Alt-'   : '') +
				e.code;
			console.log(key);
			const func = {
				"ArrowRight" : () => {
					this.nextBox();
				},
				"ArrowLeft" : () => {
					this.prevBox();
				},
				"ArrowUp" : () => {
					this.prevRoot();
				},
				"ArrowDown" : () => {
					this.nextRoot();
				},
			}[key];
			if (func) {
				func();
				e.preventDefault();
			}
		});
	},

	methods: {
		updateFretboard: function () {
			const { fretboardAll, fretboardPentatonic, fretboardMajor, fretboardMajor2 } = this;
			fretboardAll.renderScale({
				type: 'chromatic',
			});

			fretboardPentatonic.renderScale({
				type: this.scale,
				root: this.root,
				box: {
					system: Systems.pentatonic,
					box: this.box + 1
				}
			});

			const form = fretboardPentatonic.dots.filter(dot => dot.inBox && dot.string === 6).map(dot => dot.interval).join('-');
			console.log({form});
			this.boxForm = {
				// major pentatonic
				'3M-5P': 'C',
				'5P-6M': 'A',
				'6M-1P': 'G',
				'1P-2M': 'E',
				'2M-3M': 'D',
				// minor pentatonic
				/* form by form
				'4P-5P': 'C',
				'5P-7m': 'A',
				'7m-1P': 'G',
				'1P-3m': 'E',
				'3m-4P': 'D',
				*/
				// form by major form
				'4P-5P': 'D',
				'5P-7m': 'C',
				'7m-1P': 'A',
				'1P-3m': 'G',
				'3m-4P': 'E',
			}[form];
			
			this.renderScale(fretboardPentatonic, MAJOR_CAGED_BOXES0.map( (i) => ({
				...i,
				box: i.box.map( (s) => s.replace(/[47]/g, '-') ),
			})));

			this.renderScale(fretboardMajor, MAJOR_CAGED_BOXES0);
			this.renderScale(fretboardMajor2, MAJOR_CAGED_BOXES);
		},

		renderScale: function (fretboard, boxes) {
			console.log(boxes);
			fretboard.renderScale({
				type: 'major',
				root: this.root,
			});

			// fretboard.js は box を再定義するうまい方法がないようなので
			// ややこしいことをしている。
			// renderScale 自体を再実装したくはないので、renderScale したあとに
			// 生成された dot に対して追加処理で inBox をいれている

			const box = boxes["CAGED".indexOf(this.boxForm)];
			let delta = Note.chroma(this.root) - box.baseChroma;

			if (this.useOpenString) {
				while (delta < 0)  delta += 12;
			} else {
				// 開放弦を使わない
				while (delta < 1)  delta += 12;
			}
			const positions = box.box.reduce((r, i, string) => ([
					...r,
					...i.split('').map(
						(x, i) => x !== '-'
						? { string: string + 1, fret: i + delta }
						: null
					).filter(x => !!x)
				]), []);
			fretboard.dots.forEach( (dot) => {
				dot.inBox = positions.some( (i) => i.fret === dot.fret && i.string === dot.string);
			});
			fretboard.render();
		},

		prevBox: function () {
			this.box = (this.box - 1 + 5) % 5;
		},

		nextBox: function () {
			this.box = (this.box + 1) % 5;
		},

		prevRoot: function () {
			this.root = this.roots[(this.roots.indexOf(this.root) - 1 + this.roots.length) % this.roots.length];
		},

		nextRoot: function () {
			this.root = this.roots[(this.roots.indexOf(this.root) + 1) % this.roots.length];
		},


		loadHashParams: function () {
			const params = new URLSearchParams(location.hash.substring(1));
			
			if (params.has("box")) {
				console.log("load box from hash");
				this.box = +params.get("box");
			}

			if (params.has("root")) {
				const root = params.get("root");
				if (this.roots.some( (i) => i === root)) {
					this.root = root;
				}
			}
		},

		updateHashParams: function () {
			const params = new URLSearchParams(location.hash.substring(1));
			params.set("box", this.box);
			params.set("root", this.root);
			history.replaceState(null, "", "#" + params.toString());
		},
		
		noteColor: function (note, s, l) {
			const h = Note.get(note).chroma / 12 * 360;
			return `hsl(${h}, ${s}%, ${l}%)`;
		}
	},
}).use(Vuetify.createVuetify({
	theme: {
		defaultTheme: 'light' // or dark
	}
})).mount("#app");


