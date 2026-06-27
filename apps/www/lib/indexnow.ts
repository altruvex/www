import { SITE_CONFIG } from "@/lib/metadata";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Pings IndexNow (fanned out to Bing, Yandex, and other participating
 * engines) so changed/new URLs get crawled within minutes instead of
 * waiting for the next scheduled crawl. Google does not participate in
 * IndexNow; GSC's URL Inspection tool is still required for Google.
 */
export async function pingIndexNow(urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) {
    return;
  }

  const host = new URL(SITE_CONFIG.url).host;

  await fetch(INDEXNOW_ENDPOINT, {
    body: JSON.stringify({
      host,
      key,
      keyLocation: `${SITE_CONFIG.url}/${key}.txt`,
      urlList: urls,
    }),
    headers: { "Content-Type": "application/json; charset=utf-8" },
    method: "POST",
  });
}
