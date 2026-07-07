import Link from "next/link";

type HubCard = {
  href: string;
  emoji: string;
  title: string;
  description: string;
};

const CREATE_CARDS: HubCard[] = [
  {
    href: "/teacher/contents",
    emoji: "📚",
    title: "コンテンツ管理",
    description: "科目・単元・レッスンの追加・編集・削除。レッスン登録や小テスト作成もここから",
  },
];

const OBSERVE_CARDS: HubCard[] = [
  {
    href: "/teacher/analytics",
    emoji: "📈",
    title: "分析",
    description: "単元別・レッスン別の正答率から生徒のつまずきを把握する",
  },
  {
    href: "/teacher/students",
    emoji: "👥",
    title: "生徒一覧",
    description: "生徒の学籍番号・備考の確認とインライン編集",
  },
  {
    href: "/teacher/data-export",
    emoji: "📤",
    title: "データエクスポート",
    description: "小テスト結果・メモを CSV 出力して AI 分析に活用する",
  },
];

function CardGrid({ cards }: { cards: HubCard[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="bg-card border rounded-xl p-5 hover:border-indigo-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl">{card.emoji}</span>
            <h3 className="font-semibold group-hover:text-indigo-600 transition-colors">
              {card.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {card.description}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function TeacherHubPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">教師ページ</h1>
        <p className="text-sm text-muted-foreground">
          授業づくりと生徒の学習状況の確認は、ここからすべての機能にアクセスできます。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
          📖 授業をつくる
        </h2>
        <CardGrid cards={CREATE_CARDS} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
          👀 生徒をみる
        </h2>
        <CardGrid cards={OBSERVE_CARDS} />
      </section>
    </div>
  );
}
