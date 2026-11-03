import { listDevAccounts } from "@/lib/dev-login";

type Props = {
  hasError: boolean;
};

/** 開発環境専用のダミーアカウントログイン。表示の可否は呼び出し側で isDevLoginEnabled により判定する */
export default function DevLoginPanel({ hasError }: Props) {
  return (
    <form
      action="/login/dev"
      method="post"
      className="rounded-sm border border-dashed border-rule-strong bg-surface p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-ink">
        開発環境のみ：ダミーアカウントでログイン
      </p>
      <select
        name="email"
        className="w-full px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {listDevAccounts().map((account) => (
          <option key={account.email} value={account.email}>
            {account.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full py-2 text-sm rounded-md border bg-card hover:bg-muted transition-colors"
      >
        ログイン
      </button>
      {hasError && (
        <p className="text-xs text-destructive">
          ログインできませんでした。README の「ダミーアカウントでのログイン」の手順で準備してください。
        </p>
      )}
    </form>
  );
}
