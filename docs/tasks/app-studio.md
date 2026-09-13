# App Studio 側の状況（訂正版）

最終更新: 2026-09-13
関連: [../ARCHITECTURE.md](../ARCHITECTURE.md)

> ## ⚠️ このファイルは一度書き直されています
>
> 初版には AS-1〜AS-6 という改良要望が並んでいましたが、**その多くは誤りでした。**
> App Studio のデフォルトブランチ（`main`）しか見ずに書いたためです。
>
> 実際に稼働しているのは `claude/funny-hopper-e88v68` ブランチで、そちらには
> 540件のテストを持つ成熟した MCP 実装があり、要望した内容の大半は
> **すでに実装済み、または意図的に保留**されていました。
>
> 同じ間違いを繰り返さないため、経緯も含めて残します。

## 実際の構成

`main` ブランチには PIN 認証つきの `/api/deploy` を持つ素の HTTP サーバー（`server.py`）
しかありません。**MCP ではありません。** 稼働しているのは別ブランチです。

| 項目 | 内容 |
| --- | --- |
| 稼働ブランチ | `claude/funny-hopper-e88v68` |
| Cloud Run | service `app-studio` / revision `app-studio-00034-bgp` |
| GCP | project `yuda-store-ai-1788800335` / `asia-northeast1` |
| 構成 | `asgi_app.py` + `core/*` + `mcp_server/*` + `notify/*` + `storage/*` |
| テスト | 25ファイル・約540件 |
| デプロイ | `scripts/deploy.ps1`（テスト実行 → デプロイ → 設定確認まで一括） |

公開されている MCP ツールは15個（`check_configuration` / `check_deployment` /
`list_app_templates` / `get_app_template` / `validate_app_schema` /
`render_app_preview` / `get_app_schema` / `list_app_schemas` / `list_deployed_apps` /
`get_deploy_status` / `get_submission_summary` / `list_submissions` /
`save_app_schema` / `verify_submission_store` ほか）。

## 初版の要望が、実際にはどうだったか

| 初版で書いたこと | 実際 |
| --- | --- |
| AS-1 `publish_custom_html` を追加してほしい | **意図的に保留**。防御（CSP）だけ先に実装済み。詳細は下記 |
| AS-2 稼働リビジョンの追従 | 5コミット遅れは事実。ただし `8969d19` で「古いコードで動いている」ことを承認画面に出す対応済み |
| AS-3 承認通知が届かない | Web Push は実装済み。4つの失敗箇所のうち3つは検証済みで、`scripts/diagnose_push.ps1` で切り分けられる |
| AS-4 承認前に中身が分かるように | 承認画面にプレビュー・リポジトリ名・公開/非公開の表示あり |
| AS-5 スキーマ外の仕様を黙って劣化させるな | **これは有効な指摘**。ただし解決策は AS-1 の設計に含まれている |
| AS-6 デプロイ後に到達と内容一致を検証 | `8ae1ad5` で**実装済み** |

つまり残っているのは AS-1 と AS-5 で、しかもそれは「実装が足りない」のではなく
**利用者の判断待ちで止まっていた**だけでした。

## `publish_custom_html` の設計（向こうが既に書いたもの）

設計書 `docs/DESIGN_MCP.md` の §10-15 にあります。要点だけ。

- 任意HTMLを受け取るのは、PR #1 で自分が閉じたセキュリティホールを開け直す行為
- 44KB のHTMLをスマホで読んで判断することはできない。承認が「押すだけ」になる
- **静的解析を防御に使ってはいけない**（`window["fet"+"ch"]` で外れる）
- 採った案: 公開HTMLの `<head>` 直後に CSP の meta を差し込み、**ブラウザに実施させる**
- `harden()` が封じる（防御） / `audit()` が説明する（判断材料。防御ではない）
- 「audit が難読化を見落とす」ことをテストで明示的に固定してある

`core/htmlaudit.py` は現在どこからも呼ばれていません。判断が出るまで待っている状態です。

## 利用者の判断（2026-09-13 決定）

1. ツールとして公開する → **はい**
2. CSP を緩める経路 → **引数として用意する。既定は STRICT のまま**
3. サイズ上限 → **256 KiB**

詳細と、承認画面への要件は [../ARCHITECTURE.md](../ARCHITECTURE.md) の「決定事項」を参照。

## このセッションの関わり方

**App Studio のコードはこのセッションから変更しません。** 向こうのチャットが並行で
作業中であり、当事者です。ブランチを分けてもCloud Runのサービス本体・Secret Manager・
`app-studio-state` は共有で、何より同じ機能の二重実装になります。

こちらの役割は、向こうが出した変更を**差分でレビューすること**です。
手順は `.claude/skills/review-published-app/SKILL.md` にまとめてあります。

## 教訓

**デフォルトブランチだけを見て「実装されていない」と判断しない。**
稼働中のコードがどのブランチかを最初に確かめること。
`check_deployment` の `git_branch` がそれを教えてくれる。
