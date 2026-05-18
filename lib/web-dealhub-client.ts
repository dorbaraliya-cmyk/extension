// DealHub admin API client for use in Next.js server routes (no fs deps).
// Takes session cookies as a raw string (paste from browser DevTools).

function extractCsrf(cookieStr: string): string | null {
  const match = cookieStr.match(/DEALHUB_PLAY_SESSION=([^;]+)/);
  if (!match) return null;
  const jwt = match[1];
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return payload?.data?.csrfToken ?? null;
  } catch { return null; }
}

export class DealHubWebClient {
  private csrf: string | null;

  constructor(private baseUrl: string, private cookies: string) {
    this.csrf = extractCsrf(cookies);
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      headers: { Cookie: this.cookies, Accept: 'application/json, */*' },
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) throw new Error('Session expired — please paste fresh cookies.');
    if (!res.ok) throw new Error(`DealHub ${res.status} on GET ${path}: ${(await res.text()).slice(0, 400)}`);
    return res.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        Cookie: this.cookies,
        'Content-Type': 'application/json',
        Accept: 'application/json, */*',
        Origin: this.baseUrl,
        Referer: this.baseUrl + '/',
        ...(this.csrf ? { 'Csrf-Token': this.csrf } : {}),
      },
      body: JSON.stringify(body),
      redirect: 'manual',
    });
    if (res.status >= 300 && res.status < 400) throw new Error('Session expired — please paste fresh cookies.');
    const text = await res.text();
    if (!res.ok) throw new Error(`DealHub ${res.status} on POST ${path}: ${text.slice(0, 400)}`);
    try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
  }
}
