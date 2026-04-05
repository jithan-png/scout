import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

// Column name aliases — mirrors the Python _COL_MAP exactly
const COL_MAP: Record<string, string> = {
  "permit issue date": "issued_date",
  "issued date": "issued_date",
  "issue date": "issued_date",
  "date": "issued_date",
  "country": "country",
  "state": "state",
  "region": "region",
  "county": "county",
  "city": "city",
  "address": "address",
  "street address": "address",
  "project class": "project_class",
  "class": "project_class",
  "project type": "project_type",
  "type": "project_type",
  "project description": "description",
  "description": "description",
  "project status": "status",
  "status": "status",
  "value": "value",
  "project value": "value",
  "permit value": "value",
  "builder company": "builder_company",
  "builder name": "builder_name",
  "builder phone": "builder_phone",
  "builder email": "builder_email",
  "applicant company": "applicant_company",
  "applicant name": "applicant_name",
  "applicant phone": "applicant_phone",
  "applicant email": "applicant_email",
  "owner company": "owner_company",
  "owner name": "owner_name",
  "owner phone": "owner_phone",
  "owner email": "owner_email",
  "additional info": "additional_info",
  "additionalinfo": "additional_info",
  "addtionalinfo": "additional_info",
  "additional information": "additional_info",
  "notes": "additional_info",
};

const KNOWN_FIELDS = new Set([
  "address", "city", "state", "country", "region", "county",
  "project_class", "project_type", "description", "status", "value", "issued_date",
  "builder_company", "builder_name", "builder_phone", "builder_email",
  "applicant_company", "applicant_name", "applicant_phone", "applicant_email",
  "owner_company", "owner_name", "owner_phone", "owner_email",
]);

function normalizeCol(name: string): string {
  const lower = name.toLowerCase().trim();
  return COL_MAP[lower] ?? lower.replace(/\s+/g, "_");
}

function parseValue(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).replace(/[$,]/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDate(raw: unknown): string | null {
  if (raw == null) return null;
  // XLSX may return a number (serial date) — convert it
  if (typeof raw === "number") {
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${date.y}-${m}-${d}`;
    }
  }
  const s = String(raw).trim();
  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
  ];
  for (const fmt of formats) {
    const m = s.match(fmt);
    if (m) {
      // Return ISO format
      if (fmt.source.startsWith("^(\\d{4})")) return s.slice(0, 10);
      return `${m[3]}-${m[1]}-${m[2]}`;
    }
  }
  return s || null;
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Database not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables." },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Only .xlsx, .xls, and .csv files are supported." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rows: unknown[][];
  try {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  } catch (err) {
    return NextResponse.json({ error: `Could not parse file: ${(err as Error).message}` }, { status: 422 });
  }

  if (!rows.length) {
    return NextResponse.json({ error: "File appears to be empty." }, { status: 422 });
  }

  // First row = headers
  const headers = (rows[0] as unknown[]).map((h) => h != null ? String(h).trim() : "");
  const fieldMap = headers.map(normalizeCol);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const batchId = `batch-${randomUUID().replace(/-/g, "").slice(0, 12)}::${safeName}`;
  const now = new Date().toISOString();
  const permits: Record<string, unknown>[] = [];

  for (let ri = 1; ri < rows.length; ri++) {
    const row = rows[ri] as unknown[];
    if (row.every((c) => c == null || c === "")) continue;

    const record: Record<string, unknown> = {
      id: randomUUID(),
      import_batch_id: batchId,
      created_at: now,
    };
    const extraParts: string[] = [];

    for (let ci = 0; ci < row.length; ci++) {
      const cell = row[ci];
      if (cell == null || cell === "") continue;
      const field = fieldMap[ci];
      if (!field) continue;

      if (KNOWN_FIELDS.has(field)) {
        if (field === "value") record[field] = parseValue(cell);
        else if (field === "issued_date") record[field] = parseDate(cell);
        else record[field] = String(cell).trim();
      } else if (field && field !== "additional_info") {
        extraParts.push(`${headers[ci]}: ${cell}`);
      }
    }

    if (extraParts.length) record["additional_info"] = extraParts.join("; ");
    if (!record["address"] && !record["city"]) continue;

    permits.push(record);
  }

  if (!permits.length) {
    return NextResponse.json({ error: "No valid permit rows found. Make sure the file has Address or City columns." }, { status: 422 });
  }

  // Insert in batches of 100
  let inserted = 0;
  const warnings: string[] = [];

  for (let i = 0; i < permits.length; i += 100) {
    const chunk = permits.slice(i, i + 100);
    const { data, error } = await supabase
      .from("permits")
      .insert(chunk)
      .select("id");

    if (error) {
      warnings.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`);
    } else {
      inserted += data?.length ?? 0;
    }
  }

  return NextResponse.json({
    batch_id: batchId,
    inserted,
    total_rows: permits.length,
    filename: file.name,
    warnings: warnings.length ? warnings : undefined,
  });
}
