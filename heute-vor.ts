import { LOCATIONS } from "./locations.js";

const API_BASE = "https://api.wikimedia.org/feed/v1/wikipedia/de/onthisday/selected";
const USER_AGENT = "bot-heute-vor/1.0 (https://github.com; bot@example.com)";
const TOOT_DELAY_MS = 1_000*60*75; // 75 Minuten

interface WikiPage {
  title: string;
  content_urls: {
    desktop: { page: string };
  };
  normalizedtitle: string;
}

interface SelectedEvent {
  text: string;
  year: number;
  pages: WikiPage[];
}

interface ApiResponse {
  selected: SelectedEvent[];
}

function findLocationHashtags(text: string): string[] {
  return LOCATIONS
    .filter((location) => text.includes(location))
    .map((location) =>
      `#${location.replace(/[\s-]/g, "").replace(/[äöüÄÖÜ]/g, (c) => ({ ä: "a", ö: "o", ü: "u", Ä: "A", Ö: "O", Ü: "U" })[c] ?? c).replace(/ß/g, "ss")}`,
    );
}

const today = new Date();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const currentYear = new Date().getFullYear();
const monthName = today.toLocaleString("de-DE", { month: "long" });
const wikiDate = `${today.getDate()}._${monthName}`;

async function fetchOnThisDay(): Promise<SelectedEvent[]> {
  const url = `${API_BASE}/${mm}/${dd}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as ApiResponse;
  return data.selected;
}

const MASTODON_LINK_LENGTH = 23;
const MAX_TOOT_LENGTH = Number(process.env["MAX_TOOT_LENGTH"]) || 500;

function mastodonLength(text: string): number {
  // Mastodon counts every URL (http:// or https://) as 23 characters
  return text.replace(/https?:\/\/\S+/g, "x".repeat(MASTODON_LINK_LENGTH)).length;
}

function buildTootParts(events: SelectedEvent[]): string[] {
  const lines = events
    .sort((a, b) => b.year - a.year)
    .map((event) => {
      const yearsAgo = currentYear - event.year;
      const links = event.pages
        .filter((p) => p.content_urls?.desktop?.page && !p.title.startsWith("Datei:"))
        .map((p) => p.content_urls.desktop.page);

      const text = event.text
        .replace(/\u00AD/g, "")     // soft hyphens
        .replace(/\u200B/g, "");    // zero-width spaces

      const locationTags = findLocationHashtags(text).join(" ");
      const hashtags = locationTags ? `${locationTags} #HeuteVor #Wikipedia` : "#HeuteVor #Wikipedia";

      const base = `Vor ${yearsAgo} Jahren: ${text}`;
      let toot = `${base}\n${hashtags}`;

      const includedLinks: string[] = [];
      for (const link of links) {
        includedLinks.push(link);
        const candidate = `${base}\n${includedLinks.join("\n")}\n${hashtags}`;
        if (mastodonLength(candidate) <= MAX_TOOT_LENGTH) {
          toot = candidate;
        } else {
          break;
        }
      }

      return toot;
    });

  return lines;
}

interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  created_at: string;
}

async function postToMastodon(
  status: string,
  inReplyToId?: string
): Promise<MastodonStatus> {
  const instanceUrl = process.env["MASTODON_INSTANCE_URL"];
  const accessToken = process.env["MASTODON_ACCESS_TOKEN"];

  if (!instanceUrl || !accessToken) {
    throw new Error(
      "MASTODON_INSTANCE_URL und MASTODON_ACCESS_TOKEN müssen gesetzt sein"
    );
  }

  const url = `${instanceUrl}/api/v1/statuses`;
  const body: Record<string, string> = { status, visibility: "public", language: "de" };
  if (inReplyToId) {
    body["in_reply_to_id"] = inReplyToId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mastodon-Fehler: ${res.status} ${res.statusText}\n${text}`);
  }

  return (await res.json()) as MastodonStatus;
}

async function main() {
  const events = await fetchOnThisDay();

  if (events.length === 0) {
    console.log("Keine Ereignisse für heute gefunden.");
    return;
  }

  const parts = buildTootParts(events);

  let lastId: string | undefined;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
      
    console.log(part);
    console.log(`--- Zeichenanzahl: ${part.length} ---\n`);
    const posted = await postToMastodon(part, lastId);
    lastId = posted.id;
    console.log(`Toot gepostet: ${posted.url}\n`);
    console.log(`Warte ${TOOT_DELAY_MS}ms...\n`);
    await new Promise((resolve) => setTimeout(resolve, TOOT_DELAY_MS));
  }
}

main().catch((err) => {
  console.error("Fehler:", err);
  process.exit(1);
});
