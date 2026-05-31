import { z } from "zod";

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export const CreateJobSchema = z.object({
    title: z
        .string()
        .min(1, "Title cannot be empty")
        .max(200, "Title must be 200 characters or fewer"),
    description: z
        .string()
        .min(10, "Description must be at least 10 characters")
        .max(50_000, "Description must be 50,000 characters or fewer"),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------

export const UploadResumesSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID"),
});

export type UploadResumesInput = z.infer<typeof UploadResumesSchema>;

export const GetResumesSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID"),
});

export const ParseResumeSchema = z.object({
    resumeId: z.string().uuid("resumeId must be a valid UUID"),
});


// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

export const ScreenJobSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID"),
});

export type ScreenJobInput = z.infer<typeof ScreenJobSchema>;

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------

export const GetCandidatesSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID"),
    search: z.string().max(100).optional(),
    sort: z.enum(["score", "name", "createdAt"]).optional().default("score"),
    order: z.enum(["asc", "desc"]).optional().default("desc"),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type GetCandidatesInput = z.infer<typeof GetCandidatesSchema>;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ExportSchema = z.object({
    jobId: z.string().uuid("jobId must be a valid UUID"),
});
