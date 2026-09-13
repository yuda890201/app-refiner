---
name: review-published-app
description: Gemini や App Studio が生成・公開した単一HTMLアプリを、セキュリティを含めてレビューする。「生成されたアプリを確認して」「公開されたアプリをレビューして」「Firestore のルールを見て」と言われたとき、または GitHub Pages に公開された index.html の変更を検査するときに使う。
---

# 生成された単一HTMLアプリのレビュー

Gemini が書いて App Studio が公開したアプリを、あとから検査する手順。
**丸ごと読むのではなく、危険が集まる場所を順に見る。**

前提となる全体構成は `docs/ARCHITECTURE.md` を参照。

## 何を疑うか

AI が間違えることではなく、**AI が読んだ文章に指示が仕込まれていること**を疑う。
Gemini は外部の文章（リポジトリの中身、issue、取り込んだページ）を読むため、
そこに指示があれば意図しないコードが混ざりうる。

見た目は普通に動くアプリのまま、データだけが外へ流れる形が最も危険。

## 手順

### 1. まず差分だけを見る

```bash
git log --oneline -10
git diff HEAD~1 -- index.html
```

**全文を読まない。** 変更された行だけを見る。
86KB のファイルでも、1回の改修で変わるのは通常数十行。

新規公開で差分が無い場合のみ、下記2〜5を全文に対して行う。

### 2. CSP が入っているか確認する

これが最大の防御。**無ければそこで止めて報告する。**

```bash
grep -o 'http-equiv="Content-Security-Policy"[^>]*' index.html | head -1
grep -o "connect-src [^;]*" index.html
```

| 結果 | 意味 |
| --- | --- |
| `connect-src 'none'` | 外に一切出られない。以降の通信の検査は不要 |
| `connect-src` に宛先がある | **その宛先が妥当かを確認する**。意図した外部サービスだけか |
| CSP が無い | 危険。App Studio の `harden()` を通っていない |

### 3. 外部に出ようとする記述を探す

CSP があっても、何をしようとしているかは知っておく。

```bash
grep -nE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|import\(" index.html
grep -nE "https?://[^\"' )]+" index.html | grep -vE "cdn\.tailwindcss|cdnjs\.cloudflare|fonts\.(googleapis|gstatic)|github\.io" | head -20
```

**これは防御ではなく説明のための確認。** 難読化（`window["fet"+"ch"]`）は
この方法では見つからない。見つからないことを前提に、CSP に依存する。

### 4. 秘密情報が埋まっていないか

```bash
grep -nE "(api[_-]?key|secret|token|password|pin)\s*[:=]\s*['\"][A-Za-z0-9_-]{12,}" index.html
```

Firebase の `apiKey` は例外。あれはクライアントに置く前提の識別子であって秘密ではない。
守っているのは Firestore のルール（次項）。

### 5. localStorage の扱い

```bash
grep -nE "localStorage|sessionStorage" index.html | head
```

読み書きが try/catch で囲まれているか。失敗してアプリが停止しないか。

### 6. Firebase を使っている場合 — ここが本番

**データを守っているのは HTML ではなく Firestore のセキュリティルールである。**
アプリのコードをどれだけ読んでも、ルールが緩ければ意味がない。

確認すること:

- [ ] `allow read, write: if true` のような全開放になっていないか
- [ ] 認証済みユーザーだけに限定されているか（`request.auth != null`）
- [ ] 他人のデータを読めないか（`request.auth.uid == resource.data.ownerId` 等）
- [ ] 書き込み時にフィールドの型と必須項目が検証されているか
- [ ] ルールのテストが存在するか（Firebase Emulator で書ける）

ルールは短い。**毎回 86KB を読むより、ルールを1回きちんと読む方が効く。**

## 報告の仕方

見つけた問題は、危険度の順に並べる。

1. **CSP が無い / connect-src が意図せず開いている**
2. **Firestore ルールが全開放**
3. 秘密情報の埋め込み
4. localStorage の例外処理漏れ
5. その他（動作不良、UIの問題）

問題が無ければ「差分 N 行を確認し、CSP は `connect-src 'none'`、
外部通信の記述なし」のように**何を確認したかを具体的に**書く。
「問題ありません」だけでは、何を見たのか分からない。

## やってはいけないこと

- **静的解析の結果を防御として報告しない。** 「fetch が見つからなかったので安全」は誤り
- **全文を読んで判断したことにしない。** 差分で見た範囲を明示する
- CSP が入っていることを確認せずに「外部通信なし」と結論づけない
