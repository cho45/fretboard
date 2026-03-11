import { test, expect } from '@playwright/test';

test.describe('Chord Search Page', () => {
	test('chord.html should render and allow interaction', async ({ page }) => {
		await page.goto('/chord.html');
		await expect(page).toHaveTitle(/Chord Search/);

		const fretboard = page.locator('#fretboard svg');
		await expect(fretboard).toBeVisible();

		// 結果テーブルが存在することを確認
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
		const dots = page.locator('#fretboard circle.dot-circle');
		await expect(dots).toHaveCount(5);
	});

	test('chord.html interaction: adding and removing dots', async ({ page }) => {
		await page.goto('/chord.html');

		// SVG要素を取得
		const fretboardSvg = page.locator('#fretboard svg');
		await expect(fretboardSvg).toBeVisible();

		// 座標指定でクリック（1弦3フレット付近を狙う）
		const box = await fretboardSvg.boundingBox();
		if (box) {
			// フレット1〜3あたりをクリックしてみる（全体幅の約20%あたり）
			await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);

			// ドットが表示されるのを待機
			await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(1);

			// 同じ場所を再度クリックして削除
			await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
			await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(0);
		}
	});

	test('chord.html interaction: control buttons (Clear, Fret/String move)', async ({ page }) => {
		// 初期状態でドットがある状態から開始 (Cメジャー: x32010)
		await page.goto('/chord.html#c=x32010');
		const dots = page.locator('#fretboard circle.dot-circle');
		await expect(dots).toHaveCount(5);

		// --- Higher Fret テスト (+1フレット) ---
		await page.getByRole('button', { name: 'Higher Fret' }).click();
		// C -> C♯ になるはず
		await expect(page.locator('.results .chord-name').first()).toContainText('C');
		await expect(dots).toHaveCount(5);

		// --- Lower Fret テスト (-1フレット) ---
		await page.getByRole('button', { name: 'Lower Fret' }).click();
		// C♯ -> C に戻る
		await expect(page.locator('.results .chord-name').first()).toContainText('C');
		await expect(dots).toHaveCount(5);

		// --- Higher String テスト (+1弦 = 物理的に下の弦へ移動) ---
		await page.getByRole('button', { name: 'Higher String' }).click();
		// 移動が行われたことを確認
		await expect(dots).not.toHaveCount(0);

		// 音が変わっていることを確認
		const firstChordAfterHigher = await page.locator('.results .chord-name').first().textContent();
		expect(firstChordAfterHigher).not.toBe('C');

		// --- Lower String テスト (-1弦 = 物理的に上の弦へ移動) ---
		await page.getByRole('button', { name: 'Lower String' }).click();
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
		const allDots = page.locator('#fretboard circle.dot-circle');
		const count = await allDots.count();
		expect(count).toBeGreaterThan(5);
	});

	test('chord.html settings: Capo', async ({ page }) => {
		await page.goto('/chord.html#c=022100'); // E major

		// カポ設定（prompt をモック）
		page.once('dialog', async dialog => {
			await dialog.accept('1');
		});

		// Capo チェックボックスをクリック
		await page.getByLabel(/Capo/).click();

		// カポ（バレー）が表示されているか確認
		const barre = page.locator('#fretboard .barres');
		await expect(barre).toBeVisible();

		// 括弧が含まれるフォーム名が表示されるか確認
		await expect(page.locator('.results')).toContainText('(');
	});

	test('chord.html: Chord Set interaction (Add, Select, Remove, Hash)', async ({ page }) => {
		// Cメジャーで開始
		await page.goto('/chord.html#c=x32010');

		// 1. セットに追加 (Add)
		// 最初の検索結果の「追加」ボタンをクリック
		const addButton = page.locator('.results .add-button').first();
		// Vuetifyのボタンやホバー時の表示を考慮して force: true か hover を検討
		await addButton.click({ force: true });

		// セット内にコードが表示されているか確認
		const chordSetItem = page.locator('.chord-set .chord-name');
		await expect(chordSetItem).toContainText('C');

		// 2. セットからの復元 (Select)
		// 一旦フレットボードをクリア
		await page.getByRole('button', { name: 'Clear' }).click();
		await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(0);

		// セット内のコード名をクリックして復元
		await chordSetItem.click();
		// ドットが5つに戻ることを確認
		await expect(page.locator('#fretboard circle.dot-circle')).toHaveCount(5);

		// 3. URLハッシュ同期の確認 (Hash)
		const url = page.url();
		expect(url).toContain('s=');

		// 4. セットからの削除 (Remove)
		// このアプリでは、追加ボタンと同じ場所が「削除」ボタン (mdi-minus) になる
		const removeButton = page.locator('.results .add-button').first(); // isInChordSet(chord) が true なのでマナイスボタンになっている
		await removeButton.click({ force: true });

		// セットが空になったことを確認
		await expect(chordSetItem).toHaveCount(0);
	});

	test('chord.html: Chord Set load from hash', async ({ page }) => {
		// 特定のセットを持つURLで直接アクセス (Cコードをセットに含む)
		// s=x32010-C
		await page.goto('/chord.html#s=x32010-C');

		// 初期状態でセットにコードが含まれているか
		const chordSetItem = page.locator('.chord-set .chord-name');
		await expect(chordSetItem).toContainText('C');
	});

	test('chord.html: Boundary interaction (fret limits)', async ({ page }) => {
		// 開放弦を含むコードで開始 (E major: 022100)
		await page.goto('/chord.html#c=022100');
		const dots = page.locator('#fretboard circle.dot-circle');

		// 1. Lower Fret 限界テスト (0フレット以下には行かない)
		await page.getByRole('button', { name: 'Lower Fret' }).click();
		// 0フレットがあるため全体数が 6 のまま維持されるはず
		await expect(dots).toHaveCount(6);

		// 2. Higher Fret 限界テスト (17フレットが上限)
		// ハイフレット (11フレット) で開始
		const highFretHash = '111111111111';
		await page.goto(`/chord.html#c=${highFretHash}`);
		await expect(dots).toHaveCount(6);

		// Higher Fret を連打して限界（17フレット）まで持っていく
		const higherButton = page.getByRole('button', { name: 'Higher Fret' });
		for (let i = 0; i < 10; i++) {
			await higherButton.click();
		}

		// URL に 17 が含まれていることを確認
		expect(page.url()).toContain('17');

		// さらにもう一度押しても 17 のままであること
		await higherButton.click();
		expect(page.url()).toContain('17');
	});

	test('chord.html: High fret hash sync', async ({ page }) => {
		// 10フレット以上のハイフレットコード (例: 全弦12フレット)
		const highFretHash = '121212121212';
		await page.goto(`/chord.html#c=${highFretHash}`);

		const dots = page.locator('#fretboard circle.dot-circle');
		await expect(dots).toHaveCount(6);

		// URLを再取得してハッシュが維持されているか確認
		const url = page.url();
		expect(url).toContain(highFretHash);
	});
});
