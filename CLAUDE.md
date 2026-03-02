# CLAUDE.md

## プロジェクト概要

「情報Ⅰ」授業用の動画配信プラットフォーム。
生徒が動画を「ただ見るだけ」で終わらせず、理解・思考を深める場を提供する。

詳細設計: [docs/design.md](docs/design.md)

---

## 技術スタック

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes |
| DB | Supabase |
| 認証 | Supabase Auth（Google OAuth） |
| ホスティング | Vercel |
| 動画 | YouTube埋め込み |
| UIコンポーネント | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |

---

## 開発方針

- 開発者は1人。生成AIを活用して爆速開発する。
- CSSフレームワーク：Tailwind CSS + shadcn/ui
- Clerkは使用しない。認証はSupabase AuthのGoogle OAuthで統一。
- 無料枠での運用を原則とする（AIのみ有料枠を許容）

---

## タスク実行フロー

タスクを受けたら必ず以下の順で進める。

1. **タスク確認** — 内容を確認し、不明点があれば着手前に質問する
2. **ブランチ作成** — mainから以下の命名規則でブランチを切る
   - `feature/xxx` — 新機能
   - `fix/xxx` — バグ修正
   - `chore/xxx` — 設定・ドキュメント等
3. **タスク実施** — 実装する
4. **セルフレビュー** — 実装内容を自分で確認し、問題がないか点検する
5. **commit** — 変更をコミットする
6. **push** — リモートにプッシュする

---

## コーディング規約

### 命名規則
- ファイル名：kebab-case（例: video-player.tsx）
- コンポーネント名：PascalCase
- 関数・変数：camelCase
- 型・インターフェース：PascalCase（例: Lesson, QuizQuestion）
- DBカラムに対応する型はSupabaseの自動生成型を使う

### コンポーネント
- デフォルトはServer Component
- インタラクションが必要な場合のみ`'use client'`を付与
- 1ファイル1コンポーネントを原則とする

### API Routes
- レスポンスは`{ data, error }`形式に統一
- HTTPメソッドは用途に応じて厳密に使う（GET / POST / PUT / DELETE）

### Supabase
- クライアントは`lib/supabase/`配下に集約
- サーバーサイドは`createServerClient`、クライアントは`createBrowserClient`

### その他
- `any`型は禁止
- `console.log`は開発時のみ（コミット前に削除）
- 環境変数はすべて`.env.local`で管理
