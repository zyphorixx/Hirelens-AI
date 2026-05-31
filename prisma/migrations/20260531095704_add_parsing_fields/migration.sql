/*
  Warnings:

  - Added the required column `updated_at` to the `resumes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PARSED', 'FAILED');

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "parse_error" TEXT,
ADD COLUMN     "parse_status" "ParseStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "parsed_education" JSONB,
ADD COLUMN     "parsed_email" TEXT,
ADD COLUMN     "parsed_experience" JSONB,
ADD COLUMN     "parsed_name" TEXT,
ADD COLUMN     "parsed_phone" TEXT,
ADD COLUMN     "parsed_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "resumes_job_id_parse_status_idx" ON "resumes"("job_id", "parse_status");
