import {
	Fretboard,
	Systems,
	FretboardSystem
} from 'https://cdn.jsdelivr.net/npm/@moonwave99/fretboard.js@0.2.13/+esm';

// import Note from 'https://cdn.jsdelivr.net/npm/@tonaljs/note@4.10.0/+esm';
import { Key, Pcset, Chord, ChordType, Interval, Note, Scale } from 'https://cdn.jsdelivr.net/npm/tonal@5.1.0/+esm';

function popCount (x) {
		const a = x - (x >>> 1 & 0x55555555);
		const b = (a & 0x33333333) + (a >>> 2 & 0x33333333);
		const c = b + (b >>> 4) & 0x0f0f0f0f;
		const y = c * 0x01010101 >>> 24;
		return y;
}

function noteName(index) {
	return Note.enharmonic(Note.get(Note.fromMidi(index)).pc);
}


function searchChordByNotes(notes) {
	if (notes.length < 1) {
		return [];
	}

	notes = notes.map((note) => Note.get(note));
	if (notes.every((note) => note.midi)) {
		notes = notes.sort( (a, b) => a.midi - b.midi );
	} else {
		throw "octave must be specified";
	}

	const base = notes[0];

	const ret = [];
	Pcset.modes(notes, false).forEach((mode, index) => {
		const tonic = noteName(index);
		const searchSetNum = Pcset.num(mode);
		const types = ChordType.all().map( (chordType) => {
			let weight = 0;
			weight = popCount(chordType.setNum & searchSetNum) / popCount(chordType.setNum | searchSetNum);

			const chordNotes = chordType.intervals.map((interval) => ({
				interval,
				chroma:Note.chroma(Note.transpose(tonic, interval)), 
				name: Note.transpose(tonic, interval),
				existing: notes.some((note) => Note.chroma(note) === Note.chroma(Note.transpose(tonic, interval))),
			}));

			let names = chordType.aliases.map((alias) => noteName(index) + alias);
			const chord = Chord.get(names[0]);
			const basePc = Note.enharmonic(base.pc);
			// on code
			if (basePc !== tonic) {
				const baseNote = chordNotes.find((note) => Note.get(note.name).chroma === base.chroma);
				names = names.map((name) => name + "/" + (baseNote ? baseNote.name : basePc));
				weight *= 0.99;
			}

			return {
				...chordType,
				weight,
				names,
				tonic,
				chordNotes,
			};
		})

		ret.push(...types);
	});

	ret.sort( (a, b) => b.weight - a.weight );

	return ret;
}

function searchKeys (chord) {
	if (chord.quality === 'Unknown') {
		return [];
	}

	const isMinor = chord.quality === 'Minor';

	function searchFromKey (key, tonic) {
		const ret = [];
		if (!Pcset.isSupersetOf(notesSet)(key.scale)) {
			return ret;
		}

		const triads = key.triads.map(t => Chord.get(t));
		const i = triads.findIndex(c => (Note.get(c.tonic).chroma === Note.get(tonic).chroma) && ( (chord.setNum & c.setNum) === c.setNum));
		// const i = triads.findIndex(c => (c.tonic === tonic) && (Pcset.isSupersetOf(c.notes)(chord.notes) ));
		if (i !== -1) {
			ret.push({
				key: `${key.tonic}${key.type === 'minor' ? 'm' : ''}`,
				index: i,
				grade: isMinor ? key.grades[i].toLowerCase() : key.grades[i],
			});
			// ret.push(`${key.grades[i]} / Key:${key.tonic} ${key.type}`);
		}
		return ret;
	}

	const notesSet = Pcset.get(chord.notes);
	const tonic = chord.tonic;
	const searchKeys = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
	const ret = [];
	for (let k of searchKeys) {
		ret.push(...searchFromKey(Key.majorKey(k), tonic));
		ret.push(...searchFromKey({ type: 'minor', ...Key.minorKey(k).harmonic}, tonic));
	}
	return ret.sort( (a, b) => a.index - b.index );
}

const fretboardNotes = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].reverse().map(n => {
	const open = Note.get(n).midi;
	return Array(24).fill().map( (_, i) => {
		return Note.fromMidi(open + i);
	});
});

const DEFAULT_OPTIONS = Object.freeze({
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

	const midi = await navigator.requestMIDIAccess();
	const outputs = midi.outputs;

	if (outputs.size === 0) {
		console.log('no output devices are found');
		return;
	}

	for (let output of outputs.values()) {
		console.log(output);
		for (let note of notes) {
			output.send(noteOn(note, 100));
			output.send(noteOff(note), window.performance.now() + 500);
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

		this.fretboard.on('mousemove', ({ fret, string }) => {
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
			this.fretboard.wrapper.selectAll('.muted-string').remove();
			this.fretboard.muteStrings({
				strings: Array.from(mutes.values()),
				width: 20,
				stringWidth: 3,
				stroke: "#333"
			})
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
			for (let dot of this.dots) {
				dot.string = (dot.string - 1 + 1 + 6) % 6 + 1;
				if (dot.string === 3) {
					dot.fret--;
				}
				dot.note = fretboardNotes[dot.string - 1][dot.fret];
			}
			this.updateDotsAndMutes();
			this.updateFoundChords();
			this.updateHashParams();
		},

		higherString: function () {
			for (let dot of this.dots) {
				dot.string = (dot.string - 1 - 1 + 6) % 6 + 1;
				if (dot.string === 2) {
					dot.fret++;
				}
				dot.note = fretboardNotes[dot.string - 1][dot.fret];
			}
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
					// chord.chordNotes
					chord.chordKeys = searchKeys(Chord.get(chord.names[0]));
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


