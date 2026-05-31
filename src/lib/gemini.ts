import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import type { GeminiScreeningResult } from "@/types";

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const screeningSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        score: {
            type: SchemaType.INTEGER,
            description: "Candidate score from 0 to 100 based on match with Job Description.",
        },
        matchingSkills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Skills present in the resume that match the Job Description.",
        },
        missingSkills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Critical skills missing from the resume based on the Job Description.",
        },
        experienceMatch: {
            type: SchemaType.STRING,
            description: "Evaluation of the candidate's experience against the job requirements (e.g., 'High', 'Medium', 'Low').",
        },
        educationMatch: {
            type: SchemaType.STRING,
            description: "Evaluation of the candidate's education against the job requirements (e.g., 'High', 'Medium', 'Low').",
        },
        keywordMatch: {
            type: SchemaType.STRING,
            description: "Evaluation of how well keyword density in the resume aligns with the JD (e.g., 'High', 'Medium', 'Low').",
        },
        summary: {
            type: SchemaType.STRING,
            description: "A 2 to 3 sentence concise summary justifying the candidate's score.",
        },
    },
    required: [
        "score",
        "matchingSkills",
        "missingSkills",
        "experienceMatch",
        "educationMatch",
        "keywordMatch",
        "summary",
    ],
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: screeningSchema,
        temperature: 0.2, // Low temperature for more deterministic scoring
    },
});

export async function scoreResumeViaGemini(
    resumeText: string,
    jobDescription: string,
): Promise<GeminiScreeningResult> {
    const prompt = `
You are an expert technical recruiter and resume screener.
Evaluate the following candidate's resume against the provided Job Description.

Job Description:
"""
${jobDescription}
"""

Candidate Resume:
"""
${resumeText}
"""

Instructions:
1. Assign an overall match score from 0 to 100 representing how well the candidate fits the role.
2. Extract the matching skills present in the resume.
3. Extract the critical missing skills required by the job description but omitted in the resume.
4. Evaluate the 'Experience Match', 'Education Match', and 'Keyword Match' (use concise terms like 'High', 'Medium', 'Low', and briefly explain if needed).
5. Provide a 2-3 sentence overview summary of the candidate's fit.
  `;

    try {
        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();
        const json = JSON.parse(textResponse) as GeminiScreeningResult;
        return json;
    } catch (error) {
        console.error("[Gemini] Error scoring resume:", error);
        throw error;
    }
}
