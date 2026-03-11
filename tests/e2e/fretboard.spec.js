import { test, expect } from '@playwright/test';

test.describe('Fretboard App', () => {
	test('index.html should render fretboard', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Fretboard/);
		// Check if the svg fretboard is rendered
		const fretboard = page.locator('#fretboard-all svg');
		await expect(fretboard).toBeVisible();

		// Check if some root selection exists
		const rootSelect = page.locator('.v-select').first();
		await expect(rootSelect).toBeVisible();
	});

	test('chord.html should render and allow interaction', async ({ page }) => {
		await page.goto('/chord.html');
		await expect(page).toHaveTitle(/Chord Search/);

		const fretboard = page.locator('#fretboard svg');
		await expect(fretboard).toBeVisible();

		// Verify results table exists
		const resultsTable = page.locator('.results table');
		await expect(resultsTable).toBeVisible();
	});

	test('scale.html should render search interface', async ({ page }) => {
		await page.goto('/scale.html');
		await expect(page).toHaveTitle(/Scale Search/);

		// Check if tabs for Chords and Notes exist
		const tabs = page.locator('.v-tabs');
		await expect(tabs).toContainText('Chords');
		await expect(tabs).toContainText('Notes');

		// Check results section
		const resultsHeader = page.locator('h2', { hasText: 'Result' });
		await expect(resultsHeader).toBeVisible();
	});
});
