// ── POST /api/contacts/import/csv ─────────────────────────────────────────────
// Parses a CSV contact list and upserts into user_contacts + user_companies.
// Handles multiple CSV formats:
//   - LinkedIn connections export (First Name, Last Name, Email Address, Company, Position)
//   - Generic contact list (Name, Email, Phone, Company, Role/Title)
//   - HubSpot contact export (First Name, Last Name, Email, Phone Number, Company Name, Job Title)
//   - Outlook/Apple Contacts CSV
//
// Accepts multipart/form-data with a "file" field (CSV).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { normalizeCompany } from "@/lib/normalize";

// ── CSV parsing (no external library — keeps bundle lean) ────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  // Parse header row — strip BOM, quotes, trim
  const headers = parseCsvRow(lines[0]).map((h) =>
    h.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
      else inQuote = !inQuote;
    } else if (c === "," && !inQuote) {
      cells.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

// ── Column mapping — handles multiple CSV format variants ─────────────────────

function extractContact(row: Record<string, string>): {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
} {
  // Name: try combined "name" first, then "first name" + "last name"
  const name =
    row["name"] ||
    row["full name"] ||
    row["contact name"] ||
    ([row["first name"], row["last name"]].filter(Boolean).join(" ")) ||
    ([row["firstname"], row["lastname"]].filter(Boolean).join(" ")) ||
    null;

  // Email
  const email =
    row["email"] ||
    row["email address"] ||
    row["e-mail address"] ||
    row["email 1 - value"] ||
    null;

  // Phone
  const phone =
    row["phone"] ||
    row["phone number"] ||
    row["mobile"] ||
    row["phone 1 - value"] ||
    row["business phone"] ||
    null;

  // Company
  const company =
    row["company"] ||
    row["company name"] ||
    row["organization"] ||
    row["organization 1 - name"] ||
    row["account name"] ||
    null;

  // Role/Title
  const role =
    row["position"] ||
    row["title"] ||
    row["job title"] ||
    row["role"] ||
    row["organization 1 - title"] ||
    null;

  return {
    name: name?.trim() || null,
    email: email?.toLowerCase().trim() || null,
    phone: phone?.trim() || null,
    company: company?.trim() || null,
    role: role?.trim() || null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Accept multipart/form-data
  let csvText: string;
  let source = "csv";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sourceField = formData.get("source") as string | null;
    if (sourceField) source = sourceField;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

    csvText = await file.text();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  if (!rows.length) return NextResponse.json({ error: "Empty or unreadable CSV" }, { status: 400 });

  // ── Log sync job ──────────────────────────────────────────────────────────
  const { data: job } = await supabase
    .from("contact_sync_jobs")
    .insert({ user_id: userId, source, status: "running" })
    .select("id")
    .single();
  const jobId = job?.id;

  // ── Parse and batch upsert ────────────────────────────────────────────────
  const companyMap = new Map<string, { count: number; domain: string | null }>();
  const contactRows: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const row of rows) {
    const { name, email, phone, company, role } = extractContact(row);
    if (!name) { skipped++; continue; }
    if (!email && !phone) { skipped++; continue; } // need at least one contact method

    const companyNorm = company ? normalizeCompany(company) : null;
    const domain = email ? email.split("@")[1] ?? null : null;

    if (companyNorm) {
      const existing = companyMap.get(companyNorm) ?? { count: 0, domain: null };
      companyMap.set(companyNorm, { count: existing.count + 1, domain: existing.domain ?? domain });
    }

    contactRows.push({
      user_id: userId,
      source,
      name,
      email: email ?? null,
      phone: phone ?? null,
      company_name: company,
      company_normalized: companyNorm,
      role,
      created_at: new Date().toISOString(),
    });
  }

  if (!contactRows.length) {
    await supabase.from("contact_sync_jobs").update({
      status: "failed", error: "No valid contacts found in CSV (need Name + Email or Phone)", completed_at: new Date().toISOString(),
    }).eq("id", jobId);
    return NextResponse.json({
      error: `No valid contacts found. CSV needs at least Name and Email or Phone columns. Found ${rows.length} rows, skipped ${skipped}.`,
    }, { status: 422 });
  }

  // Batch upsert contacts (100 at a time)
  let synced = 0;
  for (let i = 0; i < contactRows.length; i += 100) {
    const chunk = contactRows.slice(i, i + 100);
    const { data, error } = await supabase
      .from("user_contacts")
      .upsert(chunk, { onConflict: "user_id,email", ignoreDuplicates: false })
      .select("id");
    if (!error && data) synced += data.length;
  }

  // Upsert normalized companies
  const companyRows = [...companyMap.entries()].map(([norm, { count, domain }]) => ({
    user_id: userId,
    name_normalized: norm,
    domain,
    contact_count: count,
    last_interaction_at: new Date().toISOString(),
  }));
  for (let i = 0; i < companyRows.length; i += 100) {
    await supabase.from("user_companies").upsert(companyRows.slice(i, i + 100), { onConflict: "user_id,name_normalized" });
  }

  if (jobId) {
    await supabase.from("contact_sync_jobs").update({
      status: "done", contacts_synced: synced, completed_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  return NextResponse.json({
    synced,
    skipped,
    companies: companyMap.size,
    message: `Imported ${synced} contacts from ${companyMap.size} companies.`,
  });
}
