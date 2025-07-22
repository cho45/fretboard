import { describe, it, expect } from 'vitest';
import { searchChordByNotes, searchKeys, popCount, noteName } from '../chord-search.js';
import { Chord } from 'tonal';

describe('chord-search functions', () => {
  describe('popCount', () => {
    it('should count set bits correctly', () => {
      expect(popCount(0b0000)).toBe(0);
      expect(popCount(0b0001)).toBe(1);
      expect(popCount(0b0011)).toBe(2);
      expect(popCount(0b0111)).toBe(3);
      expect(popCount(0b1111)).toBe(4);
      expect(popCount(0b10101010)).toBe(4);
    });
  });

  describe('noteName', () => {
    it('should return correct note names', () => {
      expect(noteName(0)).toBe('C');
      expect(noteName(1)).toBe('C#');
      expect(noteName(2)).toBe('D');
      expect(noteName(3)).toBe('D#');
      expect(noteName(4)).toBe('E');
      expect(noteName(5)).toBe('F');
      expect(noteName(6)).toBe('F#');
      expect(noteName(7)).toBe('G');
      expect(noteName(8)).toBe('G#');
      expect(noteName(9)).toBe('A');
      expect(noteName(10)).toBe('A#');
      expect(noteName(11)).toBe('B');
    });
  });

  describe('searchChordByNotes', () => {
    it('should return empty array for empty input', () => {
      expect(searchChordByNotes([])).toEqual([]);
    });

    it('should identify C major chord', () => {
      const results = searchChordByNotes(['C4', 'E4', 'G4']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tonic).toBe('C');
      expect(results[0].names[0]).toMatch(/^C/);
      expect(results[0].weight).toBeGreaterThan(0.9);
    });

    it('should identify A minor chord', () => {
      const results = searchChordByNotes(['A3', 'C4', 'E4']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tonic).toBe('A');
      expect(results[0].names[0]).toContain('m');
    });

    it('should identify G7 chord', () => {
      const results = searchChordByNotes(['G3', 'B3', 'D4', 'F4']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tonic).toBe('G');
      expect(results[0].names[0]).toContain('7');
    });

    it('should identify C/E inversion', () => {
      const results = searchChordByNotes(['E3', 'G3', 'C4']);
      expect(results.length).toBeGreaterThan(0);
      
      const cMajorInversion = results.find(chord => 
        chord.tonic === 'C' && chord.names[0].includes('/E')
      );
      expect(cMajorInversion).toBeTruthy();
    });

    it('should throw error when no octave specified', () => {
      expect(() => {
        searchChordByNotes(['C', 'E', 'G']);
      }).toThrow(/octave must be specified/);
    });
  });

  describe('searchKeys', () => {
    it('should find keys for C major chord', () => {
      const cMajorChord = Chord.get('C');
      const keys = searchKeys(cMajorChord);
      
      expect(keys.length).toBeGreaterThan(0);
      
      const cMajorInCKey = keys.find(k => k.key === 'C' && k.grade === 'I');
      expect(cMajorInCKey).toBeTruthy();
    });

    it('should return empty array for unknown quality chord', () => {
      const unknownChord = {
        quality: 'Unknown',
        tonic: 'C',
        notes: ['C', 'E', 'G']
      };
      expect(searchKeys(unknownChord)).toEqual([]);
    });
  });
});
