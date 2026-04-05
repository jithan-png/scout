// ── Dev/Test: Seed sample permit data into Supabase ──────────────────────────
// POST /api/admin/seed-permits — inserts 10 sample Vancouver/Surrey permits.
// Call this once from DevTools or curl to enable Scout panel testing.
// Safe to call multiple times (upsert on address+city).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SAMPLE_PERMITS = [
  {
    address: "1428 West 12th Avenue",
    city: "Vancouver",
    state: "BC",
    project_type: "6-storey condo",
    value: 8200000,
    builder_company: "Westin Developments Ltd",
    builder_phone: "604-555-0182",
    builder_email: "builds@westindev.ca",
    applicant_company: "Pacific Architecture Group",
    owner_company: "1428 Holdings Inc",
    issued_date: "2026-03-20",
    status: "issued",
    description: "New 6-storey mixed-use residential building with 42 strata units and ground floor retail.",
  },
  {
    address: "3245 Kingsway",
    city: "Vancouver",
    state: "BC",
    project_type: "townhouse",
    value: 3400000,
    builder_company: "Cascadia Build Group",
    builder_phone: "604-555-0247",
    builder_email: "info@cascadiabuild.ca",
    applicant_company: "Cascadia Build Group",
    owner_company: "Kingsway Townhomes Corp",
    issued_date: "2026-03-28",
    status: "issued",
    description: "8-unit townhouse complex, 3-storey wood frame, rooftop terrace on each unit.",
  },
  {
    address: "892 East Hastings Street",
    city: "Vancouver",
    state: "BC",
    project_type: "purpose built rental",
    value: 12500000,
    builder_company: "Urban Foundation Contractors",
    builder_phone: "604-555-0391",
    builder_email: "contracts@urbanfoundation.ca",
    applicant_company: "Renfrew Properties Ltd",
    owner_company: "Renfrew Properties Ltd",
    issued_date: "2026-03-15",
    status: "issued",
    description: "12-storey purpose-built rental with 88 units, concrete construction, underground parkade.",
  },
  {
    address: "5512 Oak Street",
    city: "Vancouver",
    state: "BC",
    project_type: "duplex",
    value: 1200000,
    builder_company: "Oakwood Custom Homes",
    builder_phone: "778-555-0112",
    builder_email: "oakwoodbuilds@gmail.com",
    applicant_company: "Oakwood Custom Homes",
    owner_company: "Singh Family Trust",
    issued_date: "2026-04-01",
    status: "issued",
    description: "Side-by-side duplex, wood frame, 2400 sq ft each unit.",
  },
  {
    address: "201 Burrard Street",
    city: "Vancouver",
    state: "BC",
    project_type: "office renovation",
    value: 4800000,
    builder_company: "Pacific Interior Group",
    builder_phone: "604-555-0508",
    builder_email: "commercial@pacificinterior.ca",
    applicant_company: "Commercial Build Partners",
    owner_company: "Burrard Tower Holdings",
    issued_date: "2026-03-10",
    status: "issued",
    description: "Full interior renovation of floors 8-14, open office conversion, new mechanical systems.",
  },
  {
    address: "14832 104 Avenue",
    city: "Surrey",
    state: "BC",
    project_type: "townhouse",
    value: 6700000,
    builder_company: "Surrey Frame Works Inc",
    builder_phone: "604-555-0667",
    builder_email: "quotes@surreyframeworks.ca",
    applicant_company: "Surrey Frame Works Inc",
    owner_company: "Panorama Heights Developments",
    issued_date: "2026-03-25",
    status: "issued",
    description: "18-unit stacked townhouse complex, 4-storey, near Skytrain, underground parking.",
  },
  {
    address: "9021 King George Boulevard",
    city: "Surrey",
    state: "BC",
    project_type: "highrise residential",
    value: 22000000,
    builder_company: "Argyle Construction Corp",
    builder_phone: "604-555-0741",
    builder_email: "tenders@argyleconstruction.ca",
    applicant_company: "Argyle Construction Corp",
    owner_company: "KG Towers Ltd",
    issued_date: "2026-02-28",
    status: "issued",
    description: "28-storey highrise with 210 strata condos, commercial podium, transit-oriented development.",
  },
  {
    address: "6655 152nd Street",
    city: "Surrey",
    state: "BC",
    project_type: "single family",
    value: 980000,
    builder_company: "Fleetwood Homes Ltd",
    builder_phone: "778-555-0833",
    builder_email: "builds@fleetwoodhomes.ca",
    applicant_company: "Fleetwood Homes Ltd",
    owner_company: "Chen Family",
    issued_date: "2026-04-02",
    status: "issued",
    description: "New 2-storey single family detached home, 3400 sq ft, double garage.",
  },
  {
    address: "2780 East 41st Avenue",
    city: "Vancouver",
    state: "BC",
    project_type: "multiplex",
    value: 2900000,
    builder_company: "Fraser Valley Builders",
    builder_phone: "604-555-0914",
    builder_email: "estimating@fraservalleybuilders.ca",
    applicant_company: "Fraser Valley Builders",
    owner_company: "41st Holdings",
    issued_date: "2026-04-03",
    status: "issued",
    description: "6-unit multiplex, wood frame, ground-oriented, landscaped courtyard.",
  },
  {
    address: "10362 City Parkway",
    city: "Surrey",
    state: "BC",
    project_type: "industrial warehouse",
    value: 9100000,
    builder_company: "Coast Industrial Builders",
    builder_phone: "604-555-0055",
    builder_email: "commercial@coastindustrial.ca",
    applicant_company: "Coast Industrial Builders",
    owner_company: "Surrey Logistics Park Ltd",
    issued_date: "2026-03-18",
    status: "issued",
    description: "50,000 sq ft tilt-up concrete warehouse and distribution centre with dock loading.",
  },
];

export async function POST() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const db = createClient(url, key);

  const { data, error } = await db
    .from("permits")
    .upsert(SAMPLE_PERMITS, { onConflict: "address,city" })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ seeded: data?.length ?? SAMPLE_PERMITS.length, message: `Inserted ${data?.length ?? SAMPLE_PERMITS.length} sample permits into Supabase.` });
}
