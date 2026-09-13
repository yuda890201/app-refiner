# タスク：App Studio 側（別リポジトリ / Cloud Run）

対象: App Studio MCP サーバー（`server_cloudrun.py` 等 / Cloud Run `app-studio`）
担当の想定: App Studio のリポジトリで作業する Claude Code、または @App Studio 自身
関連: [../CONTEXT.md](../CONTEXT.md) ・ [app-refiner.md](app-refiner.md)

> このファイルは App Refiner 本体の仕様ではなく、**App Studio への改修要望**です。
> App Refiner が一度で公開できなかった根本原因はここにあります。
> 承認URLに含まれるトークンなどの秘密情報は記載しません。

| ID | 優先度 | 内容 |
| --- | --- | --- |
| AS-1 | 高 | 新規ツール `publish_custom_html`（任意の単一HTMLを直接デプロイ） |
| AS-2 | 高 | 稼働リビジョンの追従（5コミット遅れ） |
| AS-3 | 高 | 承認通知が届かない問題の調査と承認待ち一覧ツール |
| AS-4 | 中 | `request_publish` のサマリに生成物の識別情報を含める |

**依存関係**: AS-1 が入るまで、App Refiner の改修は Claude Code 経由で直接コミットする運用になる。
AS-1 が入れば、App Refiner が生成した指示書 → @App Studio → デプロイ、が1本の線でつながる。

---

## 背景と課題（共通）

Cloud Run 上で稼働中の App Studio MCP サーバー（revision: `app-studio-00034-bgp`）は、
`AppSchema`（フィールド定義）を受け取り、テンプレートからフォームHTMLを生成して GitHub Pages に公開する仕組み。

そのため、ユーザーが作成した高機能な単一HTML（カスタム JavaScript / SPA）を直接デプロイしたい場合、
現行ツール（`save_app_schema` / `request_publish`）ではスキーマ制約に阻まれ、任意のHTMLを push できない。

実際、App Refiner の依頼では **リポジトリ作成・Pages 有効化・デプロイまでは成功した**ものの、
公開されたのは入力項目4件・約2.7KB のフォームHTMLで、意図した司令塔アプリではなかった。



## AS-1 [高] 新規 MCP ツール `publish_custom_html` の追加

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

## AS-2 [高] 稼働リビジョンの追従

- 稼働中のコードは `origin/claude/funny-hopper-e88v68` より **5コミット遅れ**（`check_deployment` より）
- Secret Manager の環境変数方式を維持したまま、最新コミットをビルド・デプロイする

## AS-3 [高] 承認フロー・通知の改善（今回実際に困った点）

- スマホで承認リクエストの通知が動作せず、サービスのURLを開いても承認待ちの状況を確認できなかった
- 希望する改善:
  - 承認待ち一覧を取得できるツール（例: `list_pending_approvals`）
  - 承認完了後に「どのリポジトリに何バイトを push したか」を返す仕組み
  - approve 画面のスマートフォン対応

## AS-4 [中] `request_publish` のサマリに生成物の識別情報を含める

承認前に「何を公開しようとしているか」を判別できるようにする。

- 生成される HTML の先頭数行、またはプレビューURL をレスポンスに含める
- 今回の `summary_ja` の「入力項目 4 件、HTML 2772 バイト」が、
  **この時点で意図と違うものが生成されていた**ことを示す唯一のサインだった。
  この情報を承認画面でもっと目立たせる

## 共通の制約

- 既存の AppSchema 駆動型フォーム生成機能（`save_app_schema` / `request_publish`）は破壊しないこと
- `GITHUB_TOKEN` や `ADMIN_PIN` 等の秘密情報は引き続き Secret Manager から安全に読み出すこと

## 参考：今回の各種レスポンス（秘密情報は除去済み）

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

（`summary_ja` の読み方については AS-4 を参照）

---

## そのままコピーして渡せる依頼文（AS-1 + AS-2）

```
# App Studio 機能拡張指示書：カスタム単一HTML直接デプロイ

App Studio MCP サーバー（server_cloudrun.py 等）に、新規 MCP ツール
`publish_custom_html` を追加してください。

* 引数: repo（必須）, html_content（必須）, title（任意）,
  commit_message（任意・省略時は "Deploy custom single-file app via App Studio"）
* 動作: HTML の基本検証（<html / <body を含むか、サイズ上限）→ 承認チケット発行
  （request_publish と同じ安全設計で approve_url を返し、承認後に push）→
  GitHub API でリポジトリを作成（なければ）し index.html をコミット＆プッシュ →
  GitHub Pages を有効化

あわせて、稼働中の Cloud Run リビジョン app-studio-00034-bgp が
origin/claude/funny-hopper-e88v68 より 5 コミット遅れているため、
Secret Manager の環境変数方式を維持したまま最新コミットをビルド・デプロイしてください。

## 制約
* 既存の AppSchema 駆動型フォーム生成機能（save_app_schema / request_publish）は壊さないこと。
* GITHUB_TOKEN や ADMIN_PIN 等の秘密情報は引き続き Secret Manager から読み出すこと。
* 変更点を箇条書きで報告すること。
```
