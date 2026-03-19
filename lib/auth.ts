export function validateApiKey(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return isValidKey(authHeader.slice(7).trim());
  }

  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return isValidKey(apiKey);
  }

  return false;
}

function isValidKey(key: string): boolean {
  const validKeys = process.env.API_KEYS?.split(',').map(k => k.trim()) || [];
  return validKeys.length > 0 && validKeys.includes(key);
}
