# やることリスト（棚卸し）

最終更新: 2026-09-13 / 凡例: ✅ 完了 ・ ⬜ 未着手 ・ 🔶 要判断

タスクは **App Refiner 本体** と **App Studio 側** の2系統に分かれています。
それぞれの詳細・完了条件・コピペ用の依頼文は下記のファイルにあります。

| 系統 | 対象 | 詳細 |
| --- | --- | --- |
| AR-* | このリポジトリの `index.html` | [tasks/app-refiner.md](tasks/app-refiner.md) |
| AS-* | App Studio MCP サーバー（別リポジトリ / Cloud Run） | [tasks/app-studio.md](tasks/app-studio.md) |

この2系統は独立して進められます。ただし **AS-1（`publish_custom_html`）が入るまでは、
App Refiner の改修は Claude Code からこのリポジトリへ直接コミットする運用**になります。

## ✅ 完了（2026-09-13 / PR #1 をマージ）

- STEP1 対象アプリ管理（カード一覧・追加・編集・削除・「開く」・選択状態）
- カード内 iframe 縮小プレビュー（遅延読み込み、失敗時「プレビュー不可」でレイアウト維持）
- STEP2 改修要望入力（クイックプリセット7種、改修の種類4種、優先度3段階、文字数カウンタ、下書き自動保存）
- STEP3 指示書生成・コピー（トースト通知）・コピー時の自動履歴保存
- STEP4 履歴（新しい順、再コピー、対応済みトグル、絞り込み、個別削除、全削除＋確認ダイアログ）
- 設定：JSON エクスポート／インポート（マージ・置き換え）・初期化
- localStorage の全アクセスを try/catch 化、失敗時は警告バナー＋一時保持で継続
- Playwright スモークテスト 34 項目（`tests/smoke.mjs`）

## ⬜ App Refiner 本体 — 詳細は [tasks/app-refiner.md](tasks/app-refiner.md)

✅ AR-2 / AR-4 / AR-5 / AR-6 / AR-7 / AR-9 / AR-10 / AR-11 / AR-12 は実装済み
（スモークテスト66項目・全PASS）。AR-1 の実機確認も完了。

残っているのは次の2件だけです。

| ID | 優先度 | 内容 | 状態 |
| --- | --- | --- | --- |
| AR-3 | 中 | 初期登録アプリの見直し | 🔶 app-refiner を追加済み。実際に運用しているアプリ一覧をもらえれば反映できます |
| AR-8 | 🔶 | PWA 化 | ⬜ 単一ファイル原則と衝突するため、原則を緩めるかの判断が必要 |

## ⬜ App Studio 側 — 詳細は [tasks/app-studio.md](tasks/app-studio.md)

| フェーズ | ID | 優先度 | 内容 |
| --- | --- | --- | --- |
| 入力 | AS-1 | 高 | 新規ツール `publish_custom_html`（任意の単一HTMLを直接デプロイ） |
| 入力 | AS-5 | 高 | スキーマで表現できない仕様を、黙って劣化させずエラーにする |
| 承認 | AS-3 | 高 | 承認通知が届かない問題の調査と承認待ち一覧ツール |
| 承認 | AS-4 | 中 | 承認前に「何を公開しようとしているか」が分かるようにする |
| 事後 | AS-6 | 中 | デプロイ後に公開URLの到達と内容一致を検証して返す |
| 運用 | AS-2 | 高 | 稼働リビジョンの追従と、古いまま publish する際の警告 |

**まだ1件も App Studio へ投げていません。** AS-1 + AS-5 + AS-2 をまとめた依頼文が
[tasks/app-studio.md](tasks/app-studio.md) の末尾にあります。

## ⬜ 確認待ち

Windows では `scripts\Invoke-AppRefinerCheck.ps1` を実行すると、以下をまとめて確認できます。

- 本番URL <https://yuda890201.github.io/app-refiner/> が最新の `index.html` を配信しているか
- GitHub Pages のビルド元ブランチとビルド方式（`gh` が必要）
- スモークテストが通るか（`-RunTests`）

そのほか、承認チケット `apr_n-iVjhnEliE` の最終ステータス（デプロイ自体は成功済みのため実害なし）。
