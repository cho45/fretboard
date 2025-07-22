import { Key, Pcset, Chord, ChordType, Interval, Note, Scale } from 'tonal';

export function popCount (x) {
		const a = x - (x >>> 1 & 0x55555555);
		const b = (a & 0x33333333) + (a >>> 2 & 0x33333333);
		const c = b + (b >>> 4) & 0x0f0f0f0f;
		const y = c * 0x01010101 >>> 24;
		return y;
}

export function noteName(index) {
	return Note.enharmonic(Note.get(Note.fromMidi(index)).pc);
}


export function searchChordByNotes(notes) {
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
			// on chord
			if (basePc !== tonic) {
				const baseNote = chordNotes.find((note) => Note.get(note.name).chroma === base.chroma);
				names = names.map((name) => name + "/" + (baseNote ? baseNote.name : basePc));
				weight *= 0.99;
			}

			return {
				...chordType,
				weight,
				names,
				base,
				tonic,
				chordNotes,
			};
		})

		ret.push(...types);
	});

	ret.sort( (a, b) => b.weight - a.weight );

	return ret;
}

export function searchKeys (chord) {
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
