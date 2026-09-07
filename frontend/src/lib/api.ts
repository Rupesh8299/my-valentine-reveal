const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const apiBaseUrl = `${apiOrigin}/api`;

export const realtimeUrl = `${apiOrigin || window.location.origin}`
  .replace(/^http/, "ws") + "/ws";

export function assetUrl(category: string, fileName: string) {
  return `${apiBaseUrl}/assets/${category}/${encodeURIComponent(fileName)}`;
}

export async function dayMusicUrl(dayId: string, mode: "radio" | "preview") {
  const response = await fetch(`${apiBaseUrl}/music/day/${encodeURIComponent(dayId)}?mode=${mode}`);
  if (!response.ok) throw new Error("Dynamic music is unavailable.");
  const payload = await response.json() as { tracks?: Array<{ url?: string }> };
  const sourceUrl = payload.tracks?.[0]?.url;
  return sourceUrl
    ? `${apiBaseUrl}/music/stream?url=${encodeURIComponent(sourceUrl)}`
    : null;
}
