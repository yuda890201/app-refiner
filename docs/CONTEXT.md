# App Refiner 開発コンテキスト（経緯と決定事項）

最終更新: 2026-09-13

## 1. このプロジェクトは何か

自作アプリ（GitHub Pages で公開している単一HTMLアプリ群）を改修したくなったとき、
スマホから要望を入力して「Gemini / @App Studio にそのまま貼れる改修指示書」を作る司令塔アプリ。

- 公開URL: https://yuda890201.github.io/app-refiner/
- リポジトリ: `yuda890201/app-refiner`
- 公開物は `index.html` 1ファイルのみ（`docs/`・`tests/` は開発用で、GitHub Pages の表示には影響しません）

## 2. ここまでの流れ（テスト2号）

1. **Gemini Spark で仕様策定** — スマホファースト / ダークUI / localStorage のみ / 外部通信なし、という方針を確定。
2. **@App Studio へ構築を依頼** — `index.html` の生成とリポジトリ作成・GitHub Pages 公開を依頼。
3. **App Studio のスキーマ制約に遭遇** — App Studio MCP は `AppSchema`（フィールド定義）からフォームHTMLを生成する仕組みのため、
   任意の高機能単一HTML（カスタムJS/SPA）をそのまま push できなかった。
4. **結果として公開されたのは簡易フォーム版** — 承認フロー（`apr_n-iVjhnEliE`）自体は通り、
   リポジトリ作成・Pages 公開・`Deploy: App Refiner（ブラッシュアップ司令塔）`（コミット `91733e4`）までは成功。
   ただし中身は入力項目4件・2772バイトのフォームで、司令塔アプリの機能（アプリ管理/指示書生成/履歴）は未実装だった。
5. **Claude Code へ引き継ぎ** — 本リポジトリで仕様どおりの完全版 `index.html` を実装。

## 3. 判明している事実

| 項目 | 状態 |
| --- | --- |
| リポジトリ `yuda890201/app-refiner` | 作成済み |
| GitHub Pages | 有効（公開URLでアプリが表示されることを実機で確認済み） |
| App Studio の承認フロー | 実行自体は成功していた（デプロイコミットが存在する） |
| App Studio の承認**通知** | スマホで動作せず、`https://app-studio-840352034351.asia-northeast1.run.app/` でも確認できなかった |
| Cloud Run 稼働リビジョン | `app-studio-00034-bgp` / `origin/claude/funny-hopper-e88v68` より **5コミット遅れ** |
| App Studio の設定チェック | `check_configuration` は overall=ok（GITHUB_TOKEN・ADMIN_PIN・state backend いずれも正常） |

> **重要な切り分け**: 「デプロイできなかった」のではなく、
> 「デプロイは成功していたが、①生成された中身がスキーマ由来の簡易フォームだった ②承認/完了の通知が届かず状況が見えなかった」
> の2点が実際の問題。App Studio 側の改修要望もこの2点に対応している。

## 4. 実装方針として確定したこと

- **単一ファイル厳守** — 公開されるのは `index.html` のみ。ビルド工程を持たない。
- **外部通信をしない** — fetch/XHR を一切使わない。唯一の外部読み込みは Tailwind / Font Awesome の CDN と、
  カードプレビュー用 iframe（ユーザー自身の公開ページ）のみ。
- **iframe プレビューの安全設計** — `sandbox="allow-scripts allow-popups allow-forms"` とし、`allow-same-origin` は付けない。
  本アプリと同じ `yuda890201.github.io` オリジンに置かれるため、同一オリジン権限を渡すとプレビュー先から
  本アプリの localStorage に触れてしまうのを避けるため。
- **localStorage は全て try/catch** — 失敗時は警告バナーを出して一時保持モードで動作を続ける。
- **クリップボードは二段構え** — `navigator.clipboard`（セキュアコンテキスト）→ 失敗時 `execCommand('copy')`。
- **入力欄は 16px 固定** — iOS Safari の自動ズームを防ぐため。
- **ストレージキー** — `app-refiner.v1`（`{version, savedAt, apps, history, selectedId, draft, filter}`）。

## 5. 動作確認の方法

CDN（cdn.tailwindcss.com / cdnjs）に到達できない環境では見た目が崩れますが、機能は動作します。

```bash
npx http-server -p 8899 -s .
node tests/smoke.mjs           # Playwright で 34 項目を検証
```

実装時の検証結果: 34項目すべて PASS（アプリCRUD・選択・プリセット追記・指示書生成フォーマット・
クリップボード・履歴の保存/再コピー/対応済み/フィルタ・リロード後の永続化・エクスポート/インポート/初期化・
URL未設定時の「プレビュー不可」表示）。
