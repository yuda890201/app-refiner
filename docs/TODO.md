# やることリスト（棚卸し）

最終更新: 2026-09-13 / 凡例: ✅ 完了 ・ ⬜ 未着手 ・ 🔶 要判断

タスクは **App Refiner 本体** と **App Studio 側** の2系統に分かれています。
それぞれの詳細・完了条件・コピペ用の依頼文は下記のファイルにあります。

| 系統 | 対象 | 詳細 |
| --- | --- | --- |
| AR-* | このリポジトリの `index.html` | [tasks/app-refiner.md](tasks/app-refiner.md) |
| AS-* | App Studio MCP サーバー（別リポジトリ / Cloud Run） | [tasks/app-studio.md](tasks/app-studio.md) |

全体構成と、なぜこの分担なのかは [ARCHITECTURE.md](ARCHITECTURE.md) にまとめてあります。

**`publish_custom_html` が入るまで、App Refiner の改修は Claude Code から
このリポジトリへ直接コミットする運用**です。App Refiner 自身が 86KB の単一HTMLアプリで、
AppSchema では表現できないためです。

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

**初版の AS-1〜AS-6 は誤りでした。** デフォルトブランチしか見ずに書いたためで、
稼働ブランチ `claude/funny-hopper-e88v68` には540件のテストを持つ実装があり、
大半は実装済みか意図的な保留でした。詳細と経緯はタスクファイルを参照。

残っているのは `publish_custom_html` の実装のみで、利用者の判断は
2026-09-13 に出ています（[ARCHITECTURE.md](ARCHITECTURE.md) の「決定事項」）。

**この作業は App Studio 側のチャットが担当します。** このセッションからは
App Studio のコードを変更しません（当事者であること、並行作業中であること、
二重実装を避けるため）。こちらの役割は生成物のレビューです。

## ⬜ 確認待ち

Windows では `scripts\Invoke-AppRefinerCheck.ps1` を実行すると、以下をまとめて確認できます。

- 本番URL <https://yuda890201.github.io/app-refiner/> が最新の `index.html` を配信しているか
- GitHub Pages のビルド元ブランチとビルド方式（`gh` が必要）
- スモークテストが通るか（`-RunTests`）

そのほか、承認チケット `apr_n-iVjhnEliE` の最終ステータス（デプロイ自体は成功済みのため実害なし）。
