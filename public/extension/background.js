// DealHub API proxy — uses browser cookies automatically via credentials:'include'
// No cookie reading or passing needed; host_permissions covers *.dealhub.io

function extractCsrf(playSessionValue) {
  if (!playSessionValue) return null;
  try {
    let payload = playSessionValue.split('.')[1];
    if (!payload) return null;
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const data = JSON.parse(atob(payload));
    return data?.data?.csrfToken || data?.csrfToken || null;
  } catch { return null; }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'dh_api_request') return false;

  (async () => {
    try {
      const { baseUrl, method = 'GET', path, body } = msg;

      // Read CSRF from DEALHUB_PLAY_SESSION for mutating requests
      const cookies = await new Promise(r => chrome.cookies.getAll({ url: baseUrl }, r));
      const playSession = cookies.find(c => c.name === 'DEALHUB_PLAY_SESSION')?.value;
      const csrf = extractCsrf(playSession);

      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (csrf && method !== 'GET') headers['Csrf-Token'] = csrf;

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include', // JSESSIONID + DEALHUB_PLAY_SESSION included automatically
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!res.ok && (res.status === 401 || res.status === 403 || (typeof data === 'object' && data?.redirect))) {
        sendResponse({ ok: false, status: res.status, error: 'DealHub session expired — please refresh your DealHub browser tab and try again (no need to re-install the extension).' });
        return;
      }
      sendResponse({ ok: res.ok, status: res.status, data });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message ?? e) });
    }
  })();

  return true; // keep channel open for async sendResponse
});
