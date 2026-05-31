import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { heuristicParseResume } from "@/lib/parse-resume";

type ParseRouteContext = { params: Promise<{ id: string }> };

// POST /api/resumes/[id]/parse
// Runs local heuristic parsing on the raw text and updates the Resume record.
export async function POST(_req: NextRequest, ctx: ParseRouteContext) {
    try {
        const { id } = await ctx.params;

        const resume = await prisma.resume.findUnique({
            where: { id },
            select: { id: true, rawText: true },
        });

        if (!resume) {
            return Response.json({ error: "Resume not found" }, { status: 404 });
        }

        if (!resume.rawText || !resume.rawText.trim()) {
            await prisma.resume.update({
                where: { id },
                data: {
                    parseStatus: "FAILED",
                    parseError: "No extracted text available for parsing.",
                },
            });
            return Response.json({ error: "No text available to parse" }, { status: 400 });
        }

        // Run the parsing logic
        try {
            const parsedData = heuristicParseResume(resume.rawText);

            // Prisma requires JSON to match InputJsonValue, but a raw object array works fine.
            const updatedResume = await prisma.resume.update({
                where: { id },
                data: {
                    parseStatus: "PARSED",
                    parseError: null,
                    parsedName: parsedData.name,
                    parsedEmail: parsedData.email,
                    parsedPhone: parsedData.phone,
                    parsedSkills: parsedData.skills,
                    parsedEducation: parsedData.education as any,
                    parsedExperience: parsedData.experience as any,
                },
            });

            // Optionally preload the candidate table with discovered name/email
            await prisma.candidate.update({
                where: { resumeId: id },
                data: {
                    name: parsedData.name ?? undefined,
                    email: parsedData.email ?? undefined,
                },
            });

            return Response.json({
                success: true,
                resume: {
                    id: updatedResume.id,
                    parseStatus: updatedResume.parseStatus,
                    parsedName: updatedResume.parsedName,
                    parsedEmail: updatedResume.parsedEmail,
                    parsedPhone: updatedResume.parsedPhone,
                    parsedSkills: updatedResume.parsedSkills,
                    parsedEducation: updatedResume.parsedEducation,
                    parsedExperience: updatedResume.parsedExperience,
                },
            });
        } catch (parseErr) {
            console.error(`[POST /api/resumes/${id}/parse] (Logic Error)`, parseErr);
            await prisma.resume.update({
                where: { id },
                data: {
                    parseStatus: "FAILED",
                    parseError: parseErr instanceof Error ? parseErr.message : "Unknown error during parse",
                },
            });
            return Response.json({ error: "Parsing logic failed" }, { status: 500 });
        }
    } catch (err) {
        console.error("[POST /api/resumes/[id]/parse]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
