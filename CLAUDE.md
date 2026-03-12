# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a guitar fretboard visualization and search tool implemented as a pure HTML/JavaScript web application. The project helps visualize and search guitar fretboards, chords, and scales.

## Key Features

1. **Menu** (index.html) - Entry point to all tools
2. **CAGED System Visualization** (position.html) - Displays CAGED system positions and pentatonic scales
3. **Chord Lookup** (chord.html) - Search for chords based on fretboard positions
4. **Scale Lookup** (scale.html) - Find scales from notes or chords

## Architecture

This is a client-side only application with no build process. Files are served directly:

- **Vite** - Used for development and build process
- **Libraries**:
  - fretboard.js@0.2.13 - Main fretboard visualization library
  - tonal.js - Music theory calculations
  - Vue.js 3 - UI framework
  - Vuetify 3 - UI component library

## Development Workflow

Since this is a static site with no build process:

1. **Running the application**: Open HTML files directly in a browser or serve with any static file server (e.g., `npx serve`)
2. **Making changes**: Edit JavaScript files directly - changes are immediately reflected on page reload
3. **Testing**: Manual testing by opening the HTML files and verifying functionality

## Core Components

### Music Theory Logic
- **chord.js**: Contains `searchChordByNotes()` function that identifies chords from selected notes using bit manipulation for efficient chord matching
- **scale.js**: Contains `searchScales()` function that matches note patterns to known scales with weighted results

### Visualization
- **script.js**: Defines CAGED box patterns and fretboard marker rendering for the main visualization
- Uses SVG-based rendering through fretboard.js library

### Data Structures
- CAGED boxes are defined as string arrays with numbers representing scale degrees
- Chord and scale matching uses bitwise operations on note sets for performance
- Weight-based sorting to show most likely matches first

## Key Implementation Details

- All note calculations use chromatic numbers (0-11) internally
- Enharmonic equivalents are handled via `Note.enharmonic()`
- Vue.js manages UI state and reactivity
- URL hash parameters store application state
