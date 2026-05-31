# HireLens AI — TASKS.md

## Phase 1 — Foundation ✅
- [x] Install all dependencies (Prisma v7, adapter-pg, pdf-parse, mammoth, zod, react-dropzone)
- [x] `.env.local` with DATABASE_URL + GEMINI_API_KEY
- [x] `prisma/schema.prisma` — jobs, resumes, candidates tables + indexes
- [x] `prisma.config.ts` — Prisma v7 config (datasource URL moved here)
- [x] `prisma migrate dev --name init` — applied to Neon PostgreSQL ✅
- [x] `src/lib/prisma.ts` — singleton with PrismaPg driver adapter
- [x] `uploads/` directory for local file storage

---

## Phase 2 — Backend API 🔄
- [x] `src/lib/extract-text.ts` — PDF (pdf-parse) + DOCX/DOC (mammoth) extraction
- [x] `src/lib/validations.ts` — Zod schemas for all API inputs
- [x] `src/types/index.ts` — shared TypeScript interfaces
- [x] `POST /api/jobs` — create job with title + description
- [x] `GET /api/candidates` — ranked list + search/sort params
- [ ] `GET /api/candidates/[id]` — candidate detailngle job
- [x] `POST /api/resumes` — multipart upload, validate, extract text, store to /uploads + DB
- [x] `GET /api/resumes` — list resumes for a job (with candidate status)

---

## Phase 3 — Resume Parsing ✅
- [x] Prisma migration (`ParseStatus`, `parsedName`, etc.)
- [x] `src/lib/parse-resume.ts` — local heuristic parser (regex/rules)
- [x] `POST /api/resumes/[id]/parse` — parsing API endpoint
- [x] Type checking and validation

---

## Phase 4 — Screening API ⬜
- [ ] `globals.css` design system (Tailwind v4 tokens, typography, colors)
- [ ] Primitive UI: Button, Badge, Card, Progress, Spinner, Input, Select
- [ ] `JobForm.tsx` — title + JD textarea/upload  
- [ ] `ResumeDropzone.tsx` — multi-file drag-and-drop
- [ ] `CandidateTable.tsx` — sortable ranked table
- [ ] `CandidateDetail.tsx` — skill breakdown panel
- [ ] `ExportButton.tsx`

---

## Phase 5 — UI Components & Dashboard ✅
- [x] Primitive UI (Tailwind integrated in Dashboard)
- [x] `JobForm` — title + JD textarea/upload  
- [x] `ResumeDropzone` — multi-file drag-and-drop
- [x] `CandidateTable` — sortable ranked table with matching skills
- [x] Root layout and single-page Dashboard integration
- [ ] Root layout with sidebar navigation
- [ ] `/jobs` page — job listing
- [ ] `/jobs/new` page — create job
- [ ] `/jobs/[id]` page — upload resumes + trigger screening
- [ ] `/jobs/[id]/candidates` page — ranked candidates view
- [ ] Loading states + skeleton screens
- [ ] Error boundaries + toasts
- [ ] End-to-end verification test
