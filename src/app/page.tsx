'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [brandName, setBrandName] = useState('');
  const [brandWebsite, setBrandWebsite] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      setResult('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Brand Sentiment Analyzer</h1>
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-xl p-6 space-y-4">
          <div>
            <label className="block font-semibold mb-1">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="Nike"
              required
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Brand Website</label>
            <input
              type="text"
              value={brandWebsite}
              onChange={(e) => setBrandWebsite(e.target.value)}
              className="w-full border rounded-lg p-2"
              placeholder="https://www.nike.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {loading ? 'Fetching…' : 'Analyze Sentiment'}
          </button>
        </form>

        <div className="mt-8 prose max-w-none">
          {loading && <p>Loading sentiment data…</p>}
          {result && <ReactMarkdown>{result}</ReactMarkdown>}
        </div>
      </div>
    </main>
  );
}
