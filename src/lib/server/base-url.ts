export function getDomainFromRequest(req: Request): string {
  try {
    const url = new URL(req.url);
    const forwardedHost = (req.headers.get('x-forwarded-host') || '').trim();
    const host = (req.headers.get('host') || '').trim();
    return (forwardedHost || host || url.hostname || '').toLowerCase();
  } catch {
    return '';
  }
}

export function getBaseUrlFromRequest(req: Request): string {
  try {
    const url = new URL(req.url);
    const proto = (req.headers.get('x-forwarded-proto') || url.protocol || 'https').replace(/:$/, '');
    const domain = getDomainFromRequest(req) || url.hostname;
    return `${proto}://${domain}`;
  } catch {
    return '';
  }
}


