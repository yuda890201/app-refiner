# CLAUDE.md

App Refiner（ブラッシュアップ司令塔）のリポジトリです。作業前に
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)（全体構成と役割分担）、
[docs/CONTEXT.md](docs/CONTEXT.md)（経緯）、
[docs/TODO.md](docs/TODO.md)（残タスク）を読んでください。

**App Studio のコードはこのセッションから変更しません。** 別チャットが当事者として
並行作業中です。こちらの役割は App Refiner の開発と、生成物のレビューです
（`.claude/skills/review-published-app/`）。

## 絶対に守る制約

- **公開物は `index.html` 1ファイルのみ**。ビルド工程を追加しない。CSS/JS を別ファイルに切り出さない。
- **外部通信を行わない**。`fetch` / `XMLHttpRequest` / WebSocket を使わない。
  例外は CDN（Tailwind CSS と Font Awesome のみ）と、カードプレビュー用 iframe（ユーザー自身の公開ページ）。
- **秘密情報を扱わない**。APIキー・トークン・PIN をコードにも `localStorage` にも置かない。
- **`localStorage` の読み書きは必ず `try/catch`**。失敗してもアプリを停止させない。
- **プレビュー iframe に `allow-same-origin` を付けない**。本アプリと同じ `yuda890201.github.io`
  オリジンに置かれるため、付けるとプレビュー先から本アプリのデータに触れられる。
- **プレースホルダーで省略しない**（`// ここに既存の処理` のような書き方をしない）。
- **CSP の meta を消さない・緩めない**。`connect-src 'none'` が外部送信を封じている。
  新しい外部資源が要るときは、必要な directive だけを最小限で足し、
  `tests/smoke.mjs` の CSP 検証（違反ログを数える方）が通ることを確認すること。

## 変更したら

```bash
npx http-server . -p 8899 --silent
node tests/smoke.mjs      # 68項目のスモークテスト。機能を追加したらここにも追記する
```

ポートは環境変数 `PORT` で変えられる（`scripts/Invoke-AppRefinerCheck.ps1 -RunTests` が利用）。

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
  "draft": { "type": "", "priority": "", "body": "", "includeHistory": false },
  "filter": "all|open|done",
  "settings": { "preview": true },
  "template": { "constraints": "1行1項目のテキスト", "byType": { "UI改善": "追加する行", "...": "" } }
}
```

指示書のフォーマット（`buildInstruction()`）は下流の Gemini / @App Studio が読む契約なので、
変更するときは README とこのファイルも合わせて更新すること。
「## これまでの改修依頼」節は `draft.includeHistory` が true のときだけ付き、
「## 改修要望」と「## 制約」の間に入る（既定はオフ＝従来どおりの出力）。
「## 制約」の中身は `state.template` から組み立てる。既定値は `DEFAULT_CONSTRAINTS`
（従来の3行）で、種類ごとの追加 `byType` の既定は空。したがって設定を触らなければ出力は変わらない。
`RECOMMENDED_BY_TYPE` は「おすすめを入れる」を押したときだけ使われる候補文で、既定値ではない。

## AR-10 のフォールバックCSSについて

Tailwind CDN が読めたかを `detectTailwind()` が判定し、読めていなければ `html` に `.no-tw` を付ける。
フォールバックのスタイルはすべて `.no-tw` 配下に書くこと（Tailwind が読めた場合は一切適用されない）。
CDN の有無に関係なく必要な寸法（プレビュー枠の高さなど）は、Tailwind のクラスではなく
自前の `<style>` に書くこと。
