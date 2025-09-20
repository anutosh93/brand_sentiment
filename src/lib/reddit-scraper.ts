export interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  content: string;
  timestamp: string;
}

export class RedditScraper {
  private async fetchJSON(url: string): Promise<unknown> {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`);
    const body = await res.text();
    try {
      return JSON.parse(body);
    } catch (e) {
      throw new Error('Invalid JSON from Reddit: ' + String(body).slice(0, 120));
    }
  }

  async searchReddit(brandName: string, limit: number = 50): Promise<RedditPost[]> {
    const encoded = encodeURIComponent(brandName);
    const endpoints = [
      `https://www.reddit.com/search.json?q=${encoded}&type=link&sort=top&t=year&limit=100&raw_json=1`,
      `https://www.reddit.com/r/all/search.json?q=${encoded}&restrict_sr=on&sort=top&t=year&limit=100&raw_json=1`,
    ];

    const posts: RedditPost[] = [];
    const nowMs = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const cutoffMs = nowMs - ninetyDaysMs; // last ~3 months
    for (const url of endpoints) {
      try {
        const json = (await this.fetchJSON(url)) as Record<string, unknown>;
        const children = ((json.data as Record<string, unknown>)?.children ?? []) as Array<{ data: Record<string, unknown> }>;
        for (const child of children) {
          const d = child.data;
          const title = String(d.title ?? '');
          const selftext = String(d.selftext ?? '');
          const subreddit = String(d.subreddit ?? 'unknown');
          const ups = Number(d.ups ?? d.score ?? 0);
          const numComments = Number(d.num_comments ?? 0);
          const permalink = String(d.permalink ?? '');
          const createdUtc = Number(d.created_utc ?? Date.now() / 1000);
          const createdMs = createdUtc * 1000;

          const fullText = `${title} ${selftext}`.toLowerCase();
          if (!fullText.includes(brandName.toLowerCase())) continue;
          // Only include posts from last 3 months
          if (createdMs < cutoffMs) continue;

          posts.push({
            title: title || 'No title available',
            url: permalink ? `https://www.reddit.com${permalink}` : String(d.url ?? ''),
            subreddit,
            upvotes: Number.isFinite(ups) ? ups : 0,
            comments: Number.isFinite(numComments) ? numComments : 0,
            content: selftext || title,
            timestamp: new Date(createdMs).toISOString(),
          });
        }
      } catch (e) {
        console.error('Reddit JSON fetch error:', e);
        continue;
      }
      if (posts.length >= limit) break;
    }

    // De-duplicate by URL and cap to limit
    const seen = new Set<string>();
    const unique: RedditPost[] = [];
    for (const p of posts) {
      if (p.url && !seen.has(p.url)) {
        seen.add(p.url);
        unique.push(p);
      }
    }
    // Sort by engagement (upvotes + comments) descending and take top N
    unique.sort((a, b) => (b.upvotes + b.comments) - (a.upvotes + a.comments));
    return unique.slice(0, limit);
  }
}