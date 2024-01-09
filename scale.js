// import Note from 'https://cdn.jsdelivr.net/npm/@tonaljs/note@4.10.0/+esm';
import { Key, Pcset, Chord, ChordType, Interval, Note, Scale, ScaleType } from 'https://cdn.jsdelivr.net/npm/tonal@5.1.0/+esm';

const scaleWeight = new Map();
scaleWeight.set("major", 1);
scaleWeight.set("minor", 0.95);
scaleWeight.set("melodic minor", 0.9);
scaleWeight.set("harmonic minor", 0.9);
scaleWeight.set("major blues", 0.8);
scaleWeight.set("minor blues", 0.8);
scaleWeight.set("bebop", 0.8);
scaleWeight.set("diminished", 0.8);
scaleWeight.set("dorian", 0.7);
scaleWeight.set("lydian", 0.7);
scaleWeight.set("mixolydian", 0.7);
scaleWeight.set("phrygian", 0.7);
scaleWeight.set("locrian", 0.7);

function noteName(index) {
	return Note.enharmonic(Note.get(Note.fromMidi(index)).pc);
}

function bitCount (n) {
	n = n - ((n >> 1) & 0x55555555)
	n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
	return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

function searchScales (allNotes) {
	allNotes = Pcset.get(allNotes);

	console.log('searchScales', allNotes);
	const ret  = [];
	Pcset.modes(allNotes, false).forEach((mode, index) => {
		const setNum = Pcset.num(mode);
		const tonic = Note.enharmonic(Note.get(Note.fromMidi(index)).pc);
		// console.log(`${tonic} ${mode} ${index}`);
		ScaleType.all().forEach(x => {
			if (x.intervals.length !== 7) {
				return;
			}

			// mismatched bit count
			const mismatched = bitCount(x.setNum ^ setNum);
			const weight = 1 - (mismatched / x.intervals.length);
			// console.log(`${mismatched} ${tonic} ${x.name}`);
			if (weight < 0.5) {
				return;
			}
			ret.push({
				scale: x,
				tonic,
				weight,
			});
		});
	});
	return ret;
}

Vue.createApp({
	data() {
		return {
			tab: 'chords',

			chords: "C Dm Em F G Am Bdim",
			notes: "",

			foundChords: [],
			foundScales: [],

			options: {
			},
		}
	},

	computed: {
	},

	watch: {
		options: {
			handler: function () {
				this.updateHashParams();
			},
			deep: true
		},

		tab : function () {
			this.updateHashParams();
		},

		chords: function () {
			this.updateByChords();
			this.updateHashParams();
		},

		notes: function () {
			this.updateByNotes();
			this.updateHashParams();
		},
	},

	mounted() {
		this.loadHashParams();
		this.updateByChords();
	},

	methods: {
		update: function (allNotes) {
			const ret = searchScales(allNotes);
			this.foundScales = ret.sort((a, b) => (b.weight - a.weight) || ( (scaleWeight.get(b.scale.name) || 0) - (scaleWeight.get(a.scale.name) || 0))).filter(x => x.weight > 0.6).map(item => {
				const intervals = Array.from(item.scale.intervals).map( x => Interval.get(x).semitones);
				const notes = intervals.map(i => Note.transpose(item.tonic, Interval.fromSemitones(i)));
				const chords = [];

				for (let i = 0; i < intervals.length; i++) {
					// const ci = [ intervals[0], intervals[2], intervals[4] ];
					const ci = [ intervals[0], intervals[2], intervals[4], intervals[6] ];
					const cii = ci.map(x => x - ci[0]).map(x => x < 0 ? x + 12 : x);
					const found = ChordType.all().find(x => {
						if (x.intervals.length !== cii.length) {
							return false;
						}
						return x.intervals.map(i => Interval.get(i).semitones).join(',') === cii.join(',')
					});

					chords.push({
						grade: i,
						tonic: notes[i],
						notes: found ? found.intervals.map(j => Note.transpose(notes[i], Interval.get(j))) : [],
						aliases: [],
						...found,
					});

					intervals.push(intervals.shift());
				}
				return {
					...item,
					notes,
					chords,
				};
			});
		},

		updateByNotes: function () {
			const allNotes = this.notes.split(/\s*,\s*|\s+/).map(s => Note.get(s)).filter(x => !x.empty).map(x => x.pc);
			this.update(allNotes);
		},

		updateByChords: function () {
			let chords = this.chords.split(/\s*,\s*|\s+/).map(s => ({
				...Chord.get(s),
				src: s
			})).filter(x => x.notes.length > 0);
			this.foundChords = chords;

			const allNotes = chords.map(x => x.notes).flat().sort();
			this.notes = Array.from(new Set(allNotes).values()).join(' ');
			this.update(allNotes);
		},

		updateHashParams: function () {
			console.log('updateHashParams');
			const params= new URLSearchParams(location.hash.substring(1));
			params.delete("chords");
			params.delete("notes");
			if (this.tab === 'chords') {
				params.set("chords", this.chords);
			} else {
				params.set("notes", this.notes);
			}
			history.replaceState(null, "", "#" + params.toString());
		},

		loadHashParams: function () {
			const params = new URLSearchParams(location.hash.substring(1));
			if (params.get("chords")) {
				this.tab = 'chords';
				this.chords = params.get("chords") || "";
			}
			
			if (params.get("notes")) {
				this.tab = 'notes';
				this.notes = params.get("notes") || "";
			}
		},

		formatNote: function (str) {
			if (!str) return "";
			return str.
				replace(/##/g, '\uD834\uDD2A').
				replace(/#/g, '\u266F').
				replace(/bb/g, '\uD834\uDD2B').
				replace(/b/g, '\u266D');
		},

		formatGrade: function (str) {
			if (!str) return "";
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

		numberToGrade: function (n) {
			return [ "I", "II", "III", "IV", "V", "VI", "VII" ][n];
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



