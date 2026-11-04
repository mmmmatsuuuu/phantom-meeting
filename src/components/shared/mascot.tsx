import Image from "next/image";

// 一覧と描いたときの指示文は docs/mascot.md。aspect は幅 ÷ 高さ（rest.png だけ寝そべっているため横長）
const POSES = {
  login: { src: "/mascot/login.png", aspect: 1 },
  offer: { src: "/mascot/offer.png", aspect: 1 },
  "not-found": { src: "/mascot/not-found.png", aspect: 1 },
  rest: { src: "/mascot/rest.png", aspect: 3 / 2 },
} as const;

type Props = {
  pose: keyof typeof POSES;
  /** 表示する高さ（px）。幅は絵の縦横比から決まる */
  size: number;
  className?: string;
};

/**
 * ヤギの絵。絵の内側は白で塗られているため、乗算で重ねて紙の色を透かす。
 * 1 画面に 1 匹だけ置く（docs/design.md の「マスコット」）
 */
export default function Mascot({ pose, size, className = "" }: Props) {
  const { src, aspect } = POSES[pose];
  return (
    <Image
      src={src}
      alt=""
      width={Math.round(size * aspect)}
      height={size}
      className={`mix-blend-multiply shrink-0 ${className}`}
    />
  );
}
