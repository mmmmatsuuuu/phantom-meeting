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

- [ ] `(student)` route group を作成
  - `layout.tsx`（studentロール確認）
  - 現在の `/` → `(student)/contents/` へ移動
  - 現在の `/lessons/[lessonId]` → `(student)/contents/[subjectId]/[unitId]/[lessonId]/` へ移動
- [ ] `(teacher)` route group を作成
  - `layout.tsx`（teacherロール確認）
  - 現在の `/teacher/lessons/new` → `(teacher)/contents/new/` へ移動
- [ ] モックアップ用の仮パスをリダイレクトで保持（必要に応じて）

### マージ判断

既存URLが正しくリダイレクトされることを確認してからマージ

---

## Phase 3: レッスン一覧・視聴（実データ）

> `mock-data.ts` を Supabase クエリに置き換える。読み取りのみ。

### タスク

- [ ] `api/contents/` Route Handler を実装
  - `GET /api/contents` — 科目・単元・レッスン一覧
  - `GET /api/contents/[lessonId]` — レッスン詳細 + 発問
- [ ] レッスン一覧ページを実データ対応
- [ ] レッスン視聴ページを実データ対応（動画・発問）
- [ ] `mock-data.ts` の参照を段階的に除去

### マージ判断

読み取り専用 かつ RLS でアクセス制御済みなら安全にマージ可

---

## Phase 4: メモ機能

> tiptap 導入 + YouTube Player API 連携 + メモ CRUD。

### タスク

- [ ] tiptap をインストール（`@tiptap/react`, `@tiptap/starter-kit`）
- [ ] `MemoSection` の `<textarea>` を tiptap エディタに置き換え
- [ ] `api/memos/` Route Handler を実装
  - `GET /api/memos?lessonId=xxx` — 自分のメモ一覧
  - `POST /api/memos` — 新規保存
  - `PUT /api/memos/[memoId]` — 更新
  - `DELETE /api/memos/[memoId]` — 削除
- [ ] YouTube Player API 連携
  - タイムスタンプ記録（`player.getCurrentTime()`）
  - タイムスタンプクリックでシーク（`player.seekTo(秒数)`）

### マージ判断

`memos` テーブルの RLS（本人のみ読み書き）を確認してからマージ

---

## Phase 5: 共有投稿機能

> メモをクラスに匿名共有する。

### タスク

- [ ] `api/posts/` Route Handler を実装
  - `GET /api/posts?lessonId=xxx` — 投稿一覧（全員閲覧可）
  - `POST /api/posts` — メモから投稿（スナップショット保存）
- [ ] `PostList` を実データ対応
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
[ ] Phase 2: ルートグループ再構成
[ ] Phase 3: レッスン一覧・視聴（実データ）
[ ] Phase 4: メモ機能
[ ] Phase 5: 共有投稿機能
[ ] Phase 6: 教師機能
[ ] Phase 7: 小テスト
```

次の着手は **Phase 2: ルートグループ再構成**。
