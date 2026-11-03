import Image from "next/image";

// 一覧と描いたときの指示文は docs/mascot.md
const POSE_IMAGES = {
  login: "/mascot/login.png",
  offer: "/mascot/offer.png",
  "not-found": "/mascot/not-found.png",
  // rest.png（寝そべって反芻）は未生成のため、共通の前置きだけで描いた mascot.png で代用する
  rest: "/mascot/mascot.png",
} as const;

type Props = {
  pose: keyof typeof POSE_IMAGES;
  size: number;
  className?: string;
};

/**
 * ヤギの絵。絵の内側は白で塗られているため、乗算で重ねて紙の色を透かす。
 * 1 画面に 1 匹だけ置く（docs/design.md の「マスコット」）
 */
export default function Mascot({ pose, size, className = "" }: Props) {
  return (
    <Image
      src={POSE_IMAGES[pose]}
      alt=""
      width={size}
      height={size}
      className={`mix-blend-multiply shrink-0 ${className}`}
    />
  );
}
