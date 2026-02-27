// OAuth initiation — redirects the browser to GitHub's authorization page.
// Vercel serves this at GET /api/auth
export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `https://bs.ladebuid.com/api/auth/callback`,
    scope: 'repo,user',
    state: Math.random().toString(36).slice(2),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
