// Start of Selection
/**
 * Enforce canonical host and HTTPS:
 * - Redirect any non-https or non-kirilleer.com host to https://kirilleer.com
 * - Preserve path and query string
 * - Skip in dev mode
 */
export const onRequest = async (context: any, next: any) => {
  // Skip in dev mode
  if (import.meta.env.DEV) {
    return next();
  }

  const url = new URL(context.request.url);

  const desiredHost = 'kirilleer.com';
  const isHttps = url.protocol === 'https:';
  const isCorrectHost = url.hostname.toLowerCase() === desiredHost;

  if (!isHttps || !isCorrectHost) {
    url.protocol = 'https:';
    url.hostname = desiredHost;
    return new Response(null, {
      status: 301,
      headers: { Location: url.toString() }
    });
  }

  return next();
}
