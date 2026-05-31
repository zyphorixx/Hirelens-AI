import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExportSchema } from "@/lib/validations";
import { generateCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = ExportSchema.safeParse({ jobId: searchParams.jobId });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed - jobId is required and must be a UUID" },
                { status: 400 }
            );
        }

        const { jobId } = parsed.data;

        // Fetch ranked candidates based on exactly the same sort logic as candidate listing config:
        // "score" desc, with fallback to createdAt desc
        const candidates = await prisma.candidate.findMany({
            where: { jobId },
            orderBy: [
                { score: "desc" },
                { createdAt: "desc" }
            ],
            select: {
                id: true,
                name: true,
                score: true,
                matchedSkills: true,
                missingSkills: true,
            }
        });

        if (candidates.length === 0) {
            return new NextResponse("No candidates to export.", { status: 404 });
        }

        // Map to the required CSV export format
        const exportData = candidates.map((c, index) => ({
            Rank: index + 1,
            Name: c.name || "Unknown",
            Score: c.score !== null ? c.score : "N/A",
            "Matching Skills": c.matchedSkills,
            "Missing Skills": c.missingSkills,
        }));

        // Convert to CSV
        const csvContent = generateCsv(exportData, [
            { key: "Rank", label: "Rank" },
            { key: "Name", label: "Candidate Name" },
            { key: "Score", label: "Score" },
            { key: "Matching Skills", label: "Matching Skills" },
            { key: "Missing Skills", label: "Missing Skills" },
        ]);

        // Return the file as a downloadable attachment
        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="candidates_export_${jobId.split("-")[0]}.csv"`,
            },
            status: 200,
        });
    } catch (err) {
        console.error("[GET /api/export]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
