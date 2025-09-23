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
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0; // epoch ms

  private getUserAgent(): string {
    const ua = process.env.REDDIT_USER_AGENT;
    return ua && ua.trim().length > 0
      ? ua
      : 'brand-sentiment/1.0 (+contact: set REDDIT_USER_AGENT)';
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Missing REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET');
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'read' });
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': this.getUserAgent(),
      },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`Reddit OAuth failed: ${res.status}`);
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    const token = json.access_token;
    if (!token) throw new Error('No access_token from Reddit');
    const ttlSec = typeof json.expires_in === 'number' ? json.expires_in : 3600;
    this.accessToken = token;
    this.accessTokenExpiresAt = now + ttlSec * 1000;
    return token;
  }

  private async apiFetch(path: string, params: Record<string, string | number | boolean>): Promise<unknown> {
    const token = await this.getAccessToken();
    const url = new URL(path.startsWith('http') ? path : `https://oauth.reddit.com${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    // Ensure JSON formatting for emojis, links, etc.
    if (!url.searchParams.has('raw_json')) url.searchParams.set('raw_json', '1');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'user-agent': this.getUserAgent(),
      accept: 'application/json',
    };

    let attempt = 0;
    let delay = 600;
    // Retry a few times on transient errors
    // Also refresh token once on 401
    while (attempt < 3) {
      const res = await fetch(url.toString(), { headers, cache: 'no-store' });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON from Reddit: ' + text.slice(0, 120));
        }
      }
      if (res.status === 401 && attempt === 0) {
        // refresh token and retry once
        this.accessToken = null;
        await this.getAccessToken();
      } else if ((res.status >= 500 || res.status === 429) && attempt < 2) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      } else {
        throw new Error(`Reddit fetch failed: ${res.status}`);
      }
      attempt++;
    }
    throw new Error('Reddit fetch failed after retries');
  }

  async searchReddit(brandName: string, limit: number = 50): Promise<RedditPost[]> {
    const query = String(brandName ?? '').trim();
    if (!query) return [];
    const endpoints: Array<{ path: string; params: Record<string, string | number | boolean> }> = [
      { path: '/search', params: { q: query, type: 'link', sort: 'top', t: 'year', limit: 100 } },
      { path: '/r/all/search', params: { q: query, restrict_sr: 'on', sort: 'top', t: 'year', limit: 100 } },
    ];

    const posts: RedditPost[] = [];
    for (const endpoint of endpoints) {
      try {
        const json = (await this.apiFetch(endpoint.path, endpoint.params)) as Record<string, unknown>;
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

          const fullText = `${title} ${selftext}`.toLowerCase();
          if (!fullText.includes(query.toLowerCase())) continue;

          posts.push({
            title: title || 'No title available',
            url: permalink ? `https://www.reddit.com${permalink}` : String(d.url ?? ''),
            subreddit,
            upvotes: Number.isFinite(ups) ? ups : 0,
            comments: Number.isFinite(numComments) ? numComments : 0,
            content: selftext || title,
            timestamp: new Date(createdUtc * 1000).toISOString(),
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
    return unique;
  }
}