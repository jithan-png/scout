import type { PermitEntry } from "./types";

// All permit calls go through Next.js API proxy routes (same-origin, works on Vercel)
const BASE = "/api/permits";

export interface PermitBatch {
  id: string;
  filename: string;
  created_at: string;
  total_rows: number;
  inserted: number;
  cities?: string[];
}

export interface UploadResult {
  batch_id: string;
  inserted: number;
  total_rows: number;
  warnings?: string[];
}

export async function uploadPermitFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

export async function getPermitBatches(): Promise<PermitBatch[]> {
  const res = await fetch(`${BASE}/batches`);
  if (!res.ok) throw new Error(`Failed to load batches (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.batches ?? []);
}

export async function deletePermitBatch(batchId: string): Promise<void> {
  const res = await fetch(`${BASE}/batch/${batchId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

export async function searchPermits(query: string, limit = 50): Promise<PermitEntry[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : (data.permits ?? data.results ?? []);
}
