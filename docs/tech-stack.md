# 技術スタック

## スタック一覧

| 役割 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) |
| バックエンド | Next.js API Routes（Client からの mutation と秘匿キーが必要な処理のみ） |
| DB | Supabase |
| 認証 | Supabase Auth（Google OAuth） |
| ホスティング | Vercel |
| 動画 | YouTube埋め込み |
| UIコンポーネント | shadcn/ui + Tailwind CSS |
| リッチテキスト | tiptap |
| ドラッグ&ドロップ | @dnd-kit（小テスト並び替え問題） |
| 画像ホスティング | ImageKit（小テスト問題文・解説の画像） |
| Markdown変換 | tiptap-markdown（メモの Markdown エクスポート） |
| 画面遷移フィードバック | nextjs-toploader（画面遷移中のトップローディングバー） |
| AI | Claude API（Anthropic）※将来：発問自動生成 |

## 選定理由

- **Clerk廃止**：Supabase AuthがGoogle認証をネイティブサポート
- **無料枠**：Supabase・Vercel共に無料枠で運用可能（ImageKit も無料枠内）
- **Google連携**：生徒・教師ともにGoogleアカウントで認証
- **Next.js**：React 5年以上の経験があり学習コストゼロ、AI補助の情報量が最大
- **Claude API**：将来の発問生成時のみ呼び出すため、最上位モデルでもコストは無視できる水準
- **ImageKit**：無料枠でも画像変換・CDN配信が使えるため画像最適化を別途実装不要
