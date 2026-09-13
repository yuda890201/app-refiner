# App Studio 機能拡張の依頼メモ：カスタム単一HTMLの直接デプロイ

> このファイルは App Refiner 本体の仕様ではなく、**App Studio（MCP サーバー）側への改修要望**の控えです。
> 今回 App Refiner が一度で公開できなかった根本原因がここにあります。
>
> ※ 承認URLに含まれるトークンなどの秘密情報は、このファイルには記載しません。

## 1. 背景と課題

Cloud Run 上で稼働中の App Studio MCP サーバー（revision: `app-studio-00034-bgp`）は、
`AppSchema`（フィールド定義）を受け取り、テンプレートからフォームHTMLを生成して GitHub Pages に公開する仕組み。

そのため、ユーザーが作成した高機能な単一HTML（カスタム JavaScript / SPA）を直接デプロイしたい場合、
現行ツール（`save_app_schema` / `request_publish`）ではスキーマ制約に阻まれ、任意のHTMLを push できない。

実際、App Refiner の依頼では **リポジトリ作成・Pages 有効化・デプロイまでは成功した**ものの、
公開されたのは入力項目4件・約2.7KB のフォームHTMLで、意図した司令塔アプリではなかった。

## 2. 改修要件

### (1) 新規 MCP ツール `publish_custom_html` の追加

引数:

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `repo` | 必須 | 作成・更新する GitHub リポジトリ名 |
| `html_content` | 必須 | デプロイする `index.html` の完全なコード |
| `title` | 任意 | アプリのタイトル |
| `commit_message` | 任意 | 省略時は `Deploy custom single-file app via App Studio` |

動作フロー:

1. HTML 内容の基本検証（`<html` / `<body` を含むか、サイズ上限チェック等）
2. 承認チケットを発行（`request_publish` と同じ安全設計。`approve_url` を返し、ユーザーの承認後に push）
3. 承認後、GitHub API 経由でリポジトリを作成（存在しない場合）し、`index.html` をコミット＆プッシュ、
   GitHub Pages を有効化

### (2) 稼働リビジョンの追従

- 稼働中のコードは `origin/claude/funny-hopper-e88v68` より **5コミット遅れ**（`check_deployment` より）
- Secret Manager の環境変数方式を維持したまま、最新コミットをビルド・デプロイする

### (3) 承認フロー／通知の改善（今回実際に困った点）

- スマホで承認リクエストの通知が動作せず、サービスのURLを開いても承認待ちの状況を確認できなかった
- 希望する改善:
  - 承認待ち一覧を取得できるツール（例: `list_pending_approvals`）
  - 承認完了後に「どのリポジトリに何バイトを push したか」を返す仕組み
  - approve 画面のスマートフォン対応

## 3. 制約

- 既存の AppSchema 駆動型フォーム生成機能（`save_app_schema` / `request_publish`）は破壊しないこと
- `GITHUB_TOKEN` や `ADMIN_PIN` 等の秘密情報は引き続き Secret Manager から安全に読み出すこと

## 4. 参考：今回の各種レスポンス（秘密情報は除去済み）

```jsonc
// check_deployment
{
  "service": "app-studio",
  "revision": "app-studio-00034-bgp",
  "on_cloud_run": true,
  "git_branch": "claude/funny-hopper-e88v68",
  "matches_origin": false,
  "behind_by": 5
}

// request_publish（app-refiner の発行時）… approve_url のトークンは秘匿
{
  "ok": true,
  "requested": true,
  "status": "pending",
  "summary_ja": "「App Refiner（ブラッシュアップ司令塔）」を public リポジトリ app-refiner として公開します（入力項目 4 件、HTML 2772 バイト、入力内容は保存しません）"
}
```

`summary_ja` の「入力項目 4 件、HTML 2772 バイト」が、
**この時点で意図と違うものが生成されていた**ことを示すサインになっている。
承認前にこの情報をもっと目立たせる、あるいは生成物のプレビューを提示できるとよい。
