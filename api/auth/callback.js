// OAuth callback — GitHub redirects here after user authorizes.
// Exchanges the code for an access token, then hands it back to Decap CMS
// via postMessage so the admin panel can proceed.
// Vercel serves this at GET /api/auth/callback
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return sendMessage(res, 'error', { error: error || 'missing code' });
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      return sendMessage(res, 'error', { error: data.error_description || 'token exchange failed' });
    }

    return sendMessage(res, 'success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    return sendMessage(res, 'error', { error: err.message });
  }
}

function sendMessage(res, status, content) {
  const msg = `authorization:github:${status}:${JSON.stringify(content)}`;
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!DOCTYPE html><html><body><script>
    (function() {
      function send() {
        window.opener.postMessage('${msg}', '*');
        window.close();
      }
      if (window.opener) { send(); }
      else { window.addEventListener('load', send); }
    })();
  </script></body></html>`);
}
