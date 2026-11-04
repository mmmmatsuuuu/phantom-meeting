import Image from "next/image";

/** ヘッダーのロゴ。ヤギの顔は余白が多い画像のため、拡大して顔だけを見せる */
export default function SiteLogo() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-[34px] h-[34px] overflow-hidden shrink-0">
        <Image
          src="/mascot/face.png"
          alt=""
          width={34}
          height={34}
          priority
          className="w-full h-full scale-150 translate-y-[4%] mix-blend-multiply"
        />
      </span>
      <span className="font-hand font-semibold text-[21px] tracking-wide">ruminy</span>
    </span>
  );
}
