"use client";

/**
 * POST / PUT 系の送信ボタン共通コンポーネント。
 * loading={true} の間は自動的に disabled になり、loadingLabel を表示する。
 * これにより多重送信を防止する。
 *
 * 【使用規約】
 * サーバーへのデータ書き込みを伴うボタン（POST / PUT）には必ずこのコンポーネントを使うこと。
 * loading state の管理は呼び出し元で行い、通信開始時に true・完了時に false をセットする。
 */

type Props = {
  /** 送信中かどうか。true の間はボタンが disabled になり loadingLabel を表示する */
  loading: boolean;
  /** 送信中に表示するラベル（省略時: "送信中..."） */
  loadingLabel?: string;
  /** loading 以外の理由でボタンを無効化したい場合に使用 */
  disabled?: boolean;
  /** クリック時のハンドラ。form の onSubmit で処理する場合は省略可 */
  onClick?: () => void;
  /** ボタンの type 属性（省略時: "button"） */
  type?: "button" | "submit";
  /** Tailwind クラス。省略時はプライマリボタンのデフォルトスタイルが適用される */
  className?: string;
  children: React.ReactNode;
};

export default function SubmitButton({
  loading,
  loadingLabel = "送信中...",
  disabled = false,
  onClick,
  type = "button",
  className = "w-full py-2.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed",
  children,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={className}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
