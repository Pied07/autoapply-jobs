import crypto from "crypto";
import { NextResponse } from "next/server";

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const hasUploadPreset = Boolean(uploadPreset && !uploadPreset.startsWith("replace_with_"));

  if (!cloudName || (!hasUploadPreset && (!apiKey || !apiSecret))) {
    return NextResponse.json(
      {
        error:
          "Cloudinary env vars are missing. Provide CLOUDINARY_CLOUD_NAME plus either CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.",
      },
      { status: 500 },
    );
  }

  const form = await request.formData();
  const file = form.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }

  const uploadForm = new FormData();
  const publicId = `resumes/${crypto.randomUUID()}`;
  uploadForm.set("file", file);
  uploadForm.set("public_id", publicId);

  if (hasUploadPreset) {
    uploadForm.set("upload_preset", uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signCloudinaryParams({ public_id: publicId, timestamp }, apiSecret);

    uploadForm.set("api_key", apiKey);
    uploadForm.set("timestamp", timestamp);
    uploadForm.set("signature", signature);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: "POST",
    body: uploadForm,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | undefined;
    return NextResponse.json({ error: data?.error?.message || "Cloudinary upload failed." }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json({
    url: data.secure_url,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
}
