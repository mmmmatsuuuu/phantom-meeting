import Link from "next/link";
import Mascot from "@/components/shared/mascot";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <Mascot pose="not-found" size={200} className="mx-auto" />
      <h1 className="mt-2 font-hand font-semibold text-xl">このページはヤギが食べてしまいました</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        アドレスが間違っているか、ページがなくなっています。
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-4 py-2 text-sm rounded-sm border border-ink hover:bg-surface transition-colors"
      >
        目次へ戻る
      </Link>
    </div>
  );
}
