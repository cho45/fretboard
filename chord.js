import {
	Fretboard,
	Systems,
	FretboardSystem
} from 'https://cdn.jsdelivr.net/npm/@moonwave99/fretboard.js@0.2.13/+esm';

import { searchChordByNotes, searchKeys, noteName } from './chord-search.js';
// import Note from 'https://cdn.jsdelivr.net/npm/@tonaljs/note@4.10.0/+esm';
import { Key, Pcset, Chord, ChordType, Interval, Note, Scale } from 'https://cdn.jsdelivr.net/npm/tonal@5.1.0/+esm';

const fretboardNotes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].reverse().map(n => {
	const open = Note.get(n).midi;
	return Array(24).fill().map( (_, i) => {
		return Note.fromMidi(open + i);
	});
});

const DEFAULT_OPTIONS = Object.freeze({
	capo: 0,
	overlayScale: false,
	root: "C",
	scale: "major",
});

async function midiDeviceSend(notes) {
	function noteOn(note, velocity) {
		return [0x90, note, velocity];
	}

	function noteOff(note) {
		return [0x80, note, 0];
	}

	if (typeof navigator.requestMIDIAccess === "undefined") {
		console.log('MIDI not supported');
		return;
	}

	const midi = await navigator.requestMIDIAccess();
	const outputs = midi.outputs;

	if (outputs.size === 0) {
		console.log('no output devices are found');
		return;
	}


	for (let output of outputs.values()) {
		console.log(output);
		await output.open();
		try {
			output.send([0xC0, 27], 0);
			for (let note of notes) {
				output.send(noteOn(note, 100));
				output.send(noteOff(note), window.performance.now() + 800);
			}
		} catch (e) {
			console.log(e);
		} finally {
			output.close();
		}
	}
}


Vue.createApp({
	data() {
		return {
			options: Object.assign({}, DEFAULT_OPTIONS),

			scales: [
				"major",
				"minor",
				"harmonic minor",
				"major pentatonic",
				"minor pentatonic",
			],
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

			dots: [],
			foundChords: [],

			chordSet: [],
		}
	},

	computed: {
		capoEnabled: function () {
			return this.options.capo !== 0;
		}
	},

	watch: {
		options: {
			handler: function () {
				this.updateDotsAndMutes();
				this.updateHashParams();
			},
			deep: true
		}
	},

	mounted() {

		const commonOpts = {
			stringWidth: [1, 1, 1, 1.5, 2, 2.5],
			fretCount: 17,
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
			fretNumbersMargin: 5,
			fretNumbersColor: "#333333",
			topPadding: 20,
			bottomPadding: 0,
			leftPadding: 20,
			rightPadding: 20,
			font: "Roboto",
			dotText: ({ note, octave, interval }) => `${Note.enharmonic(note)}`,
			dotStrokeColor: ({ interval, moving, selected, outOfScale }) =>
				moving
				? "#000000"
				: selected
				? outOfScale ? "#666666" : "#333333"
				: "#ffffff",
//			dotFill: ({ interval, moving }) =>
//				moving
//				? "#999999"
//				: "#666666"
			dotFill: ({ interval, moving, note, selected }) =>
				moving
				? "#999999"
				: selected
				? `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 40%)`
				: `hsl(${Note.get(note).chroma / 12 * 360}, 50%, 40%, 20%)`
		};

		this.fretboard = new Fretboard({
			el: '#fretboard',
			...commonOpts
		});

		this.fretboard.render();
		const { wrapper, positions } = this.fretboard;
		const dotOffset = this.fretboard.getDotOffset();
		const fretMarkerSize = 20;
		const fretMarkerColor = "#dddddd";
		const fretMarkerGroup = wrapper.append('g').attr('class', 'fret-marker-group');
		fretMarkerGroup
			.selectAll('circle')
			.data([
				{ string: 3, fret: 3 }, 
				{ string: 3, fret: 5 }, 
				{ string: 3, fret: 7 }, 
				{ string: 3, fret: 9 }, 
				{ string: 2, fret: 12 }, 
				{ string: 4, fret: 12 }, 
				{ string: 3, fret: 15 }, 
				{ string: 3, fret: 17 }, 
				{ string: 3, fret: 19 }, 
				{ string: 3, fret: 21 }, 
				{ string: 2, fret: 24 }, 
				{ string: 4, fret: 24 }, 
			])
			.enter()
			.filter(({ fret }) => fret >= 0 && fret <= this.fretboard.options.fretCount + dotOffset)
			.append('circle')
			.attr('class', 'position-mark')
			.attr('cx', ({ string, fret }) => `${positions[string - 1][fret - dotOffset].x}%`)
			.attr('cy', ({ string, fret }) => (positions[string - 1][fret - dotOffset].y + positions[string][fret - dotOffset].y) / 2)
			.attr('r', fretMarkerSize * 0.5)
			.attr('fill', fretMarkerColor);

		this.fretboard.on('mousemove', ({ fret, string }) => {
			if (this.options.capo) {
				if (fret < this.options.capo) {
					return;
				}
			}

			const note = fretboardNotes[string - 1][fret];
			const dot = {
				fret,
				string,
				note: note,
				moving: true
			};

			const dots = [];
			let found = false;
			for (let d of this.dots) {
				if (d.fret === dot.fret && d.string === dot.string) {
					dots.push(dot);
					found = true;
				} else {
					dots.push(d);
				}
			}
			if (!found) {
				dots.push(dot);
			}

			this.updateDotsAndMutes(dots);
		});

		this.fretboard.on('mouseleave', () => {
			console.log('mouseleave');
			setTimeout( () => {
				this.updateDotsAndMutes();
			}, 100);
		});

		this.fretboard.on('click', ({ fret, string }) => {
			this.selectDot(fret, string);
		});

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
			}[key];
			if (func) {
				func();
				e.preventDefault();
			}
		});

		this.loadHashParams();
	},

	methods: {
		selectDot: function (fret, string) {
			const note = fretboardNotes[string - 1][fret];
			const dot = {
				fret,
				string,
				note: note,
			};

			const existing = this.dots.findIndex( (i) => i.fret === dot.fret && i.string === dot.string);

			if (existing === -1) {
				for (let i = 0; i < this.dots.length; i++) {
					if (this.dots[i].string === dot.string) {
						this.dots.splice(i, 1);
					}
				}
				this.dots.push(dot);
			} else {
				this.dots.splice(existing, 1);
			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		updateDotsAndMutes: function (dots) {
			if (!dots) dots = this.dots;

			this.fretboard.wrapper.selectAll('.barres').remove();
			if (this.options.capo) {
				this.fretboard.renderBarres([
					{
						fret: this.options.capo,
						stringFrom: 6,
						stringTo: 1,
					}
				]);
			}

			const mutes = new Set([1, 2, 3, 4, 5, 6]);
			this.dots.forEach( (i) => {
				mutes.delete(i.string);
			});
			this.fretboard.dots = [];
			if (this.options.overlayScale) {
				this.fretboard.renderScale({
					type: this.options.scale,
					root: this.options.root,
				});
			}
			this.fretboard.dots = this.fretboard.dots.concat(dots.map( (i) => ({
				...i,
				selected: true,
				outOfScale: this.options.overlayScale && !this.fretboard.dots.some( (j) => j.string === i.string && j.fret === i.fret),
			})));
			this.fretboard.render();
			this.fretboard.wrapper.selectAll('.muted-strings').remove();
			this.fretboard.muteStrings({
				strings: Array.from(mutes.values()),
				width: 20,
				stringWidth: 3,
				stroke: "#333"
			});

			if (this.options.capo) {
				const mutedStrings = this.fretboard.wrapper.select('.muted-strings');
				this.fretboard.wrapper.
					insert("svg").
					attr('class', 'muted-strings').
					attr('style', 'overflow: visible').
					attr('x', `${this.fretboard.positions[0][this.options.capo - this.fretboard.getDotOffset()].x}%`).
					attr('y', 0).
					append(() => mutedStrings.node());
			}

		},

		selectChord: function (chord) {
			this.dots = [];
			for (let dot of chord.dots) {
				this.selectDot(dot.fret, dot.string);
			}
		},

		lowerFret: function () {
			if (this.dots.some( (i) => i.fret === 0)) {
				return;
			}

			for (let dot of this.dots) {
				dot.fret--;
				dot.note = fretboardNotes[dot.string - 1][dot.fret];
			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		higherFret: function () {
			if (this.dots.some( (i) => i.fret === 17)) {
				return;
			}

			for (let dot of this.dots) {
				dot.fret++;
				dot.note = fretboardNotes[dot.string - 1][dot.fret];
			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		lowerString: function () {
			const byString = this.dots.reduce( (r, i) => r.set(i.string, i.fret) , new Map());
			const dir = -1;
			this.dots.length = 0;
			for (let string = 1; string <= 6; string++) {
				let src = ((string - 1  + dir) + 5) % 5 + 1;
				if (src === 1 && !byString.has(src)) src = 6;
				if (byString.has(src)) {
					let fret = byString.get(src);
					if (string === 3) {
						fret--;
					}
					this.dots.push({
						fret,
						string,
						note: fretboardNotes[string - 1][fret],
					});
				}
			}

//			for (let dot of this.dots) {
//				dot.string = (dot.string - 1 + 1 + 6) % 6 + 1;
//				if (dot.string === 3) {
//					dot.fret--;
//				}
//				dot.note = fretboardNotes[dot.string - 1][dot.fret];
//			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		higherString: function () {
			const byString = this.dots.reduce( (r, i) => r.set(i.string, i.fret) , new Map());
			const dir = +1;
			this.dots.length = 0;
			for (let string = 1; string <= 6; string++) {
				let src = ((string - 1  + dir) + 5) % 5 + 1;
				if (src === 1 && !byString.has(src)) src = 6;
				if (byString.has(src)) {
					let fret = byString.get(src);
					if (string === 2) {
						fret++;
					}
					this.dots.push({
						fret,
						string,
						note: fretboardNotes[string - 1][fret],
					});
				}
			}
//
//			for (let dot of this.dots) {
//				dot.string = (dot.string - 1 - 1 + 6) % 6 + 1;
//				if (dot.string === 2) {
//					dot.fret++;
//				}
//				dot.note = fretboardNotes[dot.string - 1][dot.fret];
//			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		clearDots: function () {
			this.dots.length = 0;
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		updateFoundChords: function () {
			clearTimeout(this.updateFoundChordsTimer);
			this.updateFoundChordsTimer = setTimeout(async () => {
				const found = searchChordByNotes(this.dots.map( (i) => i.note )).slice(0, 30);
				for await (let chord of found) {
					chord.chordKeys = searchKeys(Chord.get(chord.names[0]));
					if (this.options.capo) {
						const translatedTonic = Note.enharmonic(Note.pitchClass(Note.fromMidi(chord.chordNotes[0].chroma - this.options.capo + 12)));
						const translatedBase  = Note.enharmonic(Note.pitchClass(Note.fromMidi(chord.base.chroma - this.options.capo + 12)));
						chord.formName = translatedTonic + chord.aliases[0];
						if (translatedTonic !== translatedBase) {
							chord.formName += '/' + translatedBase;
						}
					}
				}
				this.foundChords = found;
			}, 100);
		},

		addToSet: function (chord) {
			console.log('addToSet', chord);
			const chordDots = {
				...chord,
				name: chord.names[0],
				dots: Array.from(this.dots),
			};
			if (this.chordSet.some( (i) => i.name === chordDots.name)) {
				return;
			}
			this.chordSet.push(chordDots);
			this.updateHashParams();
		},

		removeFromSet: function (chord) {
			console.log('removeFromSet', chord);
			const index = this.chordSet.findIndex( (i) => i.name === chord.names[0]);
			if (index !== -1) {
				this.chordSet.splice(index, 1);
				this.updateHashParams();
			}
		},

		isInChordSet: function (chord) {
			const name = chord.names[0];
			return this.chordSet.some( (i) => i.name === name);
		},

		sendMIDI: function () {
			console.log('sendMIDI');
			const notes = this.dots.map( (i) => Note.get(i.note));
			console.log(notes);
			midiDeviceSend(notes.map( (i) => i.midi));
		},

		loadHashParams: function () {
			const params = new URLSearchParams(location.hash.substring(1));

			if (params.get('c')) {
				const current = params.get('c');
				this.deserializeDots(current).forEach( (i) => {
					this.selectDot(i.fret, i.string);
				});
			}

			if (params.get('s')) {
				const set = params.getAll('s');
				for (let s of set) {
					const splitted = s.split('-');
					const name = splitted.pop();
					const dots = this.deserializeDots(splitted.join(''));
					const chord = Chord.get(name);
					this.chordSet.push({
						...chord,
						name,
						dots,
					});
				}

				this.updateHashParams();
			}

			if (params.get('capo')) {
				this.options.capo = +params.get('capo');
				this.updateHashParams();
			}

			for (let [key, value] of Object.entries(this.options)) {
				if (params.has(key)) {
					if (typeof value === "boolean") {
						this.options[key] = params.get(key) === "true";
					} else {
						this.options[key] = params.get(key);
					}
				}
			}
		},

		updateHashParams: function () {
			const params = new URLSearchParams(location.hash.substring(1));

			const current = this.serializeDots(this.dots);
			params.set('c', current);

			params.delete('s');
			for (let c of this.chordSet) {
				const s = this.serializeDots(c.dots);
				params.append('s', `${s}-${c.name}`);
			}

			for (let [key, value] of Object.entries(this.options)) {
				params.delete(key);
				if (DEFAULT_OPTIONS[key] !== value) {
					params.append(key, value);
				}
			}

			history.replaceState(null, "", "#" + params.toString());
		},

		capoCheck: function () {
			if (this.capoEnabled) {
				this.options.capo = 0;
			} else {
				const capo = prompt("Enter capo fret number", this.options.capo);
				this.options.capo = +capo;
			}
		},

		serializeDots: function (dots) {
			const singleDigit = dots.every( (i) => i.fret < 10);
			const map = dots.reduce( (r, i) => r.set(i.string, i.fret) , new Map());
			return [6, 5, 4, 3, 2, 1].map( (string) => {
				if (singleDigit) {
					return map.has(string) ? map.get(string) : 'x'
				} else {
					return map.has(string) ? String(map.get(string) + 100).slice(1) : 'xx'
				}
			}).join('');
		},

		deserializeDots: function (str) {
			let splitted;
			const twoDigit = str.match(/(..)/g);
			if (twoDigit.length === 6) {
				splitted = twoDigit;
			} else {
				const oneDigit = str.match(/(.)/g);
				if (oneDigit.length === 6) {
					splitted = oneDigit;
				} else {
					console.log(`error on parsing ${str}`);
					return [];
				}
			}

			const ret = [];
			splitted.forEach( (i, string) => {
				const fret = +i;
				if (!isNaN(fret)) {
					ret.push({
						fret,
						string: 6 - string,
					});
				}
			});
			return ret;
		},

		formatNote: function (str) {
			return str.
				replace(/##/g, '\uD834\uDD2A').
				replace(/#/g, '\u266F').
				replace(/bb/g, '\uD834\uDD2B').
				replace(/b/g, '\u266D');
		},

		formatGrade: function (str) {
			const map = new Map();
			map.set("#", "\u266F");
			map.set("##", "\uD834\uDD2A");
			map.set("b", "\u266D");
			map.set("bb", "\uD834\uDD2B");
			map.set("I", "\u2160");
			map.set("II", "\u2161");
			map.set("III", "\u2162");
			map.set("IV", "\u2163");
			map.set("V", "\u2164");
			map.set("VI", "\u2165");
			map.set("VII", "\u2166");
			map.set("i", "\u2170");
			map.set("ii", "\u2171");
			map.set("iii", "\u2172");
			map.set("iv", "\u2173");
			map.set("v", "\u2174");
			map.set("vi", "\u2175");
			map.set("vii", "\u2176");
			return str.replace(new RegExp(Array.from(map.keys()).sort((a, b) => b.length - a.length).join("|"), 'g'), (match) => map.get(match) );
		},

		noteColor: function (note, s, l) {
			const h = Note.get(note).chroma / 12 * 360;
			return `hsl(${h}, ${s}%, ${l}%)`;
		},
	},
}).use(Vuetify.createVuetify({
	theme: {
		defaultTheme: 'light' // or dark
	}
})).mount("#app");


