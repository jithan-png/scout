"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Trash2, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import { uploadPermitFile, getPermitBatches, deletePermitBatch } from "@/lib/permits";
import type { PermitBatch, UploadResult } from "@/lib/permits";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type UploadState =
  | { status: "idle" }
  | { status: "preview"; file: File; rows: string[][] }
  | { status: "uploading"; file: File; progress: number }
  | { status: "success"; result: UploadResult }
  | { status: "error"; message: string };

// Parse first 6 rows of a CSV for preview (client-side only)
async function parseCsvPreview(file: File): Promise<string[][]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const lines = text.split("\n").slice(0, 6).map((line) =>
        line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      );
      resolve(lines);
    };
    reader.readAsText(file);
  });
}

export default function AdminPermitsPage() {
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [batches, setBatches] = useState<PermitBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBatches = useCallback(async () => {
    try {
      const data = await getPermitBatches();
      setBatches(data);
    } catch {
      // silently fail — backend may not be running locally
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      setUploadState({ status: "error", message: "Only .xlsx, .xls, and .csv files are supported." });
      return;
    }

    if (ext === "csv") {
      const rows = await parseCsvPreview(file);
      setUploadState({ status: "preview", file, rows });
    } else {
      // XLSX: skip preview, go straight to upload
      doUpload(file);
    }
  };

  const doUpload = async (file: File) => {
    setUploadState({ status: "uploading", file, progress: 0 });
    try {
      // Fake progress tick while request is in flight
      let tick = 0;
      const interval = setInterval(() => {
        tick = Math.min(tick + 8, 85);
        setUploadState((s) => s.status === "uploading" ? { ...s, progress: tick } : s);
      }, 300);

      const result = await uploadPermitFile(file);
      clearInterval(interval);
      setUploadState({ status: "success", result });
      loadBatches();
    } catch (err) {
      setUploadState({ status: "error", message: (err as Error).message });
    }
  };

  const handleDelete = async (batchId: string) => {
    if (!confirm("Delete this batch? All permits in it will be removed.")) return;
    setDeletingId(batchId);
    try {
      await deletePermitBatch(batchId);
      setBatches((prev) => prev.filter((b) => b.id !== batchId));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "#09090B", color: "#F4F4F5", fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <header
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 14px rgba(0,200,117,0.3)" }}
        >
          <FileSpreadsheet size={16} strokeWidth={2} style={{ color: "#fff" }} />
        </div>
        <div>
          <p className="text-[16px] font-bold" style={{ letterSpacing: "-0.02em" }}>Permit Data Admin</p>
          <p className="text-[12px]" style={{ color: "#52525B" }}>Upload and manage permit Excel files · Admin only</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">

        {/* Upload zone */}
        <section className="mb-10">
          <p className="text-[13px] font-semibold mb-3" style={{ color: "#A1A1AA", letterSpacing: "-0.01em" }}>Upload permits</p>

          {uploadState.status === "idle" || uploadState.status === "error" ? (
            <>
              <div
                className="rounded-2xl flex flex-col items-center justify-center py-12 px-6 text-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${isDragOver ? "#00C875" : "rgba(255,255,255,0.12)"}`,
                  background: isDragOver ? "rgba(0,200,117,0.05)" : "rgba(255,255,255,0.02)",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(0,200,117,0.10)" }}
                >
                  <Upload size={22} strokeWidth={1.8} style={{ color: "#00C875" }} />
                </div>
                <p className="text-[15px] font-semibold mb-1" style={{ color: "#E4E4E7" }}>
                  Drop your file here
                </p>
                <p className="text-[13px]" style={{ color: "#52525B" }}>
                  or click to browse · .xlsx, .xls, .csv
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {uploadState.status === "error" && (
                <div
                  className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <AlertCircle size={14} style={{ color: "#EF4444", flexShrink: 0 }} />
                  <p className="text-[13px]" style={{ color: "#FCA5A5" }}>{uploadState.message}</p>
                  <button onClick={() => setUploadState({ status: "idle" })} className="ml-auto">
                    <X size={12} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              )}
            </>
          ) : uploadState.status === "preview" ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(0,200,117,0.06)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#E4E4E7" }}>{uploadState.file.name}</p>
                  <p className="text-[11px]" style={{ color: "#52525B" }}>CSV preview — first 5 rows</p>
                </div>
                <button onClick={() => setUploadState({ status: "idle" })} className="pressable">
                  <X size={14} style={{ color: "#52525B" }} />
                </button>
              </div>
              {/* Table preview */}
              <div className="overflow-x-auto" style={{ background: "#141418" }}>
                <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {uploadState.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {row.slice(0, 6).map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-4 py-2 text-[12px] max-w-[120px] truncate"
                            style={{
                              color: ri === 0 ? "#A1A1AA" : "#E4E4E7",
                              fontWeight: ri === 0 ? 600 : 400,
                              borderRight: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 p-3" style={{ background: "#141418" }}>
                <button
                  onClick={() => doUpload(uploadState.file)}
                  className="pressable flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff" }}
                >
                  Upload file
                </button>
                <button
                  onClick={() => setUploadState({ status: "idle" })}
                  className="pressable px-4 py-2.5 rounded-xl text-[13px]"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#A1A1AA" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : uploadState.status === "uploading" ? (
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <p className="text-[14px] font-semibold" style={{ color: "#E4E4E7" }}>
                Uploading {uploadState.file.name}…
              </p>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%`, background: "linear-gradient(90deg, #00C875, #00A860)" }}
                />
              </div>
              <p className="text-[12px]" style={{ color: "#52525B" }}>Parsing and geocoding permits…</p>
            </div>
          ) : (
            /* success */
            <div
              className="rounded-2xl p-6 flex flex-col gap-3"
              style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.2)" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle size={18} style={{ color: "#00C875" }} />
                <p className="text-[15px] font-semibold" style={{ color: "#E4E4E7" }}>Upload complete</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-0.5" style={{ color: "#3F3F46" }}>Imported</p>
                  <p className="text-[20px] font-bold" style={{ color: "#00C875" }}>{uploadState.result.inserted}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-0.5" style={{ color: "#3F3F46" }}>Total rows</p>
                  <p className="text-[20px] font-bold" style={{ color: "#E4E4E7" }}>{uploadState.result.total_rows}</p>
                </div>
              </div>
              {uploadState.result.warnings?.length ? (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "#F59E0B" }}>Warnings</p>
                  {uploadState.result.warnings.map((w, i) => (
                    <p key={i} className="text-[12px]" style={{ color: "#FDE68A" }}>{w}</p>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => setUploadState({ status: "idle" })}
                className="pressable self-start px-4 py-2 rounded-xl text-[13px]"
                style={{ background: "rgba(255,255,255,0.08)", color: "#A1A1AA" }}
              >
                Upload another
              </button>
            </div>
          )}
        </section>

        {/* Batch history */}
        <section>
          <p className="text-[13px] font-semibold mb-3" style={{ color: "#A1A1AA", letterSpacing: "-0.01em" }}>
            Upload history
          </p>

          {loadingBatches ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl"
                  style={{
                    background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2.2s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <div
              className="rounded-2xl py-10 flex flex-col items-center gap-2"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <FileSpreadsheet size={24} strokeWidth={1.5} style={{ color: "#3F3F46" }} />
              <p className="text-[13px]" style={{ color: "#52525B" }}>No uploads yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "#E4E4E7" }}>
                      {batch.filename}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
                      {batch.inserted} permits · {fmtDate(batch.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(batch.id)}
                    disabled={deletingId === batch.id}
                    className="pressable ml-3 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                  >
                    {deletingId === batch.id ? (
                      <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(239,68,68,0.4)", borderTopColor: "transparent" }} />
                    ) : (
                      <Trash2 size={13} strokeWidth={2} style={{ color: "#EF4444" }} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
