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
			const chordNotes = chordType.intervals.map((interval) => ({
				interval,
				chroma:Note.chroma(Note.transpose(tonic, interval)), 
				name: Note.transpose(tonic, interval),
				existing: notes.some((note) => Note.chroma(note) === Note.chroma(Note.transpose(tonic, interval))),
			}));

			let names = chordType.aliases.map((alias) => noteName(index) + alias);
			const chord = Chord.get(names[0]);
			const basePc = Note.enharmonic(base.pc);
			
			// weight計算を新しい関数に委譲
			const weight = calculateChordWeight({
				selectedNotes: notes,
				chordType,
				chordNotes,
				base,
				tonic
			});
			
			// on chord
			if (basePc !== tonic) {
				const baseNote = chordNotes.find((note) => Note.get(note.name).chroma === base.chroma);
				names = names.map((name) => name + "/" + (baseNote ? baseNote.name : basePc));
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

/**
 * コードの重みを計算する
 * @param {Object} params - 計算に必要なパラメータ
 * @param {Array} params.selectedNotes - 選択されたノート配列
 * @param {Object} params.chordType - コードタイプ情報
 * @param {Array} params.chordNotes - コードの構成音
 * @param {Object} params.base - ベース音
 * @param {string} params.tonic - ルート音
 * @returns {number} 0-1の範囲の重み値
 */
export function calculateChordWeight(params) {
	const { selectedNotes, chordType, chordNotes, base, tonic } = params;
	
	// 複数のアルゴリズムを切り替え可能にする
	// return calculateWeightJaccard(params);  // 現在のアルゴリズム
	return calculateWeightAdvanced(params);    // 新しいアルゴリズム
}

// 現在のJaccardベースのアルゴリズム
function calculateWeightJaccard(params) {
	const { selectedNotes, chordType, base, tonic } = params;
	const searchSetNum = Pcset.num(selectedNotes.map(n => n.pc || n));
	
	let weight = popCount(chordType.setNum & searchSetNum) / 
				 popCount(chordType.setNum | searchSetNum);
	
	// 転回形のペナルティ
	const basePc = Note.enharmonic(base.pc);
	if (basePc !== tonic) {
		weight *= 0.99;
	}
	
	return weight;
}

// コード名からタイプの優先度を判定
function getChordTypePriority(chordType) {
	// aliasesを小文字で結合して判定
	const aliasesStr = chordType.aliases.join(' ').toLowerCase();
	
	// 特殊なコードは低めの優先度
	if (aliasesStr.includes('dim')) return 0.9;      // Diminished
	if (aliasesStr.includes('aug')) return 0.9;      // Augmented
	if (aliasesStr.includes('m7b5')) return 0.85;    // Half-diminished
	if (aliasesStr.includes('alt')) return 0.85;     // Altered
	
	// sus系は中程度の優先度
	if (aliasesStr.includes('sus')) return 0.95;
	
	// add系、6、9系は高めの優先度
	if (aliasesStr.includes('add')) return 0.98;
	if (aliasesStr.match(/\b6\b/)) return 0.98;
	if (aliasesStr.match(/\b9\b/) && !aliasesStr.includes('b9') && !aliasesStr.includes('#9')) return 0.98;
	
	// 7thコード（maj7以外）
	if (aliasesStr.match(/\b7\b/) && !aliasesStr.includes('maj7') && !aliasesStr.includes('M7')) return 0.97;
	
	// メジャー、マイナー、maj7は最高優先度
	return 1.0;
}

// 改善された重み計算アルゴリズム
function calculateWeightAdvanced(params) {
	const { selectedNotes, chordType, chordNotes, base, tonic } = params;
	
	// 1. ノートマッチングスコア
	const selectedSet = new Set(selectedNotes.map(n => n.chroma));
	const chordSet = new Set(chordNotes.map(n => n.chroma));
	
	let matchScore;
	const isPerfectMatch = selectedSet.size === chordSet.size && 
		[...selectedSet].every(n => chordSet.has(n));
	
	if (isPerfectMatch) {
		matchScore = 1.0; // 完全一致
	} else {
		const common = [...selectedSet].filter(n => chordSet.has(n)).length;
		const missing = chordSet.size - common;
		const extra = selectedSet.size - common;
		
		matchScore = common / Math.max(selectedSet.size, chordSet.size);
		matchScore *= Math.pow(0.9, missing);  // 不足音ペナルティ
		matchScore *= Math.pow(0.95, extra);   // 余分音ペナルティ
	}
	
	// 2. コードタイプ優先度 - 完全一致の場合はスキップ
	let typeScore = 1.0;
	if (!isPerfectMatch) {
		typeScore = getChordTypePriority(chordType);
	}
	
	// 3. 転回形ペナルティ
	let inversionPenalty = 1.0;
	const basePc = Note.enharmonic(base.pc);
	if (basePc !== tonic) {
		const interval = Interval.distance(tonic, basePc);
		const inversionMap = {
			'3M': 0.9, '3m': 0.9,     // 第1転回形
			'5P': 0.85,                // 第2転回形
			'7M': 0.8, '7m': 0.8,      // 第3転回形
		};
		inversionPenalty = inversionMap[interval] || 0.7;
	}
	
	return matchScore * typeScore * inversionPenalty;
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
