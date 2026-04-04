import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  if (!process.env.SUPABASE_URL) {
    return NextResponse.json([], { status: 200 });
  }

  let q = supabase
    .from("permits")
    .select("id, address, city, state, project_type, value, builder_company, builder_phone, builder_email, issued_date, status, description")
    .order("issued_date", { ascending: false })
    .limit(limit);

  if (query.trim()) {
    // Search across key text fields using OR
    q = q.or(
      `address.ilike.%${query}%,city.ilike.%${query}%,project_type.ilike.%${query}%,builder_company.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data, error } = await q;

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
