// ── Relationship intelligence ─────────────────────────────────────────────────
// Finds connection paths between the user and companies in Scout results.

import { supabase } from "@/lib/supabase";
import { normalizeCompany, companySimilarity } from "@/lib/normalize";

export interface ContactMatch {
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string;
  interaction_count: number;
  last_interaction_at: string | null;
  similarity: number;
}

export interface CompanyRelationship {
  company: string;           // original name from permit
  strength: "direct" | "indirect" | "past_customer" | "none";
  contacts: ContactMatch[];
  summary: string;           // human-readable one-liner for Scout prompt
}

/**
 * Given a list of company names (from permits/tenders) and a user_id,
 * returns relationship paths by cross-referencing user_contacts.
 */
export async function findRelationships(
  userId: string,
  companyNames: string[]
): Promise<CompanyRelationship[]> {
  if (!userId || !companyNames.length) return [];

  // Load all user contacts with company data (cap at 2000 for performance)
  const { data: contacts } = await supabase
    .from("user_contacts")
    .select("name, role, email, phone, company_name, company_normalized, source, interaction_count, last_interaction_at")
    .eq("user_id", userId)
    .not("company_normalized", "is", null)
    .limit(2000);

  if (!contacts?.length) return [];

  const results: CompanyRelationship[] = [];

  for (const rawName of companyNames) {
    if (!rawName?.trim()) continue;
    const norm = normalizeCompany(rawName);

    // Find contacts at this company via fuzzy match
    const matches: ContactMatch[] = [];
    for (const c of contacts) {
      if (!c.company_normalized) continue;
      const sim = companySimilarity(norm, c.company_normalized);
      if (sim >= 0.65) {
        matches.push({
          name: c.name,
          role: c.role,
          email: c.email,
          phone: c.phone,
          company_name: c.company_name,
          source: c.source,
          interaction_count: c.interaction_count ?? 0,
          last_interaction_at: c.last_interaction_at,
          similarity: sim,
        });
      }
    }

    if (!matches.length) {
      results.push({ company: rawName, strength: "none", contacts: [], summary: "" });
      continue;
    }

    // Sort by interaction count then similarity
    matches.sort((a, b) => (b.interaction_count - a.interaction_count) || (b.similarity - a.similarity));
    const top = matches[0];

    // Determine strength
    let strength: CompanyRelationship["strength"] = "indirect";
    if (top.interaction_count >= 3) strength = "direct";
    else if (top.interaction_count >= 1) strength = "direct";
    else if (top.source === "gmail") strength = "indirect";

    // Build human-readable summary
    const ago = top.last_interaction_at ? daysAgo(top.last_interaction_at) : null;
    const agoStr = ago !== null ? (ago === 0 ? "today" : ago === 1 ? "yesterday" : `${ago} days ago`) : null;
    const roleStr = top.role ? ` (${top.role})` : "";
    const contactStr = top.email ?? top.phone ?? "";
    const interactionStr = top.interaction_count > 0
      ? ` · ${top.interaction_count} interaction${top.interaction_count > 1 ? "s" : ""}${agoStr ? `, last ${agoStr}` : ""}`
      : "";

    let summary = `${top.name}${roleStr} at ${rawName}${interactionStr}`;
    if (contactStr) summary += ` [${contactStr}]`;
    if (matches.length > 1) summary += ` (+${matches.length - 1} more contact${matches.length > 2 ? "s" : ""})`;

    results.push({ company: rawName, strength, contacts: matches, summary });
  }

  return results.filter((r) => r.strength !== "none");
}

/** Format relationship results as a system prompt injection string. */
export function formatRelationshipContext(relationships: CompanyRelationship[]): string {
  if (!relationships.length) return "";

  const lines = relationships.map((r) => `- ${r.company}: ${r.summary}`);
  return `RELATIONSHIP INTELLIGENCE — you know people at these companies:\n${lines.join("\n")}\n\nAlways surface relationship-connected opportunities first. Lead your response by mentioning the contact name and connection when a company has a warm path.`;
}

function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}
