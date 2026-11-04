import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api/auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 用途ごとの ImageKit のフォルダとファイル名の接頭辞（ImageKit 上で用途を見分けられるようにする）
const PURPOSES = {
  quiz: { folder: "/phantom_meeting/quiz-images", prefix: "quiz" },
  "note-template": { folder: "/phantom_meeting/note-template-images", prefix: "note_template" },
} as const;

function isPurpose(value: unknown): value is keyof typeof PURPOSES {
  return typeof value === "string" && Object.hasOwn(PURPOSES, value);
}

// 画像を入れられるのは教師だけ（小テストとノートのひな形）。
// 生徒のノートに入る画像は、ひな形にあるものに限る（docs/design.md）
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireTeacher();
  if (errorResponse) return errorResponse;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ data: null, error: "file is required" }, { status: 400 });
  }

  const purpose = formData.get("purpose");
  if (!isPurpose(purpose)) {
    return NextResponse.json({ data: null, error: "purpose must be quiz or note-template" }, { status: 400 });
  }
  const { folder, prefix } = PURPOSES[purpose];

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ data: null, error: "Only image files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ data: null, error: "File size must be 5MB or less" }, { status: 400 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json({ data: null, error: "ImageKit is not configured" }, { status: 500 });
  }

  const authHeader = Buffer.from(`${privateKey}:`).toString("base64");
  const ext = file.type.split("/")[1] ?? "png";
  const fileName = `${prefix}_${Date.now()}.${ext}`;

  const uploadForm = new FormData();
  uploadForm.append("file", file);
  uploadForm.append("fileName", fileName);
  uploadForm.append("folder", folder);

  const ikRes = await fetch("https://upload.imagekit.io/api/v2/files/upload", {
    method: "POST",
    headers: { Authorization: `Basic ${authHeader}` },
    body: uploadForm,
  });

  if (!ikRes.ok) {
    const errText = await ikRes.text();
    console.error("ImageKit upload error:", errText);
    return NextResponse.json({ data: null, error: "Image upload failed" }, { status: 502 });
  }

  const ikData = (await ikRes.json()) as { url: string; fileId: string };
  return NextResponse.json({ data: { url: ikData.url, fileId: ikData.fileId }, error: null }, { status: 201 });
}
