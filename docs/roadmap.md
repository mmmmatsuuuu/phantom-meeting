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

- [x] `src/lib/db/posts.ts` を実装（投稿クエリを集約）
- [x] `api/posts/` Route Handler を実装（重複チェック付き）
  - `GET /api/posts?lessonId=xxx` — 投稿一覧（全員閲覧可）
  - `POST /api/posts` — メモから投稿（重複時 409）
  - `DELETE /api/posts/[postId]` — 自分の投稿を削除
- [x] `PostList` を Client Component に書き換え、Supabase Realtime でリアルタイム更新
- [x] 自分の投稿 / 他者の投稿を明示的に区別して表示（自分の投稿はハイライト・削除ボタン）
- [x] 投稿は匿名表示（`display_name` を出さない）
- [x] 投稿フィードバックを toast に統一（成功・重複・失敗）
- [x] memos/posts ともにクライアントフェッチに統一し page.tsx を簡素化

### マージ判断

自分の投稿が誰のものか特定できない表示になっていることを確認してからマージ

---

## Phase 6: 教師機能

> レッスン登録フォームの実装 + 科目・単元管理。

### タスク

- [x] `api/contents/` に POST/PUT/DELETE を追加（lessons, subjects, units）
- [x] レッスン登録フォームを実データ対応（バリデーション・toast・リダイレクト）
- [x] `/teacher/contents` 科目・単元管理ページを追加
  - 科目・単元のインライン追加・編集・削除
  - 「レッスン追加」ボタンで unitId を引き継いでレッスン登録フォームに遷移
- [ ] AI発問提案機能（MVP後検討）
- [ ] teacher 承認フロー（MVP後検討）

### マージ判断

teacher ロール以外が登録・編集できないことを確認してからマージ

---

## Phase 7: 運用基盤整備

> ロール管理の UI 化と NavBar の整理。実装コストが低く、運用上の前提となる。

### タスク

- [x] DropdownMenu の表示項目をロールによって切り替え
  - student には「コンテンツ管理」「レッスン登録」を非表示
  - NavBar で role を取得して UserMenu に渡す
- [x] admin 用 生徒→教師昇格ページ（`/admin/users`）
  - 未承認 teacher 一覧の表示と承認ボタン
  - `profiles.role` / `is_approved` を変更する `PUT /api/admin/users/[userId]` を追加

### マージ判断

student ロールで teacher 専用メニューが非表示になっていること、昇格が admin のみ実行できることを確認してからマージ

---

## Phase 8: エディタ強化

> メモ体験の向上。

### タスク

- [x] Tiptap エディタのリッチ化
  - ツールバーを追加（Bold / Italic / Heading / BulletList / Link）
  - `@tiptap/extension-link` を追加
- [x] 番号付きリスト・インラインコード・コードブロック・コールアウト追加
- [x] シンタックスハイライト（`lowlight` + `@tiptap/extension-code-block-lowlight`）
- [x] `RichContent` コンポーネントで投稿・過去メモのリッチ表示に統一
- [x] メモエリア幅拡大（`grid-cols-5` レイアウト）

### マージ判断

既存のメモ保存・表示に影響がないことを確認してからマージ

---

## Phase 9: 小テスト

> 理解確認を担う機能。動画視聴・発問・メモとの役割分担を意識した設計。

### タスク

- [x] 問題作成フォーム（teacher）
  - レッスンに紐づく quiz を作成
  - 問題形式：選択式 / 記述式 / 並び替え
  - quiz_questions を一括登録
  - 選択肢数は可変（最低2つ）
  - 問題文・解説は tiptap（コードブロック対応）
  - 既存クイズは問題単位で追加・削除可能
- [x] 回答 UI（student）
  - レッスン視聴ページに小テストセクションを追加
  - 選択式・記述式・並び替えの回答 UI
  - 並び替えは DnD（@dnd-kit）
- [x] 採点機能
  - 選択式・並び替えは自動採点
  - 記述式は模範解答表示による自己採点
  - 提出後に解説を表示（正解・不正解関係なし）

### マージ判断

teacher のみ問題を作成・編集でき、student が回答できることを確認してからマージ

---

## Phase 10: デザイン魅力化

> 小テスト実装後、運用が安定した段階で着手する。何をどこに追加するかを先に具体化する。

### タスク

- [ ] 空状態（レッスンなし・メモなし）のイラスト・メッセージ追加
- [ ] レッスン一覧カードのビジュアル改善
- [ ] その他、運用を通じて見えてきた改善点に対応

### マージ判断

既存機能に影響がないことを確認してからマージ

---

## Phase 11: データ出力（生徒向け）

> 生徒自身がデータを持ち出せる手段を提供する。

### タスク

- [ ] メモの Markdown 出力
  - メモ一覧から「Markdown でダウンロード」ボタンを追加
  - tiptap JSON → Markdown 変換（`tiptap-markdown` パッケージ）

### マージ判断

既存のメモ保存・表示に影響がないことを確認してからマージ

---

## Phase 12: データ出力（教師向け）

> 評価・分析のために教師が生徒のデータを取り出せる手段を提供する。

### タスク

- [ ] 教師用 CSV 出力
  - 対象：レッスンごとの投稿一覧（匿名 or 記名は要検討）
  - Phase 9 完了後は小テスト回答データも対象に追加
- [ ] 出力 UI の配置先を検討（`/teacher/contents` 内か、専用ページか）

### 備考

> Phase 12 の実装時点で、教師・生徒それぞれの**ダッシュボードページ**の必要性を再検討する。
> 機能が増えた段階で「どこから何を操作・閲覧するか」の起点となるページが必要になる可能性がある。

### マージ判断

teacher ロール以外が他者のデータを取得できないことを確認してからマージ

---

## Phase 13: いいね機能（要設計）

> 学習インセンティブとして導入するか慎重に吟味する。

### 設計上の注意点

- いいね数を公開すると「受けを狙った投稿」が増え、正直な気づきが書きにくくなるリスクがある
- 検討案：いいね数は教師のみ閲覧可能、生徒には自分がいいねしたかどうかだけ表示する

### タスク

- [ ] 設計を確定させてから実装に着手（要議論）
- [ ] `likes` テーブル追加（user_id, post_id、複合ユニーク制約）
- [ ] 投稿カードにいいねボタンを追加

---

## ウェイトリスト

> 実装予定はあるが、時期未定のタスク。優先度が上がった時点でフェーズに組み込む。

- teacher 申請フロー：student がUI上で教師申請を出せる機能（現状は admin が DB を直接操作して role を変更）
- レッスン削除機能：コンテンツ管理ページからレッスンを削除できる機能（現状は科目・単元のみ削除可能）

---

## 現在地

```
[✅] Phase 0: 本番 Supabase 環境構築
[✅] Phase 1: 認証基盤
[✅] Phase 2: ルートグループ再構成
[✅] Phase 3: レッスン一覧・視聴（実データ）
[✅] Phase 4: メモ機能
[✅] Phase 5: 共有投稿機能
[✅] Phase 6: 教師機能
[✅] Phase 7: 運用基盤整備
[✅] Phase 8: エディタ強化
[✅] Phase 9: 小テスト
[ ] Phase 10: デザイン魅力化
[ ] Phase 11: データ出力（生徒向け）
[ ] Phase 12: データ出力（教師向け）
[ ] Phase 13: いいね機能（要設計）
```

次の着手は **Phase 10: デザイン魅力化**。
