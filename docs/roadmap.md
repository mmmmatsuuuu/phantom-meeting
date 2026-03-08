# 実装ロードマップ

## 前提・注意事項

- `main` ブランチへのマージ = **Vercel本番に即時反映**
- 各フェーズは独立してマージ可能な単位で設計
- 認証・RLSが整うまでは、本番に個人データが漏れる状態を作らない
- フェーズ内のタスクは上から順に実施する

---

## Phase 0: 本番 Supabase 環境構築

> コード変更なし。インフラ設定のみ。

### タスク

- [x] Supabase の本番プロジェクトを作成（ダッシュボード上で作業）
- [x] `supabase/migrations/` にマイグレーションファイルを作成
  - `profiles`, `subjects`, `units`, `lessons`, `questions`, `memos`, `posts`, `quizzes`, `quiz_questions`
- [x] RLS（Row Level Security）ポリシーを設定
  - `memos`：本人のみ読み書き可
  - `posts`：全員読み可、本人のみ書き可
  - `lessons`/`questions`：全員読み可、teacher/adminのみ書き可
- [x] Vercel の環境変数に本番 Supabase の接続情報を設定
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
- [x] Google OAuth の本番用リダイレクト URI を Supabase に登録

### マージ判断

アプリコードの変更なし → **即マージOK**

---

## Phase 1: 認証基盤

> ログインしないと何も見えない状態を本番に出す。

### タスク

- [x] `supabase/migrations/` に `profiles` テーブルの auth trigger を追加
  - `auth.users` に登録されたら `profiles` に自動挿入
- [x] `(auth)` route group を作成
  - `/login` ページ（Google ログインボタン）
  - `/auth/callback` ルート（Supabase OAuth コールバック処理）
- [x] `middleware.ts` を実装
  - 未認証 → `/login` にリダイレクト
  - `teacher` ロールでない者が teacher ページにアクセス → リダイレクト（Phase 2 で route group と合わせて対応）
- [x] ナビバーにログインユーザー名・ログアウトボタンを追加

### マージ判断

認証なしでアクセスできるページがないことを確認してからマージ

---

## Phase 2: ルートグループ再構成

> `architecture.md` のフォルダ構成に合わせて整理する。

### タスク

- [x] `(student)` route group を作成
  - `layout.tsx`（ログイン確認）
  - `/` と `/lessons/[lessonId]` を `(student)` 配下に移動（URL変更なし）
- [x] `(teacher)` route group を作成
  - `layout.tsx`（teacher/admin ロール確認、それ以外は `/` にリダイレクト）
  - `/teacher/lessons/new` を `(teacher)` 配下に移動（URL変更なし）
- [x] NavBar右側をDropdownMenuに統合（ユーザー名・レッスン一覧・登録・ログアウト）
- [ ] DropdownMenuの表示項目をロールによって切り替え（後回し可：ページ自体はRLS/layoutで保護済み）

### マージ判断

既存URLが正しくリダイレクトされることを確認してからマージ

---

## Phase 3: レッスン一覧・視聴（実データ）

> `mock-data.ts` を Supabase クエリに置き換える。読み取りのみ。

### タスク

- [x] Supabase 型定義を生成（`src/lib/supabase/types.ts`）
- [x] `src/lib/db/contents.ts` を実装
  - `getContents()` — 科目・単元・レッスン一覧
  - `getLessonWithQuestions(lessonId)` — レッスン詳細 + 発問
- [x] レッスン一覧ページ（Server Component）を実データ対応
- [x] レッスン視聴ページ（Server Component）を実データ対応
- [x] `mock-data.ts` の型・ヘルパーを `lib/db/` に移植し除去
- [x] teacher フォームを Server Component wrapper + Client Component に分離

### 方針

- Server Component は `lib/db/contents.ts` を直接呼ぶ（API Route 不要）
- データアクセスロジックは `lib/db/` に集約（改修時の影響範囲を明確化）

### マージ判断

読み取り専用 かつ RLS でアクセス制御済みなら安全にマージ可

---

## Phase 4: メモ機能

> tiptap 導入 + YouTube Player API 連携 + メモ CRUD。

### タスク

- [x] tiptap をインストール（`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`）
- [x] `MemoSection` の `<textarea>` を tiptap エディタに置き換え
- [x] `src/lib/db/memos.ts` を実装（メモ CRUD のクエリを集約）
- [x] `api/memos/` Route Handler を実装（Client Component から `lib/db/memos.ts` を呼ぶ）
  - `GET /api/memos?lessonId=xxx` — 自分のメモ一覧
  - `POST /api/memos` — 新規保存
  - `DELETE /api/memos/[memoId]` — 削除
- [x] YouTube Player API 連携（`react-youtube`）
  - タイムスタンプ記録（`player.getCurrentTime()`）
  - タイムスタンプクリックでシーク（`player.seekTo(秒数)`）

### マージ判断

`memos` テーブルの RLS（本人のみ読み書き）を確認してからマージ

---

## Phase 5: 共有投稿機能

> メモをクラスに匿名共有する。

### タスク

- [ ] `src/lib/db/posts.ts` を実装（投稿クエリを集約）
- [ ] `api/posts/` Route Handler を実装（Client Component から `lib/db/posts.ts` を呼ぶ）
  - `GET /api/posts?lessonId=xxx` — 投稿一覧（全員閲覧可）
  - `POST /api/posts` — メモから投稿（スナップショット保存）
- [ ] `PostList` を実データ対応（Server Component から `lib/db/posts.ts` を直接呼ぶ）
- [ ] 自分の投稿 / 他者の投稿を明示的に区別して表示
- [ ] 投稿は匿名表示（`display_name` を出さない）

### マージ判断

自分の投稿が誰のものか特定できない表示になっていることを確認してからマージ

---

## Phase 6: 教師機能

> レッスン登録フォームの実装 + AI発問提案。

### タスク

- [ ] `api/contents/` に POST/PUT/DELETE を追加
- [ ] レッスン登録フォームを実データ対応（現在はモック）
- [ ] AI発問提案機能
  - YouTube URL → 動画情報取得
  - Claude API で発問を自動生成（編集可能な形式で表示）
- [ ] teacher 承認フロー（admin が `is_approved` を true に変更）
  - `(admin)` ルートに承認ページを作成

### マージ判断

teacher ロール以外が登録・編集できないことを確認してからマージ

---

## Phase 7: 小テスト（MVP後検討）

> 優先度低。認証・メモ・投稿が安定してから着手。

### タスク

- [ ] 問題作成フォーム（teacher）
- [ ] 回答 UI（student）
  - 選択式 / 記述式 / 並び替え
- [ ] 採点機能
- [ ] 集計・可視化（将来検討）

---

## 現在地

```
[✅] Phase 0 完了
[✅] Phase 1: 認証基盤
[✅] Phase 2: ルートグループ再構成
[✅] Phase 3: レッスン一覧・視聴（実データ）
[✅] Phase 4: メモ機能
[ ] Phase 5: 共有投稿機能
[ ] Phase 6: 教師機能
[ ] Phase 7: 小テスト
```

次の着手は **Phase 5: 共有投稿機能**。
