import * as cheerio from 'cheerio';

/**
 * Strips a raw HTML page down to visible text, dropping script/style/nav
 * noise so the LLM extraction step gets article body rather than markup.
 */
export function htmlToText(html) {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

/**
 * Fetches each configured source and returns a raw-text record per source.
 * Failures are captured per-source (not thrown) so one dead link doesn't
 * stop the rest of the run.
 */
export async function fetchSources(sourceConfigs) {
  const results = await Promise.all(
    sourceConfigs.map(async (config) => {
      try {
        const response = await fetch(config.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        return {
          ...config,
          rawText: htmlToText(html),
          fetchedAt: new Date(),
          ok: true,
        };
      } catch (err) {
        return { ...config, error: err.message, fetchedAt: new Date(), ok: false };
      }
    })
  );
  return results;
}
