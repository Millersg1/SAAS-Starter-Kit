import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const SID = 'AC4ef2d9f2b1eb14c287c1017b86d89424';
const TOKEN = '627232b169dafe4c4e6a3225f58a1d78';
const PHONE = '+12162386665';
const WEBHOOK_URL = 'https://api.saassurface.com/api/voice-agents/incoming-call';

const client = twilio(SID, TOKEN);

async function configure() {
  // Find the phone number
  const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: PHONE });

  if (numbers.length === 0) {
    console.error('Phone number not found in this Twilio account:', PHONE);
    // List all numbers
    const all = await client.incomingPhoneNumbers.list({ limit: 10 });
    console.log('Available numbers:', all.map(n => n.phoneNumber).join(', '));
    process.exit(1);
  }

  const number = numbers[0];
  console.log('Found number:', number.phoneNumber, '(SID:', number.sid + ')');
  console.log('Current voice URL:', number.voiceUrl || 'NOT SET');

  // Update webhook URLs
  await client.incomingPhoneNumbers(number.sid).update({
    voiceUrl: WEBHOOK_URL,
    voiceMethod: 'POST',
    statusCallback: WEBHOOK_URL.replace('incoming-call', 'status-callback'),
    statusCallbackMethod: 'POST',
  });

  console.log('Updated voice URL to:', WEBHOOK_URL);
  console.log('Surf Voice is now answering calls on', PHONE);
}

configure().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
