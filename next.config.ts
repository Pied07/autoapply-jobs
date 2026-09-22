import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["192.168.0.194"],
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "tesseract.js"],
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/api/resume/parse": ["./node_modules/pdfjs-dist/**/*", "./node_modules/tesseract.js/**/*"],
    },
  },
};

export default nextConfig;
