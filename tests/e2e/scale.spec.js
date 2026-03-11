import { test, expect } from '@playwright/test';

test.describe('Scale Search Page', () => {
	test('scale.html should render search interface', async ({ page }) => {
		await page.goto('/scale.html');
		await expect(page).toHaveTitle(/Scale Search/);

		// Chords と Notes のタブが存在することを確認
		const tabs = page.locator('.v-tabs');
		await expect(tabs).toContainText('Chords');
		await expect(tabs).toContainText('Notes');

		// 結果セクションが存在することを確認
		const resultsHeader = page.locator('h2', { hasText: 'Result' });
		await expect(resultsHeader).toBeVisible();
	});

	test('scale.html: Chord Search and Result Display', async ({ page }) => {
		await page.goto('/scale.html');
		
		// 1. Chords タブで検索
		const chordsTextarea = page.getByLabel('Chords');
		await chordsTextarea.fill('C Am F G');
		
		// 構成音カードが表示されるか確認 (C major の各コード)
		await expect(page.locator('.v-window-item .v-card-title', { hasText: /^C$/ }).first()).toBeVisible();
		await expect(page.locator('.v-window-item .v-card-title', { hasText: /^Am$/ }).first()).toBeVisible();
		
		// 検索結果 (Result) に C major 等が表示されているか確認
		// タイトル部分に "C major" が完全に一致し、かつ "100%" を含むカードを探す
		const resultCard = page.locator('.v-card', { hasText: /^C major/ }).filter({ hasText: '100%' });
		await expect(resultCard).toBeVisible();
	});

	test('scale.html: Notes Tab and Synchronization', async ({ page }) => {
		await page.goto('/scale.html');
		
		// 1. Chords タブで入力
		await page.getByLabel('Chords').fill('C');
		
		// 2. Notes タブへ切り替え
		await page.getByRole('tab', { name: 'Notes' }).click();
		
		// Chords の構成音 (C E G) が Notes タブに反映されているか確認
		const notesTextarea = page.getByLabel('Notes');
		const notesValue = await notesTextarea.inputValue();
		expect(notesValue).toContain('C');
		expect(notesValue).toContain('E');
		expect(notesValue).toContain('G');

		// 3. Notes で直接検索
		await notesTextarea.fill('C D E F G A B');
		await expect(page.locator('.v-card-title', { hasText: 'C major' }).first()).toBeVisible();
	});

	test('scale.html: URL Hash Synchronization and Persistence', async ({ page }) => {
		// ハッシュ付きURLで直接アクセス (Chords: G Em C D)
		await page.goto('/scale.html#chords=G+Em+C+D');
		
		// 入力内容が復元されているか確認
		await expect(page.getByLabel('Chords')).toHaveValue('G Em C D');
		
		// 検索結果が表示されているか確認 (G major 等)
		await expect(page.locator('.v-card-title', { hasText: 'G major' }).first()).toBeVisible();

		// 入力を変更してURLが変わるか確認
		await page.getByLabel('Chords').fill('A');
		await page.waitForTimeout(500); // debounce等がある可能性を考慮
		expect(page.url()).toContain('chords=A');
	});
});
