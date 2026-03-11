# Fretboard 

This repository is a tool for visualizing and searching guitar fretboards, chords, and scales. Below is an overview of the main files and directories:

## File Structure

- [`chord.html`]( https://cho45.stfuawsc.com/fletboard/chord.html )
  Lookup chord from fretboard.

- [`index.html`](https://cho45.stfuawsc.com/fletboard/ )
  Displays CAGED system, pentatonic scales, etc.

- [`scale.html`](https://cho45.stfuawsc.com/fletboard/scale.html )
  Lookup scale from notes or chord

## Development

This project uses [Vite](https://vitejs.dev/) for development and building.

### Setup

```bash
npm install
```

### Local Development

Start the development server:

```bash
npm run dev
```

### Build

Build the project for production:

```bash
npm run build
```

The output will be in the `dist/` directory.

### Testing

#### Unit Tests (Vitest)

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm run test
```

#### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e
```

## GitHub Actions

- **CI**: Runs unit tests and E2E tests on every push to `main` and pull requests.
- **Deploy**: Automatically builds and deploys to GitHub Pages when changes are pushed to the `main` branch.

