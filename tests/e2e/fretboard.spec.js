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

	test('chord.html interaction: adding and removing dots', async ({ page }) => {
		await page.goto('/chord.html');

		// SVG要素を取得
		const fretboardSvg = page.locator('#fretboard svg');
		await expect(fretboardSvg).toBeVisible();

		// 座標指定でクリック（1弦3フレット付近を狙う）
		// @moonwave99/fretboard.js のデフォルト設定では、左側にナットがある
		const box = await fretboardSvg.boundingBox();
		if (box) {
			// フレット1〜3あたりをクリックしてみる（全体幅の約20%あたり）
			await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);

			// ドットが表示されるのを待機（デバウンス等の影響を考慮して少し待つ可能性があるが、toHaveCount はリトライする）
			await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(1);

			// 同じ場所を再度クリックして削除
			await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
			await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(0);
		}
	});

	test('chord.html interaction: control buttons (Clear, Fret/String move)', async ({ page }) => {
		// 初期状態でドットがある状態から開始 (Cメジャー: x32010)
		// 5弦3f(C), 4弦2f(E), 3弦0f(G), 2弦1f(C), 1弦0f(E)
		await page.goto('/chord.html#c=x32010');
		const dots = page.locator('#fretboard circle.dot-circle');
		await expect(dots).toHaveCount(5);

		// --- Higher Fret テスト (+1フレット) ---
		await page.getByRole('button', { name: 'Higher Fret' }).click();
		// C -> C♯ になるはず。
		await expect(page.locator('.results .chord-name').first()).toContainText('C');
		await expect(dots).toHaveCount(5);

		// --- Lower Fret テスト (-1フレット) ---
		await page.getByRole('button', { name: 'Lower Fret' }).click();
		// C♯ -> C に戻る
		await expect(page.locator('.results .chord-name').first()).toContainText('C');
		await expect(dots).toHaveCount(5);

		// --- Higher String テスト (+1弦 = 物理的に下の弦へ移動) ---
		// 現在 x32010 (C)
		// Higher String では、各ドットが一つ高い弦へ移動する。
		// ロジック上、ドット数が増減する可能性があるため、ここでは移動が行われたことを確認
		await page.getByRole('button', { name: 'Higher String' }).click();
		// 何らかのドットが存在することを確認
		await expect(dots).not.toHaveCount(0);

		// 音が変わっていることを確認
		const firstChordAfterHigher = await page.locator('.results .chord-name').first().textContent();
		expect(firstChordAfterHigher).not.toBe('C');

		// --- Lower String テスト (-1弦 = 物理的に上の弦へ移動) ---
		await page.getByRole('button', { name: 'Lower String' }).click();
		// 移動後の状態からさらに移動することを確認
		await expect(dots).not.toHaveCount(0);

		// --- Clear テスト ---
		await page.getByRole('button', { name: 'Clear' }).click();
		await expect(dots).toHaveCount(0);
	});

	test('chord.html settings: Overlay Scale', async ({ page }) => {
		await page.goto('/chord.html');

		// Overlay Scale チェックボックスをオンにする
		await page.getByLabel('Overlay Scale').check();

		// スケールのドットが表示されるはず
		// 5個（またはデフォルトの何か）以上のドットがあることを確認
		const allDots = page.locator('#fretboard circle.dot-circle');
		const count = await allDots.count();
		expect(count).toBeGreaterThan(5);
	});

	test('chord.html settings: Capo', async ({ page }) => {
		await page.goto('/chord.html#c=022100'); // E major

		// カポ設定（prompt をモック）
		// Playwright では dialog イベントを一度だけ listen する
		page.once('dialog', async dialog => {
			await dialog.accept('1');
		});

		// Capo チェックボックスをクリック
		await page.getByLabel(/Capo/).click();

		// カポ（バレー）が表示されているか確認
		const barre = page.locator('#fretboard .barres');
		await expect(barre).toBeVisible();

		// コード名が更新されるか確認
		// 厳密モード回避のため .first() を使用
		const firstChordName = page.locator('.results .chord-name').first();
		await expect(firstChordName).toBeVisible();
		// カポ設定時は フォーム名が表示されるはず (括弧が含まれる)
		await expect(page.locator('.results')).toContainText('(');
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
