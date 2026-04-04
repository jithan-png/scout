import type { Opportunity } from "./types";
import type { ScoutOpportunity } from "./types";

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return v ? `$${v}` : "";
}

function csvCell(v: string | number | undefined | null): string {
  const s = String(v ?? "").replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

export function oppsToCSV(opps: Opportunity[]): string {
  const header = [
    "Name", "City", "Type", "Value", "Company",
    "Phone", "Email", "Priority", "Score",
    "Source", "Status", "Suggested Action",
  ].join(",");

  const rows = opps.map((opp) => {
    const scout = opp as ScoutOpportunity;
    const contact = scout.contacts?.[0] ?? scout.companies?.[0];
    return [
      csvCell(opp.project.name),
      csvCell(opp.project.city),
      csvCell(opp.project.type),
      csvCell(formatValue(scout.estimatedValue ?? opp.project.value)),
      csvCell(opp.company.name),
      csvCell(contact?.phone),
      csvCell(contact?.email),
      csvCell(opp.priority),
      csvCell(opp.score),
      csvCell(scout.primarySource ?? ""),
      csvCell(scout.projectStatus ?? ""),
      csvCell(opp.suggestedAction),
    ].join(",");
  });

  return [header, ...rows].join("\n");
}

export function oppToCRMText(opp: Opportunity): string {
  const scout = opp as ScoutOpportunity;
  const contact = scout.contacts?.[0] ?? scout.companies?.[0];
  const value = formatValue(scout.estimatedValue ?? opp.project.value);
  return [
    `Lead: ${opp.project.name}`,
    `Company: ${opp.company.name}`,
    `City: ${opp.project.city}`,
    `Type: ${opp.project.type}`,
    value ? `Value: ${value}` : null,
    contact?.phone ? `Phone: ${contact.phone}` : null,
    contact?.email ? `Email: ${contact.email}` : null,
    `Priority: ${opp.priority.toUpperCase()}`,
    `Score: ${opp.score}/100`,
    `Next step: ${opp.suggestedAction}`,
    `Source: ${(scout.primarySource ?? "unknown").toUpperCase()}`,
  ].filter(Boolean).join("\n");
}

export function triggerCSVDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
