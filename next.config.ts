import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    // リダイレクトのみを行うページコンポーネント（redirect()を呼ぶだけの
    // Server Component）は、Turbopackの開発サーバーでRSCのパフォーマンス
    // 計測が負のタイムスタンプを算出しクラッシュすることがあるため、
    // ルーティング層のリダイレクトに置き換える。
    return [
      {
        source: "/teacher/analytics",
        destination: "/teacher/analytics/units",
        permanent: false,
      },
      {
        source: "/teacher/quiz-analytics",
        destination: "/teacher/analytics/units",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
