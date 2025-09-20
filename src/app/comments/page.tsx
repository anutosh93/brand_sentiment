'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type RedditComment = { author: string; score: number; body: string; timestamp: string };

export default function CommentsPage() {
  const params = useSearchParams();
  const url = params.get('u') || '';
  const [comments, setComments] = useState<RedditComment[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    async function load() {
      const postsRaw = sessionStorage.getItem('sentiment_posts');
      try {
        if (postsRaw) {
          const posts = JSON.parse(postsRaw) as any[];
          const found = posts.find((p) => p.url === url);
          if (found) setTitle(found.title || 'Reddit Post');
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

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--uber-gray-50)' }}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="uber-heading-1">Comments</h1>
          <Link href="/results" className="uber-btn-secondary">Back to Results</Link>
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
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}


