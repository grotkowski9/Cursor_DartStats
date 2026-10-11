/** Strip PRD " · vs Opponent" so the header is tournament + date, like N01. */
export function displayMatchTitle(title: string): string {
  const cleaned = title.replace(/\s*[·•]\s*vs\s+.+$/i, "").trim();
  return cleaned || title;
}
