import { ImageResponse } from "next/og";
import { MascotFace } from "@/lib/mascot-icon";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(await MascotFace({ size: size.width }), { ...size });
}
