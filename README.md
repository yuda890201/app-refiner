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
| STEP 1 対象アプリ | 登録アプリをカード表示（iframe 縮小プレビュー付き）。追加・編集・削除・「開く」 |
| STEP 2 改修要望 | クイックプリセット追記、自由記述、改修の種類（機能追加/不具合修正/UI改善/リファクタ）、優先度（高/中/低） |
| STEP 3 指示書生成 | 規定フォーマットで生成 → コピー（コピー時に自動で履歴保存） |
| STEP 4 履歴 | 新しい順に一覧、再コピー、対応済みトグル、個別削除・全削除（確認あり） |
| 設定 | JSON エクスポート / インポート（マージ・置き換え）、初期化 |

## 生成される指示書フォーマット

```
@App Studio
# 改修指示書：{アプリ名}
* 対象リポジトリ: {リポジトリ名}
* 公開URL: {公開URL}
* 改修の種類: {種類} / 優先度: {優先度}

## 改修要望
{要望本文}

## 制約
* 既存の機能を壊さないこと。
* index.html 単一ファイル構成を維持すること。
* 変更点を箇条書きで報告すること。
```

## 設計上の約束ごと

- `localStorage` の読み書きはすべて `try/catch`。失敗してもアプリは停止せず、警告バナーを出して一時保持に切り替わります。
- プレビュー用 iframe は `sandbox="allow-scripts allow-popups allow-forms"`（同一オリジン権限を渡さない）。
  読み込めない場合は「プレビュー不可」を表示し、レイアウトは崩れません。
- クリップボードは `navigator.clipboard` → `execCommand('copy')` の二段構え（スマホの非セキュアコンテキスト対策）。
- 入力欄のフォントサイズは 16px 固定（iOS の自動ズーム防止）。

## ドキュメント

- [docs/CONTEXT.md](docs/CONTEXT.md) — ここまでの経緯と決定事項
- [docs/TODO.md](docs/TODO.md) — 残作業の棚卸し
- [docs/app-studio-feature-request.md](docs/app-studio-feature-request.md) — App Studio 側への改修要望（`publish_custom_html`）
- [tests/smoke.mjs](tests/smoke.mjs) — Playwright による動作確認スクリプト
