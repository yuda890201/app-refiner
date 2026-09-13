# CLAUDE.md

App Refiner（ブラッシュアップ司令塔）のリポジトリです。作業前に [docs/CONTEXT.md](docs/CONTEXT.md) と
[docs/TODO.md](docs/TODO.md) を読んでください。

## 絶対に守る制約

- **公開物は `index.html` 1ファイルのみ**。ビルド工程を追加しない。CSS/JS を別ファイルに切り出さない。
- **外部通信を行わない**。`fetch` / `XMLHttpRequest` / WebSocket を使わない。
  例外は CDN（Tailwind CSS と Font Awesome のみ）と、カードプレビュー用 iframe（ユーザー自身の公開ページ）。
- **秘密情報を扱わない**。APIキー・トークン・PIN をコードにも `localStorage` にも置かない。
- **`localStorage` の読み書きは必ず `try/catch`**。失敗してもアプリを停止させない。
- **プレビュー iframe に `allow-same-origin` を付けない**。本アプリと同じ `yuda890201.github.io`
  オリジンに置かれるため、付けるとプレビュー先から本アプリのデータに触れられる。
- **プレースホルダーで省略しない**（`// ここに既存の処理` のような書き方をしない）。

## 変更したら

```bash
npx http-server -p 8899 -s .
node tests/smoke.mjs      # 34項目のスモークテスト。機能を追加したらここにも追記する
```

## データ構造

`localStorage` キー `app-refiner.v1`:

```jsonc
{
  "version": 1,
  "savedAt": "ISO8601",
  "apps":    [{ "id": "", "name": "", "repo": "", "url": "", "memo": "" }],
  "history": [{ "id": "", "at": "ISO8601", "appId": "", "appName": "", "repo": "", "url": "",
                "type": "機能追加|不具合修正|UI改善|リファクタ",
                "priority": "高|中|低", "body": "", "text": "", "done": false }],
  "selectedId": "",
  "draft": { "type": "", "priority": "", "body": "" },
  "filter": "all|open|done"
}
```

指示書のフォーマット（`buildInstruction()`）は下流の Gemini / @App Studio が読む契約なので、
変更するときは README とこのファイルも合わせて更新すること。
