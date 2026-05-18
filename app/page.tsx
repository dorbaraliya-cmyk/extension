'use client';

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';

type Step = 'idle' | 'analyzing' | 'building' | 'saving' | 'done' | 'error';

interface StatusState {
  step: Step;
  messages: string[];
  docGUID?: string;
  docUrl?: string;
  error?: string;
}

function CookieGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        How to get this
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-10 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Getting your session cookies</p>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ol className="space-y-2.5">
            {[
              { n: 1, text: 'Open DealHub in Chrome and log in' },
              { n: 2, text: <span>Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded font-mono">Cmd+Option+I</kbd> (Mac) or <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded font-mono">F12</kbd> (Windows) to open DevTools</span> },
              { n: 3, text: 'Go to the Network tab, then reload the page' },
              { n: 4, text: 'Click any request in the list (e.g. one ending in .json)' },
              { n: 5, text: <span>In the <strong>Headers</strong> panel, find the <strong>Request Headers</strong> section and locate the <strong>Cookie</strong> row</span> },
              { n: 6, text: 'Click the Cookie value to select it, then copy the entire string' },
              { n: 7, text: 'Paste the full string into the field below' },
            ].map(({ n, text }) => (
              <li key={n} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-semibold flex items-center justify-center text-xs">{n}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-relaxed">
            Cookies expire after ~30 min of inactivity. If you get an auth error, refresh DealHub and repeat these steps.
          </p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://poc.dealhub.io');
  const [versionGUID, setVersionGUID] = useState('');
  const [playbookGUID, setPlaybookGUID] = useState('');
  const [sessionCookies, setSessionCookies] = useState('');
  const [status, setStatus] = useState<StatusState>({ step: 'idle', messages: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];

  const handleFile = (f: File) => {
    setFile(f);
    if (!docName) setDocName(f.name.replace(/\.[^.]+$/, ''));
  };

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [docName]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const isLoading = ['analyzing', 'building', 'saving'].includes(status.step);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docName || !baseUrl || !versionGUID || !playbookGUID || !sessionCookies) return;

    setStatus({ step: 'analyzing', messages: ['Analyzing document with Claude...'] });

    const fd = new FormData();
    fd.append('file', file);
    fd.append('docName', docName);
    fd.append('baseUrl', baseUrl);
    fd.append('versionGUID', versionGUID);
    fd.append('playbookGUID', playbookGUID);
    fd.append('sessionCookies', sessionCookies);

    try {
      const res = await fetch('/api/create', { method: 'POST', body: fd });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.error) {
              setStatus(prev => ({ ...prev, step: 'error', error: data.error }));
            } else if (data.step === 'analyzing') {
              setStatus(prev => ({ ...prev, step: 'analyzing', messages: [...prev.messages, data.message] }));
            } else if (data.step === 'building') {
              setStatus(prev => ({ ...prev, step: 'building', messages: [...prev.messages, data.message] }));
            } else if (data.step === 'saving') {
              setStatus(prev => ({ ...prev, step: 'saving', messages: [...prev.messages, data.message] }));
            } else if (data.step === 'done') {
              setStatus(prev => ({
                ...prev,
                step: 'done',
                messages: [...prev.messages, data.message],
                docGUID: data.docGUID,
                docUrl: data.url,
              }));
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err: any) {
      setStatus(prev => ({ ...prev, step: 'error', error: err.message || 'Request failed' }));
    }
  };

  const fileLabel = file
    ? file.name
    : 'Drop your file here, or click to browse';

  const stepIcon = (s: Step) => {
    if (s === 'done') return (
      <svg className="w-5 h-5 text-green-500 inline-block mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
    if (s === 'error') return (
      <svg className="w-5 h-5 text-red-500 inline-block mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#5b2d8e' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">DealHub Doc Builder</h1>
            <p className="text-xs text-gray-500 mt-0.5">Upload a document. Get a DealHub template.</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* File drop zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`
                    relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all
                    ${dragOver
                      ? 'border-purple-500 bg-purple-50'
                      : file
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <svg className="mx-auto w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className={`text-sm font-medium ${file ? 'text-purple-700' : 'text-gray-600'}`}>{fileLabel}</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PNG, or JPG</p>
                </div>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="e.g. MSA Template 2024"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                  style={{ '--tw-ring-color': '#5b2d8e' } as React.CSSProperties}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #5b2d8e33'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">DealHub Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://poc.dealhub.io"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #5b2d8e33'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>

              {/* Version GUID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Version GUID</label>
                <input
                  type="text"
                  value={versionGUID}
                  onChange={e => setVersionGUID(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none transition"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #5b2d8e33'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>

              {/* Playbook GUID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Playbook GUID</label>
                <input
                  type="text"
                  value={playbookGUID}
                  onChange={e => setPlaybookGUID(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none transition"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #5b2d8e33'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>

              {/* Session Cookies */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Session Cookies</label>
                  <CookieGuide />
                </div>
                <textarea
                  value={sessionCookies}
                  onChange={e => setSessionCookies(e.target.value)}
                  placeholder="JSESSIONID=abc123; XSRF-TOKEN=xyz..."
                  required
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none transition resize-none"
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #5b2d8e33'}
                  onBlur={e => e.target.style.boxShadow = ''}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !file}
                className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: isLoading || !file ? '#9b72c1' : '#5b2d8e' }}
                onMouseEnter={e => { if (!isLoading && file) (e.target as HTMLElement).style.backgroundColor = '#4a2275'; }}
                onMouseLeave={e => { if (!isLoading && file) (e.target as HTMLElement).style.backgroundColor = '#5b2d8e'; }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </span>
                ) : 'Create Document'}
              </button>
            </form>
          </div>

          {/* Right: Status Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Status</h2>

            {status.step === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Your document will appear here</p>
                <p className="text-gray-400 text-xs mt-1">Fill out the form and click Create Document</p>
              </div>
            )}

            {(status.step === 'analyzing' || status.step === 'building' || status.step === 'saving') && (
              <div className="flex-1 space-y-4">
                {/* Progress steps */}
                <div className="space-y-2">
                  {[
                    { key: 'analyzing', label: 'Analyzing document with Claude' },
                    { key: 'building', label: 'Building sections' },
                    { key: 'saving', label: 'Saving to DealHub' },
                  ].map(({ key, label }) => {
                    const steps = ['analyzing', 'building', 'saving'];
                    const currentIdx = steps.indexOf(status.step);
                    const thisIdx = steps.indexOf(key);
                    const isDone = thisIdx < currentIdx;
                    const isCurrent = thisIdx === currentIdx;

                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isDone ? 'bg-green-100' : isCurrent ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {isDone ? (
                            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isCurrent ? (
                            <svg className="w-3.5 h-3.5 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                        <span className={`text-sm ${isCurrent ? 'text-gray-900 font-medium' : isDone ? 'text-gray-500' : 'text-gray-400'}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Log messages */}
                <div className="mt-4 bg-gray-50 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
                  {status.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">{msg}</p>
                  ))}
                </div>
              </div>
            )}

            {status.step === 'done' && (
              <div className="flex-1 space-y-4">
                {/* Success header */}
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Document created!</p>
                    <p className="text-xs text-green-600">{docName}</p>
                  </div>
                </div>

                {/* Link */}
                {status.docUrl && (
                  <a
                    href={status.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white justify-center transition-all"
                    style={{ backgroundColor: '#5b2d8e' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4a2275')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#5b2d8e')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in DealHub
                  </a>
                )}

                {/* Log */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 max-h-36 overflow-y-auto">
                  {status.messages.map((msg, i) => (
                    <p key={i} className="text-xs text-gray-600 font-mono">{msg}</p>
                  ))}
                </div>

                {/* Start over */}
                <button
                  onClick={() => {
                    setStatus({ step: 'idle', messages: [] });
                    setFile(null);
                    setDocName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="w-full py-2 px-4 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Start over
                </button>
              </div>
            )}

            {status.step === 'error' && (
              <div className="flex-1 space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-800">Something went wrong</p>
                      <p className="text-xs text-red-600 mt-1 font-mono break-all">{status.error}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStatus({ step: 'idle', messages: [] })}
                  className="w-full py-2 px-4 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
