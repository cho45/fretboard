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

	test('chord.html#c=x32010 should load C major chord', async ({ page }) => {
		// Cメジャー (x32010) のハッシュを付けてコードページに遷移
		await page.goto('/chord.html#c=x32010');

		// アプリには検索前に100msのデバウンスがあり、その後にDOMが更新される
		// 結果テーブルに "C" というコード名が表示されるのを待機
		const chordName = page.locator('.results .chord-name').first();
		await expect(chordName).toContainText('C');

		// Cメジャーの構成音 (C, E, G) が正しく表示されているか確認
		const noteNames = page.locator('.results .note-name');
		const notesText = await noteNames.allTextContents();
		// Cメジャーの音: C, E, G。UIでは記号付きでフォーマットされている可能性がある。
		expect(notesText.some(t => t.includes('C'))).toBeTruthy();
		expect(notesText.some(t => t.includes('E'))).toBeTruthy();
		expect(notesText.some(t => t.includes('G'))).toBeTruthy();

		// フレットボード上の選択されたドットの数を確認
		// chord.js では、選択されたドットは特定のHSLフィルを持ち、'selected' プロパティが設定される
		// @moonwave99/fretboard.js のソースによると、ドットは 'circle.dot-circle' としてレンダリングされる
		const dots = page.locator('#fretboard circle.dot-circle');
		await expect(dots).toHaveCount(5);
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
