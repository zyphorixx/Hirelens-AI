import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
    extractTextFromBuffer,
    getFileType,
    sanitizeFileName,
    MAX_FILE_SIZE_BYTES,
} from "@/lib/extract-text";
import { UploadResumesSchema, GetResumesSchema } from "@/lib/validations";
import type { UploadResult, UploadError } from "@/types";

// ---------------------------------------------------------------------------
// POST /api/resumes
// Accepts multipart/form-data with:
//   - jobId: string (UUID)
//   - files: File[] (PDF, DOC, DOCX — max 10 MB each, max 20 files)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
    try {
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return Response.json(
                { error: "Invalid multipart form data" },
                { status: 400 },
            );
        }

        // ── Validate jobId ────────────────────────────────────────────────────
        const jobId = formData.get("jobId");
        const parsedParams = UploadResumesSchema.safeParse({ jobId });
        if (!parsedParams.success) {
            return Response.json(
                { error: "Validation failed", details: parsedParams.error.flatten() },
                { status: 400 },
            );
        }

        // ── Verify the job exists ─────────────────────────────────────────────
        const job = await prisma.job.findUnique({
            where: { id: parsedParams.data.jobId },
        });
        if (!job) {
            return Response.json({ error: "Job not found" }, { status: 404 });
        }

        // ── Collect files from FormData ───────────────────────────────────────
        const rawFiles = formData.getAll("files");
        const files = rawFiles.filter((f): f is File => f instanceof File);

        if (files.length === 0) {
            return Response.json(
                { error: "No files provided. Add files under the 'files' field." },
                { status: 400 },
            );
        }

        if (files.length > 20) {
            return Response.json(
                { error: "Too many files. Maximum 20 resumes per upload." },
                { status: 400 },
            );
        }

        // ── Ensure upload directory exists ────────────────────────────────────
        const uploadDir = path.resolve(
            process.env.UPLOAD_DIR ?? "./uploads",
        );
        await fs.mkdir(uploadDir, { recursive: true });

        const uploaded: UploadResult[] = [];
        const errors: UploadError[] = [];

        // ── Process each file ─────────────────────────────────────────────────
        for (const file of files) {
            // 1. File size check
            if (file.size > MAX_FILE_SIZE_BYTES) {
                errors.push({
                    file: file.name,
                    error: `File exceeds the 10 MB limit (size: ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
                });
                continue;
            }

            // 2. File type check
            const fileType = getFileType(file.name);
            if (!fileType) {
                errors.push({
                    file: file.name,
                    error: "Unsupported format. Only PDF, DOC, and DOCX are accepted.",
                });
                continue;
            }

            // 3. Read to buffer
            let buffer: Buffer;
            try {
                const arrayBuffer = await file.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } catch {
                errors.push({ file: file.name, error: "Failed to read file content." });
                continue;
            }

            // 4. Extract text
            let rawText: string;
            try {
                rawText = await extractTextFromBuffer(buffer, fileType);
            } catch (extractErr) {
                console.error(`[extract-text] ${file.name}:`, extractErr);
                errors.push({
                    file: file.name,
                    error: "Could not extract text. The file may be corrupted or encrypted.",
                });
                continue;
            }

            if (!rawText.trim()) {
                errors.push({
                    file: file.name,
                    error: "No readable text found. The file may be scanned/image-based.",
                });
                continue;
            }

            // 5. Save file to disk
            const safeFileName = sanitizeFileName(file.name);
            const uniqueFileName = `${crypto.randomUUID()}_${safeFileName}`;
            const filePath = path.join(uploadDir, uniqueFileName);

            try {
                await fs.writeFile(filePath, buffer);
            } catch (fsErr) {
                console.error(`[upload] Could not write file ${file.name}:`, fsErr);
                errors.push({ file: file.name, error: "Failed to save file to disk." });
                continue;
            }

            // 6. Persist to database (resume + pending candidate — single transaction)
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const result = await prisma.$transaction(async (tx: any) => {
                    const resume = await tx.resume.create({
                        data: {
                            jobId: parsedParams.data.jobId,
                            fileName: file.name,
                            fileType,
                            filePath,
                            fileSizeBytes: file.size,
                            rawText,
                        },
                    });

                    await tx.candidate.create({
                        data: {
                            resumeId: resume.id,
                            jobId: parsedParams.data.jobId,
                            screeningStatus: "PENDING",
                        },
                    });

                    return resume;
                });

                uploaded.push({
                    id: result.id,
                    fileName: result.fileName,
                    fileType: result.fileType,
                    fileSizeBytes: result.fileSizeBytes,
                    createdAt: result.createdAt.toISOString(),
                });
            } catch (dbErr) {
                // Roll back the file write if DB insert fails
                await fs.unlink(filePath).catch(() => undefined);
                console.error(`[db] Failed to store resume ${file.name}:`, dbErr);
                errors.push({ file: file.name, error: "Database error while saving resume." });
            }
        }

        return Response.json(
            {
                success: true,
                uploaded,
                errors,
                total: files.length,
                successCount: uploaded.length,
                errorCount: errors.length,
            },
            // 207 Multi-Status: partial success is still a valid response
            { status: uploaded.length > 0 ? 207 : 400 },
        );
    } catch (err) {
        console.error("[POST /api/resumes]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ---------------------------------------------------------------------------
// GET /api/resumes?jobId=<uuid>
// Returns all resumes for a job with their candidate screening status.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const parsed = GetResumesSchema.safeParse({
            jobId: searchParams.get("jobId"),
        });

        if (!parsed.success) {
            return Response.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        // Verify the job exists
        const job = await prisma.job.findUnique({
            where: { id: parsed.data.jobId },
            select: { id: true, title: true },
        });
        if (!job) {
            return Response.json({ error: "Job not found" }, { status: 404 });
        }

        const resumes = await prisma.resume.findMany({
            where: { jobId: parsed.data.jobId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSizeBytes: true,
                createdAt: true,
                candidate: {
                    select: {
                        id: true,
                        screeningStatus: true,
                        score: true,
                    },
                },
            },
        });

        return Response.json({
            job,
            resumes: resumes.map((r: { id: string, fileName: string, fileType: string, fileSizeBytes: number, createdAt: Date, candidate: unknown }) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
            })),
            total: resumes.length,
        });
    } catch (err) {
        console.error("[GET /api/resumes]", err);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
