import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateJobSchema } from "@/lib/validations";

// POST /api/jobs — create a new job with a job description
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = CreateJobSchema.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const job = await prisma.job.create({
            data: {
                title: parsed.data.title,
                description: parsed.data.description,
            },
            select: {
                id: true,
                title: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { resumes: true, candidates: true },
                },
            },
        });

        return Response.json({ job }, { status: 201 });
    } catch (err) {
        console.error("[POST /api/jobs]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET /api/jobs — list all jobs, newest first
export async function GET() {
    try {
        const jobs = await prisma.job.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { resumes: true, candidates: true },
                },
            },
        });

        return Response.json({ jobs });
    } catch (err) {
        console.error("[GET /api/jobs]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
