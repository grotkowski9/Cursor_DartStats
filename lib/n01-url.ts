/** Walidacja linku do meczu N01 (client + server). */

export type N01UrlCheck =
  | { ok: true; url: string }
  | { ok: false; kind: "empty" | "not_url" | "not_n01" };

export function checkN01MatchUrl(raw: string): N01UrlCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, kind: "empty" };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, kind: "not_url" };
  }

  if (!/^https?:$/i.test(parsed.protocol)) {
    return { ok: false, kind: "not_url" };
  }

  if (!/n01darts\.com/i.test(parsed.hostname)) {
    return { ok: false, kind: "not_n01" };
  }

  const tmid = parsed.searchParams.get("tmid");
  if (!tmid || !tmid.trim()) {
    return { ok: false, kind: "not_n01" };
  }

  return { ok: true, url: trimmed };
}

export const N01_URL_HINT =
  "Wklej pełny adres URL meczu z n01darts.com (np. https://n01darts.com/n01/league/n01_view.html?tmid=…).";

export const N01_ONLY_MESSAGE =
  "Ups. Tutaj możesz nawrzucać, ale tylko mecze n01 🙈";
