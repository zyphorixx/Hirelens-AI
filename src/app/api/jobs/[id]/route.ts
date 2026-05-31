import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Inline param type until `next typegen` runs and exposes RouteContext globally
type JobRouteContext = { params: Promise<{ id: string }> };

// GET /api/jobs/[id] — get a single job with its resumes + candidates count
export async function GET(_req: NextRequest, ctx: JobRouteContext) {
    try {
        const { id } = await ctx.params;

        const job = await prisma.job.findUnique({
            where: { id },
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

        if (!job) {
            return Response.json({ error: "Job not found" }, { status: 404 });
        }

        return Response.json({ job });
    } catch (err) {
        console.error("[GET /api/jobs/[id]]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/jobs/[id] — remove a job and cascade-delete all resumes + candidates
export async function DELETE(_req: NextRequest, ctx: JobRouteContext) {
    try {
        const { id } = await ctx.params;

        const existing = await prisma.job.findUnique({ where: { id } });
        if (!existing) {
            return Response.json({ error: "Job not found" }, { status: 404 });
        }

        await prisma.job.delete({ where: { id } });
        return Response.json({ success: true });
    } catch (err) {
        console.error("[DELETE /api/jobs/[id]]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
