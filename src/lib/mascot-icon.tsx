import { readFile } from "node:fs/promises";
import { join } from "node:path";

// face.png（1254px 四方）のうち顔が収まる正方形の範囲。画像は余白が多く、
// そのまま縮めると 16〜32px で潰れるため、この範囲を切り出してアイコンにする
const SOURCE_SIZE = 1254;
const CROP = { left: 175, top: 210, size: 900 };

/** アイコン用に、ヤギの顔を切り出して指定の大きさで描く（next/og の ImageResponse 用） */
export async function MascotFace({ size, background }: { size: number; background?: string }) {
  const data = await readFile(join(process.cwd(), "public/mascot/face.png"));
  const scale = size / CROP.size;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: background ?? "transparent",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${data.toString("base64")}`}
        width={SOURCE_SIZE * scale}
        height={SOURCE_SIZE * scale}
        alt=""
        style={{ position: "absolute", left: -CROP.left * scale, top: -CROP.top * scale }}
      />
    </div>
  );
}
