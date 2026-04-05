import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? "";
  const citiesParam = searchParams.get("cities") ?? "";
  const typesParam = searchParams.get("types") ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  if (!process.env.SUPABASE_URL) {
    return NextResponse.json([], { status: 200 });
  }

  let q = supabase
    .from("permits")
    .select("id, address, city, state, project_type, value, builder_company, builder_phone, builder_email, issued_date, status, description")
    .order("issued_date", { ascending: false })
    .limit(limit);

  // Structured params (from panel marker): cities + types take priority over NL query
  const cities = citiesParam ? citiesParam.split(",").map((c) => c.trim()).filter(Boolean) : [];
  const types = typesParam ? typesParam.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (cities.length > 0 || types.length > 0) {
    // City filter: exact city name match (case-insensitive)
    if (cities.length > 0) {
      const cityOr = cities.map((c) => `city.ilike.${c}`).join(",");
      q = q.or(cityOr);
    }
    // Type filter: keyword search in project_type + description
    if (types.length > 0) {
      const typeOr = types.flatMap((t) => [`project_type.ilike.%${t}%`, `description.ilike.%${t}%`]).join(",");
      q = q.or(typeOr);
    }
  } else if (query.trim()) {
    // Fallback NL search across key text fields
    q = q.or(
      `address.ilike.%${query}%,city.ilike.%${query}%,project_type.ilike.%${query}%,builder_company.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data, error } = await q;

  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data ?? []);
}
