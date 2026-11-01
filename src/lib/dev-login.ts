/**
 * 開発環境専用のダミーアカウントログイン。
 * ローカルでは Google OAuth を使わずに教師・生徒を切り替えて動作確認できるようにする。
 * アカウントは supabase/seed.sql と supabase/seeds/dev-login.sql で用意する（本番 DB には存在しない）。
 */

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const DEV_ACCOUNT_EMAIL = /^seed-(teacher1|student[12][12]0[1-8])@example\.com$/;

/** supabase/seeds/dev-login.sql で設定するパスワード。ローカル DB 専用の公開値 */
export const DEV_LOGIN_PASSWORD = "dev-login-password";

export type DevAccount = { email: string; label: string };

/** NODE_ENV が development で、かつ接続先がローカルの Supabase のときだけ有効にする */
export function isDevLoginEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): boolean {
  if (nodeEnv !== "development" || !supabaseUrl) return false;
  try {
    return LOCAL_HOSTS.includes(new URL(supabaseUrl).hostname);
  } catch {
    return false;
  }
}

export function isDevAccountEmail(email: string): boolean {
  return DEV_ACCOUNT_EMAIL.test(email);
}

/** シードの教師1名と生徒32名（2学年 × 2組 × 8名）を返す */
export function listDevAccounts(): DevAccount[] {
  const accounts: DevAccount[] = [
    { email: "seed-teacher1@example.com", label: "テスト教師1" },
  ];
  for (const grade of [1, 2]) {
    for (const classNum of [1, 2]) {
      for (let number = 1; number <= 8; number++) {
        const studentNumber = grade * 1000 + classNum * 100 + number;
        accounts.push({
          email: `seed-student${studentNumber}@example.com`,
          label: `生徒 ${studentNumber}（${grade}年${classNum}組${number}番）`,
        });
      }
    }
  }
  return accounts;
}
