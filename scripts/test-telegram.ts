#!/usr/bin/env tsx

/**
 * Test Telegram Alerting System
 */

import { sendTelegramAlert } from '../lib/alerting';

async function testTelegramAlert() {
  console.log('🧪 Testing Telegram Alert System...\n');

  try {
    console.log('Sending test alert...');
    await sendTelegramAlert(
      '🧪 <b>VibeGuard Test Alert</b>\n\n' +
      'This is a test message from the alerting system.\n' +
      'Timestamp: ' + new Date().toISOString()
    );
    
    console.log('\n✅ Test completed! Check your Telegram for the message.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTelegramAlert();
