import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!process.env.SUPABASE_URL) {
    return NextResponse.json([], { status: 200 });
  }

  // Derive batches from permits table (no separate batches table)
  const { data, error } = await supabase
    .from("permits")
    .select("import_batch_id, city, created_at, address")
    .not("import_batch_id", "is", null)
    .order("created_at", { ascending: false });

  if (error || !data) return NextResponse.json([], { status: 200 });

  // Group by batch_id
  const batchMap = new Map<string, { id: string; created_at: string; count: number; cities: Set<string>; sample: string }>();

  for (const row of data) {
    const bid = row.import_batch_id as string;
    if (!batchMap.has(bid)) {
      batchMap.set(bid, {
        id: bid,
        created_at: row.created_at as string,
        count: 0,
        cities: new Set(),
        sample: row.address as string ?? "",
      });
    }
    const b = batchMap.get(bid)!;
    b.count += 1;
    if (row.city) b.cities.add(row.city as string);
  }

  const batches = [...batchMap.values()].map((b) => ({
    id: b.id,
    filename: b.id.split("::")[1] ?? b.id,
    created_at: b.created_at,
    inserted: b.count,
    total_rows: b.count,
    cities: [...b.cities],
  }));

  return NextResponse.json(batches);
}
