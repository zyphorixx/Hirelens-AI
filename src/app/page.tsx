"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Candidate = {
  id: string;
  rank: number;
  score: number | null;
  name: string | null;
  email: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: string | null;
  educationMatch: string | null;
  keywordMatch: string | null;
  screeningStatus: string;
  resume: { fileName: string; fileType: string };
};

export default function Dashboard() {
  const [jobId, setJobId] = useState<string | null>(null);

  // Job Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Candidates State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score" | "name" | "createdAt">("score");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const fetchCandidates = useCallback(async (activeJobId: string) => {
    setIsLoadingCandidates(true);
    try {
      const params = new URLSearchParams({
        jobId: activeJobId,
        sort,
        order,
        page: "1",
        limit: "50"
      });
      if (search) params.append("search", search);

      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [search, sort, order]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingJob(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (res.ok && data.job) {
        setJobId(data.job.id);
        fetchCandidates(data.job.id);
      } else {
        alert(data.error || "Failed to create job");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating job");
    } finally {
      setIsCreatingJob(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!jobId || acceptedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("jobId", jobId);
    acceptedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
      } else {
        // Trigger parse for all uploaded resumes
        if (data.uploaded && data.uploaded.length > 0) {
          await Promise.all(
            data.uploaded.map((u: { id: string }) =>
              fetch(`/api/resumes/${u.id}/parse`, { method: "POST" })
                .catch(e => console.error("Parse failed", e))
            )
          );
        }
        // Refresh candidates table to show parsed resumes as PENDING
        fetchCandidates(jobId);
      }
    } catch (err) {
      console.error(err);
      setUploadError("Network error during upload");
    } finally {
      setIsUploading(false);
    }
  }, [jobId, fetchCandidates]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"]
    }
  });

  const handleAnalyze = async () => {
    if (!jobId) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || d.message || "Analysis failed");
      }
      fetchCandidates(jobId);
    } catch (err) {
      console.error(err);
      alert("Failed to trigger analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-refresh when search or sort changes (debounced by React effect basics)
  useEffect(() => {
    if (jobId) {
      const timer = setTimeout(() => fetchCandidates(jobId), 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, search, sort, order]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="flex justify-between items-center border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">HireLens AI</h1>
            <p className="text-gray-500 mt-1">Smart Resume Screening Dashboard</p>
          </div>
        </header>

        {!jobId ? (
          /* STEP 1: JOB CREATION */
          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-6">Step 1: Define Job Requirements</h2>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                <textarea
                  required
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Paste the full job description here..."
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingJob}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isCreatingJob ? "Creating..." : "Save Job & Continue"}
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: DASHBOARD (UPLOAD + TABLE) */
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* UPLOAD PANEL */}
              <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border space-y-4">
                <h2 className="text-lg font-semibold">Upload Resumes</h2>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                    }`}
                >
                  <input {...getInputProps()} />
                  <p className="text-sm text-gray-600">
                    Drag & drop PDF/DOCX files here, or click to browse
                  </p>
                </div>
                {isUploading && <p className="text-sm text-blue-600 animate-pulse">Uploading and Parsing...</p>}
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

                <hr className="my-6" />

                <h2 className="text-lg font-semibold">Screen Candidates</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Run Gemini 2.5 Flash on all pending uploaded resumes to generate detailed scores, matches, and summaries.
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isUploading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Resumes"}
                </button>
              </div>

              {/* CANDIDATES TABLE */}
              <div className="md:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <h2 className="text-lg font-semibold flex items-center">
                      Candidates
                      <span className="ml-3 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs">
                        {candidates.length}
                      </span>
                    </h2>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search names..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-1.5 border rounded-md text-sm outline-none w-full sm:w-auto"
                      />
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as "score" | "name" | "createdAt")}
                        className="px-3 py-1.5 border rounded-md text-sm bg-white outline-none"
                      >
                        <option value="score">Sort by Score</option>
                        <option value="name">Sort by Name</option>
                      </select>
                      <button
                        onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
                        className="px-3 py-1.5 border rounded-md text-sm bg-white hover:bg-gray-50"
                      >
                        {order.toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {isLoadingCandidates && candidates.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Loading candidates...</div>
                  ) : candidates.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No candidates found. Upload resumes to get started.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b text-sm text-gray-600 uppercase tracking-wide">
                          <th className="p-4 font-medium">Rank</th>
                          <th className="p-4 font-medium">Candidate</th>
                          <th className="p-4 font-medium">Score</th>
                          <th className="p-4 font-medium">Skills Map</th>
                          <th className="p-4 font-medium">Matches</th>
                          <th className="p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {candidates.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-center">
                              {c.score !== null ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-700">
                                  #{c.rank}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-gray-900">{c.name || "Unknown"}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[120px]" title={c.resume.fileName}>
                                {c.resume.fileName}
                              </div>
                            </td>
                            <td className="p-4">
                              {c.score !== null ? (
                                <div className={`font-bold text-lg ${c.score >= 80 ? 'text-green-600' : c.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {c.score}/100
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">N/A</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {c.matchedSkills.slice(0, 3).map((s, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[10px] whitespace-nowrap">
                                    ✓ {s}
                                  </span>
                                ))}
                                {c.missingSkills.slice(0, 2).map((s, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] whitespace-nowrap">
                                    ✗ {s}
                                  </span>
                                ))}
                                {(c.matchedSkills.length > 3 || c.missingSkills.length > 2) && (
                                  <span className="text-xs text-gray-400">...</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-xs space-y-1">
                              {c.experienceMatch && <div><span className="text-gray-500">Exp:</span> {c.experienceMatch}</div>}
                              {c.educationMatch && <div><span className="text-gray-500">Edu:</span> {c.educationMatch}</div>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${c.screeningStatus === "SCREENED" ? "bg-green-100 text-green-700" :
                                c.screeningStatus === "FAILED" ? "bg-red-100 text-red-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                {c.screeningStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
