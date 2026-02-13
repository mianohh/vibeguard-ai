// Simple API key authentication
export function validateApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return false;
  }

  // Check against environment variable
  const validKeys = process.env.API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}
