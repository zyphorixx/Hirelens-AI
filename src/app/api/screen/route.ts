import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ScreenJobSchema } from "@/lib/validations";
import { scoreResumeViaGemini } from "@/lib/gemini";

// POST /api/screen
// Accepts a jobId, queries all un-screened (or PARSED) resumes, and runs exactly 1 Gemini prompt for each.
// Rate limiting handling should ideally exist, but this runs sequentially per job for now.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = ScreenJobSchema.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { jobId } = parsed.data;

        // ── 1. Fetch Job and Job Description ──────────────────────────────────────
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { id: true, title: true, description: true },
        });

        if (!job) {
            return Response.json({ error: "Job not found" }, { status: 404 });
        }

        // ── 2. Fetch all candidates for this job that need screening ──────────────
        // Includes those with PENDING status that have successfully been PARSED.
        // If parseStatus is FAILED, we skip them.
        const candidates = await prisma.candidate.findMany({
            where: {
                jobId,
                screeningStatus: { not: "SCREENED" },
                resume: { parseStatus: "PARSED" }, // Must wait for Parse Phase
            },
            include: { resume: true },
        });

        if (candidates.length === 0) {
            return Response.json({
                message: "No eligible candidates found. Resumes must be parsed successfully first.",
                count: 0,
            });
        }

        // ── 3. Score each resume sequentially (or parallel with limits) ───────────
        const results = [];
        const errors = [];

        // NOTE: In production, consider using a queue (e.g., Inngest or bullmq) 
        // to handle rate limits and async jobs. Here we run sequentially.
        for (const candidate of candidates) {
            if (!candidate.resume.rawText) {
                errors.push({ id: candidate.id, error: "Missing resume text" });
                continue;
            }

            try {
                const geminiResult = await scoreResumeViaGemini(
                    candidate.resume.rawText,
                    job.description,
                );

                // Update Candidate with Gemini details
                const updated = await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: {
                        score: geminiResult.score,
                        matchedSkills: geminiResult.matchingSkills,
                        missingSkills: geminiResult.missingSkills,
                        experienceMatch: geminiResult.experienceMatch,
                        educationMatch: geminiResult.educationMatch,
                        keywordMatch: geminiResult.keywordMatch,
                        summary: geminiResult.summary,
                        screeningStatus: "SCREENED",
                    },
                });

                results.push(updated);
            } catch (geminiError) {
                console.error(`[Screening] Failed to score candidate ${candidate.id}:`, geminiError);

                await prisma.candidate.update({
                    where: { id: candidate.id },
                    data: { screeningStatus: "FAILED" },
                });

                errors.push({
                    id: candidate.id,
                    error: geminiError instanceof Error ? geminiError.message : "Unknown Gemini error"
                });
            }
        }

        return Response.json({
            success: true,
            jobId,
            screenedCount: results.length,
            failedCount: errors.length,
            errors,
        });
    } catch (err) {
        console.error("[POST /api/screen]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
