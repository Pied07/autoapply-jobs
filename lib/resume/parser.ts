import type { ParsedResumeProfile } from "@/types/profile";

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const emailGlobalPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const indianPhoneGlobalPattern = /(?:\+?91[\s\-|().]*)?[6-9](?:[\s\-|().]*\d){9}/g;
const urlPattern = /(https?:\/\/|linkedin\.com|github\.com|mailto:)/i;

const sectionHeadings = [
  "work experience",
  "technical skills",
  "soft skills",
  "programming languages",
  "frameworks",
  "summary",
  "objective",
  "profile",
  "education",
  "academic",
  "experience",
  "internship",
  "skills",
  "projects",
  "certifications",
  "achievements",
  "address",
  "contact",
];

const headingAlternation = sectionHeadings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const sectionLinePattern = new RegExp(`^(${headingAlternation})\\s*:?$`, "i");

const knownSkills = [
  "JavaScript",
  "TypeScript",
  "React",
  "React.js",
  "Next.js",
  "Node.js",
  "Express.js",
  "Laravel",
  "PHP",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Firebase",
  "Tailwind CSS",
  "HTML",
  "CSS",
  "Java",
  "Python",
  "C++",
  "Git",
  "GitHub",
  "REST API",
  "API",
  "CodeIgniter",
  "Django",
  "Bootstrap",
];

function normalizeText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\u2022\u25cf\u25aa\u25e6]/g, "\n")
    .replace(/\t/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(new RegExp(`\\b(${headingAlternation})\\s*:`, "gi"), "\n$1:\n")
    .replace(new RegExp(`(^|\\n|\\s{2,})(${headingAlternation})(?=\\s+\\d+\\.|\\s+[A-Z][A-Za-z ]+:)`, "gi"), "\n$2\n")
    .replace(/(\d+)\.\s*/g, "\n$1. ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLines(text: string) {
  return normalizeText(text)
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanListItem(value: string) {
  return value
    .replace(/^\d+\s*\.\s*/, "")
    .replace(/^[-–—]+/, "")
    .replace(/\b(frameworks?|programming languages?|soft skills?|skills?|projects?)\b\s*:?/gi, "")
    .trim();
}

function splitList(value: string) {
  return value
    .split(/[,|;·\n]/)
    .map(cleanListItem)
    .filter((item) => item.length > 1 && !sectionLinePattern.test(item))
    .slice(0, 18);
}

function getSection(lines: string[], headings: string[]) {
  const start = lines.findIndex((line) =>
    headings.some((heading) => new RegExp(`^${heading}\\s*:?$`, "i").test(line)),
  );

  if (start === -1) {
    const inline = lines.find((line) =>
      headings.some((heading) => new RegExp(`^${heading}\\s*:`, "i").test(line)),
    );

    return inline ?? "";
  }

  const sectionLines: string[] = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    if (sectionLinePattern.test(lines[index])) break;
    sectionLines.push(lines[index]);
  }

  return sectionLines.join("\n");
}

function extractName(lines: string[]) {
  return lines
    .find((line) => {
      const cleaned = line.replace(/resume|curriculum vitae|cv/gi, "").trim();
      return (
        cleaned.length >= 3 &&
        cleaned.length <= 70 &&
        !emailPattern.test(cleaned) &&
        !extractPhone(cleaned) &&
        !urlPattern.test(cleaned) &&
        !sectionLinePattern.test(cleaned) &&
        !/^\d+$/.test(cleaned)
      );
    })
    ?.replace(/resume|curriculum vitae|cv/gi, "")
    .trim();
}

function extractPhone(text: string) {
  const direct = text.match(/(?:\+?91[\s\-|().]*)?[6-9](?:[\s\-|().]*\d){9}/);
  if (direct) return compactPhone(direct[0]);

  const digitRuns = text.match(/\d[\d\s\-|().]{8,}\d/g) ?? [];
  for (const run of digitRuns) {
    const digits = run.replace(/\D/g, "");
    const mobile = digits.match(/(?:91)?([6-9]\d{9})/);
    if (mobile) return mobile[1];
  }

  return undefined;
}

function compactPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  if (digits.length >= 10) return digits.slice(-10);
  return phone.trim();
}

function extractSkills(lines: string[], normalized: string) {
  const skillsSection = getSection(lines, ["skills", "technical skills", "frameworks", "programming languages"]);
  const labelledSkills = lines
    .filter((line) => /^(frameworks?|programming languages?|soft skills?|skills?)\s*:/i.test(line))
    .join("\n");
  const parsed = splitList(`${skillsSection}\n${labelledSkills}`);

  const fromDictionary = knownSkills.filter((skill) => new RegExp(`\\b${skill.replace(/[.+#]/g, "\\$&")}\\b`, "i").test(normalized));
  return Array.from(new Set([...parsed, ...fromDictionary])).slice(0, 18);
}

function extractProjects(lines: string[]) {
  const projectsSection = getSection(lines, ["projects"]);
  const projectBlocks = projectsSection
    .split("\n")
    .map(cleanListItem)
    .filter(Boolean)
    .reduce<string[]>((blocks, line) => {
      const isProjectTitle =
        /^[A-Z][A-Za-z0-9 .&-]{4,90}$/.test(line) &&
        !/^(using|developed|implemented|focused|created|built|designed|integrated|collaborated)\b/i.test(line);

      if (isProjectTitle || blocks.length === 0) {
        blocks.push(line);
      } else {
        const lastIndex = blocks.length - 1;
        blocks[lastIndex] = `${blocks[lastIndex]}\n- ${line}`;
      }

      return blocks;
    }, []);

  if (projectBlocks.length) return projectBlocks.slice(0, 8);

  return splitList(projectsSection).filter((item) => item.length < 90).slice(0, 8);
}

function extractEducationLine(lines: string[], kind: "college" | "school") {
  const education = getSection(lines, ["education", "academic"]);
  const candidates = (education ? education.split("\n") : lines).map((line) => line.trim());

  if (kind === "college") {
    const line = candidates.find((line) =>
      /college|university|institute|technology|b\.?tech|bachelor|master|degree|engineering/i.test(line),
    );
    return line ? cleanListItem(line) : undefined;
  }

  const line = candidates.find((line) => /school|class x|class xii|secondary|higher secondary|cbse|icse|isc/i.test(line));
  return line ? cleanListItem(line) : undefined;
}

function extractAddress(lines: string[]) {
  const addressSection = getSection(lines, ["address", "contact"]);
  const candidates = addressSection ? addressSection.split("\n") : lines;
  const addressLine = candidates.find((line) =>
    /road|street|lane|nagar|kolkata|delhi|mumbai|pune|bengaluru|bangalore|hyderabad|durgapur|west bengal|india|pin|\d{6}/i.test(
      line,
    ),
  );

  return addressLine ? cleanAddress(addressLine) : undefined;
}

function cleanAddress(value: string) {
  const withoutContactDetails = value
    .replace(emailGlobalPattern, " ")
    .replace(indianPhoneGlobalPattern, " ")
    .replace(/\b(email|e-mail|phone|mobile|mob|contact|address|location)\b\s*:?/gi, " ")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = withoutContactDetails
    .split(/\s*[|;]\s*/)
    .map((part) => part.replace(/^[-,:.\s]+|[-,:.\s]+$/g, "").trim())
    .filter(Boolean);

  const addressPart =
    parts.find((part) =>
      /road|street|lane|nagar|kolkata|delhi|mumbai|pune|bengaluru|bangalore|hyderabad|durgapur|west bengal|india|pin|\d{6}/i.test(
        part,
      ),
    ) ?? parts.at(-1);

  return addressPart?.replace(/^[-,:.\s]+|[-,:.\s]+$/g, "").trim();
}

function extractExperience(lines: string[]) {
  const section = getSection(lines, ["experience", "work experience", "internship"]);
  if (section) return section.slice(0, 1200);

  return lines
    .filter((line) => /developer|engineer|intern|worked|built|developed|maintained|freelance/i.test(line))
    .slice(0, 8)
    .join("\n");
}

export async function parseResumeFromText(text: string): Promise<ParsedResumeProfile> {
  const normalized = normalizeText(text);
  const lines = getLines(normalized);

  return {
    name: extractName(lines),
    email: normalized.match(emailPattern)?.[0],
    phone: extractPhone(normalized),
    address: extractAddress(lines),
    skills: extractSkills(lines, normalized),
    projects: extractProjects(lines),
    experience: extractExperience(lines),
    college: extractEducationLine(lines, "college"),
    school: extractEducationLine(lines, "school"),
    linkedinUrl: lines.find((line) => /linkedin\.com/i.test(line)),
    portfolioUrl: lines.find((line) => /github\.com|portfolio|vercel\.app|netlify\.app/i.test(line)),
  };
}
