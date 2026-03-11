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
});
