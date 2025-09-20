'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
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
      } else if (data.error) {
        setResult(`Error: ${data.error}`);
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
    } catch {
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
          <h1 className="uber-heading-1 mb-4">Reddit Brand Sentiment Analyzer</h1>
          <p className="uber-body-large" style={{ color: 'var(--uber-gray-600)' }}>
            Analyze customer sentiment for any brand by scraping Reddit discussions
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--uber-blue-light)', color: 'var(--uber-blue)' }}>
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Now powered by real Reddit data scraping
          </div>
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
                  placeholder="Tesla"
                  required
                />
                <p className="uber-caption mt-1" style={{ color: 'var(--uber-gray-500)' }}>
                  The tool will search Reddit for mentions of this brand
                </p>
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
                  placeholder="https://www.tesla.com"
                />
                <p className="uber-caption mt-1" style={{ color: 'var(--uber-gray-500)' }}>
                  Helps with brand context but not required for Reddit analysis
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="uber-btn-primary"
                >
                  {loading && <div className="uber-spinner mr-2"></div>}
                  {loading ? 'Analyzing Reddit…' : 'Analyze Reddit Sentiment'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="uber-btn-secondary"
                >
                  Clear
                </button>
              </div>

              {loading && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--uber-blue-light)' }}>
                  <p className="uber-caption" style={{ color: 'var(--uber-blue)' }}>
                    <strong>What's happening:</strong><br/>
                    1. Searching Reddit for brand mentions<br/>
                    2. Scraping posts and comments<br/>
                    3. Analyzing sentiment patterns<br/>
                    4. Generating comprehensive report
                  </p>
                </div>
              )}

              <div className="pt-4 border-t" style={{ borderColor: 'var(--uber-gray-200)' }}>
                <p className="uber-caption mb-3" style={{ color: 'var(--uber-gray-600)' }}>
                  Try popular brands:
                </p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button" 
                    onClick={() => setExample('Tesla', 'https://www.tesla.com')} 
                    className="uber-chip"
                  >
                    Tesla
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
                    onClick={() => setExample('Netflix', 'https://www.netflix.com')} 
                    className="uber-chip"
                  >
                    Netflix
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExample('McDonald\'s', 'https://www.mcdonalds.com')} 
                    className="uber-chip"
                  >
                    McDonald's
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExample('Robinhood', 'https://www.robinhood.com')} 
                    className="uber-chip"
                  >
                    Robinhood
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="lg:col-span-3">
            <div className="uber-card p-8 min-h-[400px]">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="uber-heading-2">Reddit Analysis Results</h2>
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
                    Scraping Reddit for brand mentions and analyzing sentiment…
                  </p>
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--uber-gray-100)' }}>
                    <svg className="w-5 h-5" style={{ color: 'var(--uber-gray-400)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="uber-body" style={{ color: 'var(--uber-gray-500)' }}>
                    Enter a brand name to analyze Reddit sentiment. Real data from Reddit posts and discussions will appear here.
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
              Results are based on publicly available Reddit posts and may not represent all customer opinions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* 'use client';

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
        try { sessionStorage.setItem('sentiment_markdown', data.markdown); } catch {}
        router.push('/results');
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
    } catch {
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
            <div className="uber-card p-8 min-h-[240px]">
              {loading ? (
                <div className="flex items-center justify-center gap-4 py-10">
                  <div className="uber-spinner"></div>
                  <p className="uber-body" style={{ color: 'var(--uber-gray-600)' }}>
                    Analyzing brand sentiment… you will be redirected to results.
                  </p>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <h2>How it works</h2>
                  <ul>
                    <li>Enter a brand and optionally its website.</li>
                    <li>We fetch sources and analyze sentiment.</li>
                    <li>On success you are redirected to a dedicated results page.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
 */