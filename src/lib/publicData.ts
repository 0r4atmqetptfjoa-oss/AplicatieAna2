/**
 * Helpers to load learning data from the public/ folder.
 * Files live at:
 *   /db/learning_index.json
 *   /summaries/legislation_summary.md
 *   /summaries/logistics_summary.md
 */

export type LearningUnit = {
  id: string;
  topic: string;
  title: string;
  body_html: string;
  source?: string;
};

export async function fetchLearningIndex(): Promise<{ units: LearningUnit[] }> {
  const res = await fetch(`/db/learning_index.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load learning_index.json (${res.status})`);
  return res.json();
}

export async function fetchSummary(kind: "legislation" | "logistics"): Promise<string> {
  const file = kind === "legislation" ? "legislation_summary.md" : "logistics_summary.md";
  const res = await fetch(`/summaries/${file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
  return res.text();
}
