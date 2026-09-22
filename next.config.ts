import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.194"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
