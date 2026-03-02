# 技術スタック

## スタック一覧

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
| AI | OpenAI API（最上位モデル、動画登録時のみ使用） |

## 選定理由

- **Clerk廃止**：Supabase AuthがGoogle認証をネイティブサポート
- **無料枠**：Supabase・Vercel共に無料枠で運用可能
- **Google連携**：生徒・教師ともにGoogleアカウントで認証
- **Next.js**：React 5年以上の経験があり学習コストゼロ、AI補助の情報量が最大
- **AI**：動画登録時のみ呼び出すため、最上位モデルでもコストは無視できる水準
