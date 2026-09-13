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

| ID | 優先度 | 内容 |
| --- | --- | --- |
| AR-1 | 高 | 実機確認（iPhone / Android）※コード変更なし |
| AR-2 | 高 | プレビュー読み込み失敗時の見え方を改善 |
| AR-3 | 中 | 初期登録アプリの見直し |
| AR-4 | 中 | 履歴からワンタップで再依頼 |
| AR-5 | 低 | 履歴のキーワード検索・アプリ別絞り込み |
| AR-6 | 低 | 指示書テンプレート（制約節）の編集機能 |
| AR-7 | 低 | 改修の種類ごとに制約文を出し分け |
| AR-8 | 🔶 | PWA 化（単一ファイル原則と衝突するため要判断） |

## ⬜ App Studio 側 — 詳細は [tasks/app-studio.md](tasks/app-studio.md)

| ID | 優先度 | 内容 |
| --- | --- | --- |
| AS-1 | 高 | 新規ツール `publish_custom_html`（任意の単一HTMLを直接デプロイ） |
| AS-2 | 高 | 稼働リビジョンの追従（5コミット遅れ） |
| AS-3 | 高 | 承認通知が届かない問題の調査と承認待ち一覧ツール |
| AS-4 | 中 | `request_publish` のサマリに生成物の識別情報を含める |

## ⬜ 確認待ち

- 本番URL <https://yuda890201.github.io/app-refiner/> が新しい `index.html` を配信しているか
  （PR #1 マージ済み。反映まで数分かかる場合あり）
- GitHub Pages のビルド元ブランチ（`main` / `gh-pages`）とビルド方式
- 承認チケット `apr_n-iVjhnEliE` の最終ステータス（デプロイ自体は成功済みのため実害なし）
