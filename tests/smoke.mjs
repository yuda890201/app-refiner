/**
 * App Refiner スモークテスト（Playwright）
 *
 * 使い方:
 *   npx http-server -p 8899 -s .     # リポジトリ直下で静的配信
 *   node tests/smoke.mjs             # 別ターミナルで実行
 *
 * 注意: CDN（cdn.tailwindcss.com / cdnjs）に到達できない環境では見た目が崩れますが、
 * ここで検証しているのは機能なのでテスト結果には影響しません。
 * スクリーンショットの出力先は環境変数 SHOT で変更できます。
 */
import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true, hasTouch: true,
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto('http://127.0.0.1:8899/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const log = [];
const ok = (n, c) => log.push((c ? 'PASS ' : 'FAIL ') + n);

// STEP1: 初期アプリ3件
const cards = await page.locator('[data-app-card]').count();
ok('初期アプリ3件 (got ' + cards + ')', cards === 3);

// プレビューボックス存在
ok('プレビュー領域あり', await page.locator('.preview-box').count() === 3);

// アプリ追加
await page.click('#btnAddApp');
await page.fill('#appName', 'App Refiner');
await page.fill('#appRepo', 'app-refiner');
await page.locator('#appRepo').blur();
await page.waitForTimeout(100);
const autoUrl = await page.inputValue('#appUrl');
ok('リポジトリ名からURL自動補完 (' + autoUrl + ')', autoUrl === 'https://yuda890201.github.io/app-refiner/');
await page.fill('#appMemo', 'この司令塔アプリ自身');
await page.click('#btnSaveApp');
await page.waitForTimeout(300);
ok('アプリ追加で4件', await page.locator('[data-app-card]').count() === 4);

// 追加したアプリが選択中になっている
await page.waitForTimeout(200);
const selMark = await page.locator('[data-app-card] [data-selected-mark]:not([hidden])').count();
ok('選択中バッジ1件 (got ' + selMark + ')', selMark === 1);

// STEP2: 改修する → composeタブへ
await page.locator('[data-app-card]').nth(3).locator('[data-act="select"]').click();
await page.waitForTimeout(400);
ok('指示書タブが表示', await page.locator('#tab-compose').isVisible());
ok('対象アプリ名が表示', (await page.locator('#composeTarget').innerText()).includes('App Refiner'));

// プリセット追記
await page.locator('[data-preset="スマホ最適化"]').click();
await page.locator('[data-preset="バグ修正"]').click();
await page.waitForTimeout(100);
const body = await page.inputValue('#reqBody');
ok('プリセット2件追記', body.includes('スマホ最適化') && body.includes('バグ修正'));
ok('文字数カウンタ更新', (await page.locator('#reqCount').innerText()).includes(String(body.length)));

// 種類・優先度
await page.selectOption('#reqType', 'UI改善');
await page.selectOption('#reqPriority', '高');

// STEP3: 生成
await page.click('#btnGenerate');
await page.waitForTimeout(400);
const out = await page.locator('#outputText').innerText();
ok('生成物に @App Studio', out.startsWith('@App Studio'));
ok('生成物にアプリ名見出し', out.includes('# 改修指示書：App Refiner'));
ok('生成物にリポジトリ', out.includes('* 対象リポジトリ: app-refiner'));
ok('生成物に公開URL', out.includes('* 公開URL: https://yuda890201.github.io/app-refiner/'));
ok('生成物に種類/優先度', out.includes('* 改修の種類: UI改善 / 優先度: 高'));
ok('生成物に改修要望節', out.includes('## 改修要望'));
ok('生成物に制約3項目', out.includes('* 既存の機能を壊さないこと。') && out.includes('* index.html 単一ファイル構成を維持すること。') && out.includes('* 変更点を箇条書きで報告すること。'));

// コピー → 履歴保存
await page.click('#btnCopy');
await page.waitForTimeout(500);
const clip = await page.evaluate(() => navigator.clipboard.readText());
ok('クリップボード内容一致', clip.trim() === out.trim());

// 履歴タブ
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(400);
ok('履歴1件', await page.locator('[data-history]').count() === 1);
ok('履歴バッジ表示', await page.locator('#historyBadge').isVisible());

// 二重コピーで重複しない
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.click('#btnCopy');
await page.waitForTimeout(400);
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(300);
ok('再コピーでも履歴は1件のまま', await page.locator('[data-history]').count() === 1);

// 対応済みトグル
await page.locator('[data-history] input[data-act="done"]').check();
await page.waitForTimeout(300);
ok('対応済みでバッジ消える', !(await page.locator('#historyBadge').isVisible()));
ok('フィルタ: 対応済み1件', (await page.locator('[data-filter="done"]').innerText()).includes('1'));
await page.locator('[data-filter="open"]').click();
await page.waitForTimeout(200);
ok('未対応フィルタで0件表示', await page.locator('[data-history]').count() === 0);
await page.locator('[data-filter="all"]').click();
await page.waitForTimeout(200);

// 履歴からの再コピー
await page.evaluate(() => navigator.clipboard.writeText('x'));
await page.locator('[data-history] [data-act="copy"]').click();
await page.waitForTimeout(400);
const clip2 = await page.evaluate(() => navigator.clipboard.readText());
ok('履歴から再コピー', clip2.includes('# 改修指示書：App Refiner'));

// 永続化（リロード）
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
ok('リロード後もアプリ4件', await page.locator('[data-app-card]').count() === 4);
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(300);
ok('リロード後も履歴1件', await page.locator('[data-history]').count() === 1);
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.waitForTimeout(200);
ok('リロード後も下書き保持', (await page.inputValue('#reqBody')).includes('スマホ最適化'));

// エクスポート
await page.click('#btnSettings');
await page.waitForTimeout(300);
await page.click('#btnExportCopy');
await page.waitForTimeout(400);
const exported = await page.inputValue('#exportText');
let parsed = null; try { parsed = JSON.parse(exported); } catch {}
ok('エクスポートJSONが妥当', !!parsed && parsed.apps.length === 4 && parsed.history.length === 1);

// インポート（置き換え）
const payload = JSON.stringify({ app: 'app-refiner', version: 1, apps: [{ id: 'x1', name: 'Imported', repo: 'imported-app', url: 'https://example.com/', memo: 'm' }], history: [] });
await page.fill('#importText', payload);
await page.click('#btnImportReplace');
await page.waitForTimeout(200);
await page.click('#confirmOk');
await page.waitForTimeout(400);
await page.locator('[data-close="settingsModal"]').first().click();
await page.locator('.nav-btn[data-tab="tab-apps"]').click();
await page.waitForTimeout(400);
ok('置き換えインポートで1件', await page.locator('[data-app-card]').count() === 1);
ok('インポートしたアプリ名', (await page.locator('[data-app-card]').innerText()).includes('Imported'));

// 履歴全削除の確認ダイアログ
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(300);
await page.click('#btnClearHistory');
await page.waitForTimeout(300);
ok('履歴なしで全削除は警告のみ', await page.locator('#confirmModal').isHidden());

// 初期化
await page.click('#btnSettings');
await page.waitForTimeout(200);
await page.click('#btnResetAll');
await page.waitForTimeout(200);
ok('初期化で確認ダイアログ', await page.locator('#confirmModal').isVisible());
await page.click('#confirmOk');
await page.waitForTimeout(500);
await page.locator('.nav-btn[data-tab="tab-apps"]').click();
await page.waitForTimeout(300);
ok('初期化でプリセット3件に戻る', await page.locator('[data-app-card]').count() === 3);

// プレビュー不可の表示（存在しないURL）
await page.click('#btnAddApp');
await page.fill('#appName', 'Broken');
await page.fill('#appUrl', '');
await page.click('#btnSaveApp');
await page.waitForTimeout(600);
const fbTexts = await page.locator('.preview-fallback').allInnerTexts();
ok('URL未設定はプレビュー不可表示', fbTexts.some(t => t.includes('プレビュー不可')));

await page.screenshot({ path: process.env.SHOT || 'shot.png', fullPage: false });
console.log(log.join('\n'));
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
process.exit(log.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
