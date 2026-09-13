# App Refiner（ブラッシュアップ司令塔）

自作アプリを改修したくなったとき、スマホで要望を入力すると
**Gemini / @App Studio にそのまま渡せる「改修指示書テキスト」** を自動生成する司令塔アプリです。

- 公開URL: https://yuda890201.github.io/app-refiner/
- 構成: `index.html` 1ファイル（公開されるのはこのファイルのみ）
- 外部通信: なし（APIキー・トークン・PIN等の秘密情報は一切扱いません）
- データ保存: ブラウザの `localStorage` のみ
- 外部CDN: Tailwind CSS / Font Awesome のみ

このアプリ自身はコード生成もデプロイも行いません。実際の改修は生成した指示書を
Gemini や @App Studio、Claude Code に渡して実行します。

## 画面の流れ

| ステップ | 内容 |
| --- | --- |
| STEP 1 対象アプリ | 登録アプリをカード表示（iframe 縮小プレビュー・未対応件数バッジ付き）。追加・編集・削除・「開く」・プレビュー再読み込み |
| STEP 2 改修要望 | クイックプリセット追記、自由記述、改修の種類（機能追加/不具合修正/UI改善/リファクタ）、優先度（高/中/低） |
| STEP 3 指示書生成 | 規定フォーマットで生成 → コピー（コピー時に自動で履歴保存）。直近の改修履歴を添えるオプションあり |
| STEP 4 履歴 | 新しい順に一覧、キーワード検索、再コピー、再依頼、対応済みトグル、個別削除・全削除（確認あり） |
| 設定 | 指示書テンプレートの編集、プレビュー表示の切り替え、JSON エクスポート / インポート（マージ・置き換え）、初期化 |

## 生成される指示書フォーマット

```
@App Studio
# 改修指示書：{アプリ名}
* 対象リポジトリ: {リポジトリ名}
* 公開URL: {公開URL}
* 改修の種類: {種類} / 優先度: {優先度}

## 改修要望
{要望本文}

## これまでの改修依頼   ← 「履歴を含める」をONにしたときだけ付きます（直近3件）
* {日時} {種類}（優先度 {優先度}） / {対応状況}: {要望の要約}

## 制約
* 既存の機能を壊さないこと。
* index.html 単一ファイル構成を維持すること。
* 変更点を箇条書きで報告すること。
```

「## 制約」の内容は設定画面から編集できます（既定値は上記）。
改修の種類ごとに行を追加することもできます（既定は空＝上記のまま）。

## 設計上の約束ごと

- `localStorage` の読み書きはすべて `try/catch`。失敗してもアプリは停止せず、警告バナーを出して一時保持に切り替わります。
- プレビュー用 iframe は `sandbox="allow-scripts allow-popups allow-forms"`（同一オリジン権限を渡さない）。
  読み込めない場合は「プレビュー不可」を表示し、レイアウトは崩れません。
- クリップボードは `navigator.clipboard` → `execCommand('copy')` の二段構え（スマホの非セキュアコンテキスト対策）。
- 入力欄のフォントサイズは 16px 固定（iOS の自動ズーム防止）。
- カードのプレビュー高さは CDN に依存しないよう自前の CSS で指定。
- Tailwind CDN に到達できない場合は `html` に `.no-tw` が付き、最小限のフォールバックCSSに切り替わる。

## ドキュメント

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 全体構成・役割分担・セキュリティの考え方
- [docs/CONTEXT.md](docs/CONTEXT.md) — ここまでの経緯と決定事項
- [docs/TODO.md](docs/TODO.md) — 残作業の棚卸し（2系統のインデックス）
- [docs/tasks/app-refiner.md](docs/tasks/app-refiner.md) — App Refiner 本体の残タスク（AR-*）
- [docs/tasks/app-studio.md](docs/tasks/app-studio.md) — App Studio 側への改修要望（AS-*）
- [tests/smoke.mjs](tests/smoke.mjs) — Playwright による動作確認スクリプト
- [scripts/Invoke-AppRefinerCheck.ps1](scripts/Invoke-AppRefinerCheck.ps1) — Windows 用の一括チェックスクリプト

## Windows での一括チェック

クローン／最新化・GitHub Pages の設定確認・公開中の内容とローカルの比較を、PowerShell から一度に実行できます。

```powershell
# 基本（取得と公開状態の確認だけ）
.\scripts\Invoke-AppRefinerCheck.ps1

# スモークテストも実行し、最後にブラウザで公開URLを開く
.\scripts\Invoke-AppRefinerCheck.ps1 -RunTests -OpenSite
```

リポジトリへの書き込みや公開操作は行いません（読み取りと確認のみ）。
`gh` が未導入なら Pages の設定確認だけ省略し、残りはそのまま実行します。
