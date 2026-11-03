import { ImageResponse } from "next/og";
import { MascotFace } from "@/lib/mascot-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iPhone のホーム画面は透明な部分を黒で塗るため、紙の色で埋める
export default async function AppleIcon() {
  return new ImageResponse(await MascotFace({ size: size.width, background: "#efede6" }), {
    ...size,
  });
}
