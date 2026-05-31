import type { ScreeningStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Shared API response envelope
// ---------------------------------------------------------------------------

export interface ApiError {
    error: string;
    details?: unknown;
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export interface JobSummary {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        resumes: number;
        candidates: number;
    };
}

export interface JobDetail extends JobSummary {
    description: string;
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

export interface ResumeSummary {
    id: string;
    jobId: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    createdAt: string;
    candidate?: {
        id: string;
        screeningStatus: ScreeningStatus;
        score: number | null;
    } | null;
}

export interface UploadResult {
    id: string;
    fileName: string;
    fileType: string;
    fileSizeBytes: number;
    createdAt: string;
}

export interface UploadError {
    file: string;
    error: string;
}

export interface UploadResponse {
    success: boolean;
    uploaded: UploadResult[];
    errors: UploadError[];
    total: number;
    successCount: number;
    errorCount: number;
}

// ---------------------------------------------------------------------------
// Candidate
// ---------------------------------------------------------------------------

export interface CandidateSummary {
    id: string;
    resumeId: string;
    jobId: string;
    name: string | null;
    email: string | null;
    score: number | null;
    matchedSkills: string[];
    missingSkills: string[];
    screeningStatus: ScreeningStatus;
    createdAt: string;
    updatedAt: string;
    resume: {
        fileName: string;
        fileType: string;
    };
}

export interface CandidateDetail extends CandidateSummary {
    summary: string | null;
}

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

export interface GeminiScreeningResult {
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    candidateName: string;
    candidateEmail: string;
    summary: string;
}
