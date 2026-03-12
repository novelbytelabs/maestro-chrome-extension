const sensitiveHostnamePattern =
  /(^|\.)((auth|login|signin|account|identity|checkout|billing|pay|bank|wallet|admin|secure|oauth|sso)(\.|$))/i;

const sensitivePathPattern =
  /(^|\/)(login|signin|sign-in|auth|account|identity|checkout|billing|payment|pay|wallet|bank|admin|secure|oauth|sso)(\/|$|\?|#)/i;

const sensitiveQueryPattern = /(^|[?&])(login|signin|sign-in|auth|account|identity|checkout|billing|payment|pay|wallet|bank|admin|secure|oauth|sso)(=|&|$)/i;

export function isSensitiveUrl(raw: string | undefined | null): boolean {
  if (!raw) {
    return false;
  }

  try {
    const url = new URL(raw);
    return (
      sensitiveHostnamePattern.test(url.hostname) ||
      sensitivePathPattern.test(url.pathname) ||
      sensitiveQueryPattern.test(url.search)
    );
  } catch (_error) {
    return false;
  }
}
