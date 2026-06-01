import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GetCandidatesSchema } from "@/lib/validations";

// GET /api/candidates
// Returns ranked candidates for a specific job, with search, sort, and pagination.
export async function GET(request: NextRequest) {
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const parsed = GetCandidatesSchema.safeParse(searchParams);

        if (!parsed.success) {
            return Response.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { jobId, search, sort, order, page, limit } = parsed.data;

        // ── Build Prisma Query ────────────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {
            jobId,
            ...(search
                ? {
                    name: {
                        contains: search,
                        mode: "insensitive", // Case-insensitive search on name
                    },
                }
                : {}),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderByClause: any = {
            [sort]: order, // dynamic: score, name, or createdAt + asc/desc
        };

        // Always fallback to createdAt desc to ensure deterministic ordering for equal scores/names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalOrderBy: any[] = [orderByClause];
        if (sort !== "createdAt") {
            finalOrderBy.push({ createdAt: "desc" });
        }

        // Run count and data fetch in parallel for efficiency
        const skip = (page - 1) * limit;
        const [totalCount, candidates] = await Promise.all([
            prisma.candidate.count({ where: whereClause }),
            prisma.candidate.findMany({
                where: whereClause,
                orderBy: finalOrderBy,
                skip,
                take: limit,
                include: {
                    resume: {
                        select: {
                            fileName: true,
                            fileType: true,
                        },
                    },
                },
            }),
        ]);

        // Calculate dynamic rank. If sorting purely by score desc across the whole set,
        // (skip + index + 1) is their true ranking. If sorted differently or searched,
        // it reflects their position in the current returned view.
        const rankedCandidates = candidates.map((candidate: any, index: number) => ({
            ...candidate,
            rank: skip + index + 1,
        }));

        return Response.json({
            candidates: rankedCandidates,
            meta: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (err) {
        console.error("[GET /api/candidates]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
