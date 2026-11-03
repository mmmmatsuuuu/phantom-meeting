import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// 内容（先生や生徒が書いたもの）の書体 Klee One は Google Fonts から読み込む。
// next/font はビルド時に日本語の分割ファイルを 100 個以上ダウンロードし、タイムアウトで失敗しやすいため使わない。
// ブラウザは表示に使った文字の分だけを取りに行き、読み込み中は標準の書体で表示する
const KLEE_ONE_URL =
  "https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&display=swap";

export const metadata: Metadata = {
  title: "ruminy",
  description: "飲み込んで終わりにしない。反芻する学習サイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={KLEE_ONE_URL} />
      </head>
      <body className="antialiased min-h-screen bg-background">
        <NextTopLoader color="#1d2b3f" showSpinner={false} />
        <TooltipProvider>
          {/* ヘッダーは各ルートグループのレイアウトで出す（ログインと 404 はヤギを大きく出すため、ヘッダーを置かない） */}
          <main>{children}</main>
          <Toaster />
        </TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
