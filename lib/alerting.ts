/**
 * Enterprise Alerting System
 * Sends critical infrastructure alerts to Telegram
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram alerting not configured - skipping alert');
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram alert failed:', error);
    } else {
      console.log('✅ Telegram alert sent successfully');
    }
  } catch (error) {
    // Graceful degradation - alerting failure should never crash the app
    console.error('Telegram alert error:', error instanceof Error ? error.message : 'Unknown error');
  }
}
