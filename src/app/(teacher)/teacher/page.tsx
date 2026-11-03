import Link from "next/link";

type HubLink = {
  href: string;
  title: string;
  description: string;
};

const CREATE_LINKS: HubLink[] = [
  {
    href: "/teacher/contents",
    title: "コンテンツ管理",
    description: "科目・単元・レッスンの追加と編集。ノートのひな形と小テストもここから",
  },
  {
    href: "/teacher/maker",
    title: "自由制作",
    description: "生徒が作るものを決めて制作・提出する課題の配信と、クラスごとの公開",
  },
];

const OBSERVE_LINKS: HubLink[] = [
  {
    href: "/teacher/analytics",
    title: "分析",
    description: "小テストの正答率、コードの取り組み、ノートから、つまずきを把握する",
  },
  {
    href: "/teacher/students",
    title: "生徒一覧",
    description: "学籍番号・備考の確認と編集",
  },
  {
    href: "/teacher/data-export",
    title: "データエクスポート",
    description: "小テスト結果・ノートを CSV で書き出し、AI での分析に使う",
  },
];

/** 教員画面は一覧性を優先し、カードや絵文字の飾りを使わない（docs/design.md） */
function LinkList({ heading, links }: { heading: string; links: HubLink[] }) {
  return (
    <section className="mt-6">
      <h2 className="pb-1 border-b border-ink text-[13px] font-semibold tracking-[0.08em] text-muted-foreground">
        {heading}
      </h2>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="group grid grid-cols-[200px_minmax(0,1fr)] gap-4 py-3 border-b border-rule"
        >
          <span className="font-semibold group-hover:underline underline-offset-4">{link.title}</span>
          <span className="text-[13px] text-muted-foreground">{link.description}</span>
        </Link>
      ))}
    </section>
  );
}

export default function TeacherHubPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="font-hand font-semibold text-[26px] leading-normal">教師ページ</h1>
      <p className="text-[13px] text-muted-foreground">
        授業づくりと生徒の学習状況の確認は、ここからすべての機能にアクセスできます。
      </p>
      <LinkList heading="授業をつくる" links={CREATE_LINKS} />
      <LinkList heading="生徒をみる" links={OBSERVE_LINKS} />
    </div>
  );
}
