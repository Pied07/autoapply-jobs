import type { ParsedResumeProfile } from "@/types/profile";
import { GoogleGenAI } from "@google/genai";

export type ResumeRefinement = {
  parsed: ParsedResumeProfile;
  provider: "gemini" | "parser";
  error?: string;
};

function cleanText(value: string | undefined, maxLength: number) {
  if (!value) return undefined;

  let cleaned = value.replace(/^(Experience|Projects|Skills):\s*/i, "");
  cleaned = cleaned.replace(/(?:^|\n|\s)(?:\d{1,2}|[a-zA-Z])\s*\.\s+/g, "\n- ");
  cleaned = cleaned.replace(/\.{2,}/g, ".");
  cleaned = cleaned.replace(/[*#`]/g, ""); // Strip markdown characters like ** and ###
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n\s*\n/g, "\n").trim();

  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

export async function refineParsedResumeProfile(parsed: ParsedResumeProfile): Promise<ResumeRefinement> {
  const hasTextToRefine = parsed.skills?.length || parsed.experience || parsed.projects?.length;
  if (!hasTextToRefine) return { parsed, provider: "parser" };

  if (!process.env.GEMINI_API_KEY) {
    return {
      parsed: {
        ...parsed,
        experience: cleanText(parsed.experience, 1200) || parsed.experience,
        projects: parsed.projects ? (parsed.projects.map(p => cleanText(p, 1200)).filter(Boolean) as string[]) : parsed.projects,
      },
      provider: "parser",
      error: "GEMINI_API_KEY is not set. Falling back to native parser.",
    };
  }

  try {
    const ai = new GoogleGenAI();
    
    // We can ask Gemini to summarize the whole experience cleanly in one go!
    let experience = parsed.experience;
    if (parsed.experience) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Rewrite this resume experience section to be concise, professional, and formatted with simple bullet points. CRITICAL RULES: 1. DO NOT use any markdown formatting (no asterisks **, no hashes #). 2. DO NOT include any conversational text, introductions, or tips. 3. Output ONLY the raw resume text. Preserve all company names and important metrics. Experience: ${parsed.experience}`,
      });
      experience = response.text || parsed.experience;
    }

    let projects = parsed.projects;
    if (parsed.projects && parsed.projects.length > 0) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Rewrite these resume projects to be concise, professional, and formatted with simple bullet points. CRITICAL RULES: 1. DO NOT use any markdown formatting (no asterisks **, no hashes #). 2. DO NOT include any conversational text, introductions, or tips. 3. Output ONLY the raw resume text. Projects: ${parsed.projects.join(". ")}`,
      });
      // Split the response back into an array if needed, or just keep as one block. 
      // The frontend can handle it as a single string block if joined, or we can just return it as a 1-element array.
      projects = response.text ? [response.text] : parsed.projects;
    }

    return {
      parsed: {
        ...parsed,
        skills: parsed.skills, // Keep skills native (comma separated)
        experience: cleanText(experience, 1200) || experience,
        projects: projects ? projects.map(p => cleanText(p, 2000)).filter(Boolean) as string[] : parsed.projects,
      },
      provider: "gemini",
    };
  } catch (error) {
    return {
      parsed: {
        ...parsed,
        experience: cleanText(parsed.experience, 1200) || parsed.experience,
        projects: parsed.projects ? (parsed.projects.map(p => cleanText(p, 1200)).filter(Boolean) as string[]) : parsed.projects,
      },
      provider: "parser",
      error: error instanceof Error ? `Gemini AI error: ${error.message}` : "Gemini AI error.",
    };
  }
}
