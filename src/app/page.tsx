'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function Home() {
  const [brandName, setBrandName] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandName, brandWebsite }),
      });
      const data = await res.json();
      if (data.markdown) {
        setResult(data.markdown);
      } else {
        setResult('Error fetching sentiment.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setResult('Error: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setBrandName('');
    setBrandWebsite('');
    setResult('');
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      // ignore copy errors
    }
  };

  const setExample = (name: string, website: string) => {
    setBrandName(name);
    setBrandWebsite(website);
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--uber-gray-50)' }}>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="text-center mb-12">
          <h1 className="uber-heading-1 mb-4">Brand Sentiment Analyzer</h1>
          <p className="uber-body-large" style={{ color: 'var(--uber-gray-600)' }}>
            Search the web and summarize customer sentiment for any brand
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="uber-card p-8 space-y-6">
              <div>
                <label className="block uber-caption mb-2" style={{ color: 'var(--uber-gray-700)' }}>
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="uber-input"
                  placeholder="Nike"
                  required
                />
              </div>
              <div>
                <label className="block uber-caption mb-2" style={{ color: 'var(--uber-gray-700)' }}>
                  Brand Website (optional)
                </label>
                <input
                  type="url"
                  value={brandWebsite}
                  onChange={(e) => setBrandWebsite(e.target.value)}
                  className="uber-input"
                  placeholder="https://www.nike.com"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="uber-btn-primary"
                >
                  {loading && <div className="uber-spinner mr-2"></div>}
                  {loading ? 'Analyzing…' : 'Analyze Sentiment'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="uber-btn-secondary"
                >
                  Clear
                </button>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--uber-gray-200)' }}>
                <p className="uber-caption mb-3" style={{ color: 'var(--uber-gray-600)' }}>
                  Try examples:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => setExample('Nike', 'https://www.nike.com')} 
                    className="uber-chip"
                  >
                    Nike
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExample('Apple', 'https://www.apple.com')} 
                    className="uber-chip"
                  >
                    Apple
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExample('Samsung', 'https://www.samsung.com')} 
                    className="uber-chip"
                  >
                    Samsung
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExample('Tesla', 'https://www.tesla.com')} 
                    className="uber-chip"
                  >
                    Tesla
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-3">
            <div className="uber-card p-8 min-h-[400px]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="uber-heading-2">Results</h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!result}
                    className="uber-btn-secondary text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {copied ? 'Copied!' : 'Copy Markdown'}
                  </button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-4 py-12">
                  <div className="uber-spinner"></div>
                  <p className="uber-body" style={{ color: 'var(--uber-gray-600)' }}>
                    Analyzing brand sentiment across the web…
                  </p>
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--uber-gray-100)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--uber-gray-400)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="uber-body" style={{ color: 'var(--uber-gray-500)' }}>
                    Enter a brand name to get started. Results will appear here.
                  </p>
                </div>
              )}

              {result && (
                <div className="prose max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result}</ReactMarkdown>
                </div>
              )}
            </div>
            <p className="mt-4 uber-caption text-center" style={{ color: 'var(--uber-gray-500)' }}>
              Results are generated via aggregated public sources and may contain inaccuracies.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
