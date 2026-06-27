// Submits every URL in the live sitemap to IndexNow (Bing, Yandex, etc.)
// Usage: bun scripts/indexnow-submit.js [siteUrl]
// Requires INDEXNOW_KEY in the environment and the matching
// public/<key>.txt verification file already deployed.

const siteUrl = process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.altruvex.com";
const key = process.env.INDEXNOW_KEY;

if (!key) {
  console.error("INDEXNOW_KEY is not set.");
  process.exit(1);
}

async function main() {
  const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`);
  if (!sitemapRes.ok) {
    throw new Error(`Failed to fetch sitemap: ${sitemapRes.status}`);
  }
  const xml = await sitemapRes.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

  if (urls.length === 0) {
    console.error("No URLs found in sitemap.");
    process.exit(1);
  }

  const host = new URL(siteUrl).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${siteUrl}/${key}.txt`,
      urlList: urls,
    }),
  });

  console.log(`Submitted ${urls.length} URLs to IndexNow — status ${res.status}`);
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
