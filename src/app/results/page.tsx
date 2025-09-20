'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Link from 'next/link';

export default function ResultsPage() {
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const md = sessionStorage.getItem('sentiment_markdown') || '';
    setMarkdown(md);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--uber-gray-50)' }}>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="uber-heading-1">Reddit Analysis Results</h1>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="uber-btn-secondary text-sm px-4 py-2">
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
            <Link href="/" className="uber-btn-primary">New Analysis</Link>
          </div>
        </div>

        {!markdown && (
          <div className="uber-card p-8">
            <p className="uber-body" style={{ color: 'var(--uber-gray-600)' }}>
              No results to display. Please start a new analysis from the landing page.
            </p>
          </div>
        )}

        {markdown && (
          <div className="uber-card p-6">
            <div className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{markdown}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


