import { getContents } from "@/lib/db/contents";
import DataExport from "@/components/teacher/data-export";

export default async function DataExportPage() {
  const subjects = await getContents();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">データエクスポート</h1>
        <p className="text-muted-foreground text-sm mt-1">
          授業データを生成 AI で活用するための形式でエクスポートします
        </p>
      </div>
      <DataExport subjects={subjects} />
    </div>
  );
}
