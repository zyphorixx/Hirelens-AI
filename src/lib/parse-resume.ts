export interface ParsedResumeData {
    name: string | null;
    email: string | null;
    phone: string | null;
    skills: string[];
    education: {
        institution: string | null;
        degree: string | null;
        year: string | null;
    }[];
    experience: {
        company: string | null;
        title: string | null;
    }[];
}

/**
 * Heuristically parses a resume's raw text to extract basic metadata using regex.
 * This is a "best effort" local fallback before passing to Gemini.
 */
export function heuristicParseResume(rawText: string): ParsedResumeData {
    const data: ParsedResumeData = {
        name: null,
        email: null,
        phone: null,
        skills: [],
        education: [],
        experience: [],
    };

    if (!rawText) return data;

    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const textSpaceNorm = rawText.replace(/\s+/g, " ");

    // ── Extract Email ──────────────────────────────────────────────────────────
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = rawText.match(emailRegex);
    if (emailMatch) {
        data.email = emailMatch[0].toLowerCase();
    }

    // ── Extract Phone ──────────────────────────────────────────────────────────
    // Matches standard US formats, international formats, etc.
    const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/;
    const phoneMatch = rawText.match(phoneRegex);
    if (phoneMatch) {
        data.phone = phoneMatch[0].trim();
    }

    // ── Extract Name ───────────────────────────────────────────────────────────
    // Heuristic: First line of the resume that looks like a name.
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        // A name is usually 2-3 words, no numbers, not standard headers like "Resume"
        if (
            line.length > 2 &&
            line.length < 50 &&
            !line.match(/\d/) &&
            line.split(/\s+/).length >= 2 &&
            !["resume", "cv", "curriculum vitae", "profile"].includes(line.toLowerCase())
        ) {
            // If it resembles an email or phone, skip.
            if (!line.match(emailRegex) && !line.match(phoneRegex)) {
                data.name = line;
                break;
            }
        }
    }

    // ── Extract Skills (very basic heuristic) ──────────────────────────────────
    const commonSkills = [
        "javascript", "typescript", "react", "node.js", "next.js",
        "python", "java", "c++", "c#", "aws", "docker", "kubernetes",
        "sql", "postgresql", "mongodb", "html", "css", "git", "rest", "graphql"
    ];

    const textLower = rawText.toLowerCase();
    const extractedSkills = new Set<string>();

    for (const skill of commonSkills) {
        // Word boundary check for skills
        const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(textLower)) {
            extractedSkills.add(skill);
        }
    }
    data.skills = Array.from(extractedSkills);

    // ── Extract Education/Experience (Section detection) ───────────────────────
    let currentSection: "EDUCATION" | "EXPERIENCE" | "OTHER" = "OTHER";

    for (let i = 0; i < lines.length; i++) {
        const lineStr = lines[i].toLowerCase();

        // Detect section headers
        if (lineStr === "education" || lineStr.includes("academic background")) {
            currentSection = "EDUCATION";
            continue;
        } else if (
            lineStr === "experience" ||
            lineStr === "work experience" ||
            lineStr === "employment history" ||
            lineStr === "professional experience"
        ) {
            currentSection = "EXPERIENCE";
            continue;
        } else if (
            lineStr === "skills" ||
            lineStr === "projects" ||
            lineStr === "certifications" ||
            lineStr === "summary"
        ) {
            currentSection = "OTHER";
            continue;
        }

        const words = lineStr.split(/\s+/).length;

        if (currentSection === "EDUCATION") {
            // Very naive heuristic: If it has "Bachelor", "Master", "B.S.", "University", "College"
            if (
                lineStr.includes("university") ||
                lineStr.includes("college") ||
                lineStr.includes("institute") ||
                lineStr.match(/\b(b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|ph\.?d\.?)\b/i) ||
                lineStr.includes("bachelor") ||
                lineStr.includes("master") ||
                lineStr.includes("degree")
            ) {
                if (data.education.length < 5) { // Cap to avoid runaway logic
                    data.education.push({
                        institution: lines[i],
                        degree: null,
                        year: null
                    });
                }
            }
        }

        else if (currentSection === "EXPERIENCE") {
            // Very naive heuristic: Short lines might be company/title.
            // Often contain "Corp", "Inc", "LLC" or job titles like "Engineer", "Manager".
            if (
                words <= 8 &&
                (lineStr.includes("corp") || lineStr.includes("inc") || lineStr.includes("llc") ||
                    lineStr.includes("engineer") || lineStr.includes("developer") || lineStr.includes("manager") ||
                    lineStr.includes("director") || lineStr.includes("consultant"))
            ) {
                if (data.experience.length < 10) {
                    data.experience.push({
                        company: lines[i],
                        title: null
                    });
                }
            }
        }
    }

    return data;
}
