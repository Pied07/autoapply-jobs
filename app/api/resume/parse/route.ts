import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";
import mammoth from "mammoth";

import { recognize } from "tesseract.js";
import { parseResumeFromText } from "@/lib/resume/parser";
import { refineParsedResumeProfile } from "@/lib/resume/huggingface-refiner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;



type ExtractResult = {
  text: string;
  method:
    | "pdf-text"
    | "pdf-text-low-confidence"
    | "docx-text"
    | "plain-text"
    | "image-ocr"
    | "pdf-ocr"
    | "fallback";
  error?: string;
};

function getOcrCachePath() {
  return process.platform === "win32" ? "C:\\tmp\\tesseract-cache" : "/tmp/tesseract-cache";
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file.name);
}

function hasUsefulResumeText(text: string) {
  return text.trim().length > 120 && /@|skills?|experience|education|projects?/i.test(text);
}

async function runOcr(buffer: Buffer) {
  const result = await recognize(buffer, "eng", {
    cachePath: getOcrCachePath(),
    logger: () => undefined,
  });

  return result.data.text;
}

const pdf = require("pdf-parse");

async function extractText(file: File): Promise<ExtractResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (isImageFile(file)) {
    return { text: await runOcr(buffer), method: "image-ocr" };
  }

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    let text = "";
    try {
      const data = await pdf(buffer);
      text = data.text;
    } catch (e) {
      console.error("PDF parse error", e);
    }

    if (hasUsefulResumeText(text)) {
      return { text, method: "pdf-text" };
    }


    return { text, method: "pdf-text-low-confidence" };
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, method: "docx-text" };
  }

  return { text: buffer.toString("utf8"), method: "plain-text" };
}

function readableNameFromFile(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b(resume|cv|curriculum vitae)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("resume");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
  }

  const extracted = await extractText(file).catch(
    (error): ExtractResult => ({
      text: "",
      method: "fallback",
      error: error instanceof Error ? error.message : "Unknown resume extraction error",
    }),
  );
  const parsed = await parseResumeFromText(extracted.text || readableNameFromFile(file.name));
  const refined = await refineParsedResumeProfile(parsed);

  return NextResponse.json({
    parsed: refined.parsed,
    diagnostics: {
      extractedCharacters: extracted.text.length,
      method: refined.provider === "gemini" ? `${extracted.method} + Gemini AI` : extracted.method,
      error: extracted.error || refined.error,
      usedFileNameFallback: extracted.text.trim().length === 0,
    },
  });
}
