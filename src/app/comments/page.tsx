'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { RecommendationItem } from '@/lib/types';

type RedditComment = { author: string; score: number; body: string; timestamp: string };

function CommentsInner() {
  const params = useSearchParams();
  const url = params.get('u') || '';
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [title, setTitle] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [postTimestamp, setPostTimestamp] = useState<string | undefined>(undefined);
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const postsRaw = sessionStorage.getItem('sentiment_posts');
      try {
        if (postsRaw) {
          const posts = JSON.parse(postsRaw) as Array<{ url?: string; title?: string; subreddit?: string; timestamp?: string }>;
          const found = posts.find((p) => p.url === url);
          if (found) {
            setTitle(found.title || 'Reddit Post');
            setSubreddit(found.subreddit || '');
            setPostTimestamp(found.timestamp);
          }
        }
      } catch {}
      if (url) {
        try {
          const res = await fetch(`/api/comments?u=${encodeURIComponent(url)}&limit=20`);
          const data = await res.json();
          setComments(Array.isArray(data.comments) ? data.comments : []);
        } catch {}
      }
    }
    load();
  }, [url]);

  const brandContext = useMemo(() => {
    if (typeof window === 'undefined') return { name: undefined as string | undefined, website: undefined as string | undefined };
    const name = sessionStorage.getItem('last_brand_name') || undefined;
    const website = sessionStorage.getItem('last_brand_website') || undefined;
    return { name, website };
  }, []);

  useEffect(() => {
    async function getRecommendations() {
      if (!url || comments.length === 0) return;
      setRecsLoading(true);
      try {
        const body = {
          brandName: brandContext.name,
          brandWebsite: brandContext.website,
          post: { title, url, subreddit, timestamp: postTimestamp },
          comments: comments.map((c) => ({ author: c.author, score: c.score, body: c.body, timestamp: c.timestamp })),
        };
        const resp = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await resp.json();
        const out = Array.isArray(json.recommendations) ? (json.recommendations as RecommendationItem[]) : [];
        setRecs(out);
      } catch {
        setRecs([]);
      } finally {
        setRecsLoading(false);
      }
    }
    getRecommendations();
  }, [url, comments, brandContext.name, brandContext.website, title, subreddit, postTimestamp]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--uber-gray-50)' }}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="uber-heading-1">Comments</h1>
          <span />
        </div>

        <div className="uber-card p-6 mb-4">
          <h2 className="uber-heading-2 mb-1">{title}</h2>
          {url && (
            <a className="uber-caption" href={url} target="_blank" rel="noreferrer">Open on Reddit</a>
          )}
        </div>

        <div className="uber-card p-6">
          {comments.length === 0 ? (
            <p className="uber-body" style={{ color: 'var(--uber-gray-600)' }}>
              No comments captured (or rate-limited). Try opening the post on Reddit.
            </p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c, i) => (
                <li key={i} className="rounded-lg border border-[var(--uber-gray-200)] p-4 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="uber-caption">u/{c.author}</span>
                    <span className="uber-caption">▲ {c.score}</span>
                  </div>
                  <p className="uber-body" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
                  <div className="uber-caption mt-2" style={{ color: 'var(--uber-gray-400)' }}>{new Date(c.timestamp).toLocaleString()}</div>

                  {/* Recommendation block */}
                  <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--uber-gray-50)' }}>
                    {recsLoading ? (
                      <div className="flex items-center gap-2"><div className="uber-spinner"></div><span className="uber-caption">Generating recommendation…</span></div>
                    ) : (
                      (() => {
                        const r = recs.find((x) => x.index === i) || recs[i];
                        if (!r) return <span className="uber-caption" style={{ color: 'var(--uber-gray-500)' }}>No recommendation available.</span>;
                        const confPct = Math.round((r.confidence ?? 0) * 100);
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="uber-caption" style={{ color: 'var(--uber-gray-600)' }}>Sentiment: {r.sentiment}</span>
                              <span className="uber-caption" style={{ color: 'var(--uber-gray-600)' }}>Confidence: {confPct}%</span>
                            </div>
                            <p className="uber-body" style={{ color: 'var(--uber-gray-800)' }}>{r.recommendation}</p>
                            {r.links && r.links.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {r.links.map((l, idx2) => (
                                  <a key={idx2} className="uber-chip" href={l.url} target="_blank" rel="noreferrer">{l.title}</a>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="uber-btn-secondary text-xs px-3 py-1"
                                onClick={async () => {
                                  try {
                                    await fetch('/api/feedback', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ postUrl: url, commentIndex: i, helpful: true })
                                    });
                                  } catch {}
                                }}
                              >Helpful</button>
                              <button
                                className="uber-btn-secondary text-xs px-3 py-1"
                                onClick={async () => {
                                  try {
                                    await fetch('/api/feedback', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ postUrl: url, commentIndex: i, helpful: false })
                                    });
                                  } catch {}
                                }}
                              >Not Helpful</button>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CommentsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--uber-gray-50)' }}><div className="uber-card p-6">Loading comments…</div></main>}>
      <CommentsInner />
    </Suspense>
  );
}


