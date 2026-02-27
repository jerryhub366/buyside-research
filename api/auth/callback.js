// OAuth callback — GitHub redirects here after the user authorizes.
// Uses the two-step postMessage handshake Decap CMS expects:
//   1. popup → parent : "authorizing:github"
//   2. parent → popup : "authorizing:github"   (Decap replies to confirm)
//   3. popup → parent : "authorization:github:success:{token:...}"
// A 500ms fallback fires if the parent never replies (safety net).
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return sendScript(res, 'error', { error: error || 'missing code' });
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
      return sendScript(res, 'error', { error: data.error_description || 'token exchange failed' });
    }

    return sendScript(res, 'success', { token: data.access_token, provider: 'github' });
  } catch (err) {
    return sendScript(res, 'error', { error: err.message });
  }
}

function sendScript(res, status, content) {
  // Escape the JSON so it's safe inside a JS string literal
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const escaped = message.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  res.setHeader('Content-Type', 'text/html');
  res.end(`<!DOCTYPE html><html><body><script>
  (function () {
    var msg = '${escaped}';

    function send(origin) {
      window.opener.postMessage(msg, origin || '*');
      window.close();
    }

    if (!window.opener) {
      // Opener was cleared (cross-origin navigation in some browsers).
      // Nothing we can do — show a manual close prompt.
      document.write('<p>Authorization complete. You may close this window.</p>');
      return;
    }

    // Step 1: announce to Decap CMS that we are about to send credentials.
    window.opener.postMessage('authorizing:github', '*');

    // Step 2: wait for Decap CMS to echo back, then reply with the token.
    window.addEventListener('message', function (e) {
      if (e.data === 'authorizing:github') {
        send(e.origin);
      }
    });

    // Fallback: if Decap CMS doesn't reply within 800ms, send anyway.
    setTimeout(function () { send('*'); }, 800);
  })();
  <\/script></body></html>`);
}
