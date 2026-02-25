const instanceUrl = process.env["MASTODON_INSTANCE_URL"];
const accessToken = process.env["MASTODON_ACCESS_TOKEN"];

if (!instanceUrl || !accessToken) {
  throw new Error(
    "MASTODON_INSTANCE_URL und MASTODON_ACCESS_TOKEN müssen gesetzt sein"
  );
}

const headers = { Authorization: `Bearer ${accessToken}` };

interface MastodonAccount {
  id: string;
  username: string;
}

interface MastodonStatus {
  id: string;
  url: string;
  created_at: string;
  content: string;
  favourites_count: number;
  reblogs_count: number;
}

async function getAccountId(): Promise<string> {
  const res = await fetch(`${instanceUrl}/api/v1/accounts/verify_credentials`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Fehler beim Abrufen des Accounts: ${res.status}`);
  }

  const account = (await res.json()) as MastodonAccount;
  return account.id;
}

async function getTootsFromToday(accountId: string): Promise<MastodonStatus[]> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const res = await fetch(
    `${instanceUrl}/api/v1/accounts/${accountId}/statuses?limit=40&exclude_reblogs=true`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Fehler beim Abrufen der Toots: ${res.status}`);
  }

  const statuses = (await res.json()) as MastodonStatus[];
  return statuses.filter((s) => s.created_at.startsWith(today));
}

async function reblog(statusId: string): Promise<MastodonStatus> {
  const res = await fetch(
    `${instanceUrl}/api/v1/statuses/${statusId}/reblog`,
    { method: "POST", headers }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reblog-Fehler: ${res.status}\n${body}`);
  }

  return (await res.json()) as MastodonStatus;
}

async function main() {
  const accountId = await getAccountId();
  const toots = await getTootsFromToday(accountId);
  if (toots.length === 0) {
    console.log("Keine Toots von heute gefunden.");
    return;
  }

  const highlight = toots.reduce((best, current) => {
    const bestScore = best.favourites_count + best.reblogs_count;
    const currentScore = current.favourites_count + current.reblogs_count;
    return currentScore > bestScore ? current : best;
  });

  const score = highlight.favourites_count + highlight.reblogs_count;
  console.log(`Highlight: ${highlight.url} (${highlight.favourites_count} Favs + ${highlight.reblogs_count} Boosts = ${score})`);

  const reposted = await reblog(highlight.id);
  console.log(`Repost erfolgreich: ${reposted.url}`);
}

main().catch((err) => {
  console.error("Fehler:", err);
  process.exit(1);
});
