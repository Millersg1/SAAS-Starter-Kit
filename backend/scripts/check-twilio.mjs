import twilio from 'twilio';

const SID = 'AC4ef2d9f2b1eb14c287c1017b86d89424';
const TOKEN = '627232b169dafe4c4e6a3225f58a1d78';
const client = twilio(SID, TOKEN);

async function check() {
  // List all phone numbers
  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });

  if (numbers.length === 0) {
    console.log('NO PHONE NUMBERS found in this Twilio account.');
    console.log('You need to buy a number at https://console.twilio.com/');
    return;
  }

  console.log(`Found ${numbers.length} number(s):\n`);
  for (const n of numbers) {
    console.log(`Phone: ${n.phoneNumber}`);
    console.log(`  Friendly Name: ${n.friendlyName}`);
    console.log(`  SID: ${n.sid}`);
    console.log(`  Voice URL: ${n.voiceUrl || 'NOT SET'}`);
    console.log(`  SMS URL: ${n.smsUrl || 'NOT SET'}`);
    console.log(`  Status: ${n.status || 'unknown'}`);
    console.log(`  Capabilities: Voice=${n.capabilities?.voice}, SMS=${n.capabilities?.sms}`);
    console.log('');
  }

  // Check account status
  const account = await client.api.accounts(SID).fetch();
  console.log('Account Status:', account.status);
  console.log('Account Type:', account.type);
  console.log('Account Name:', account.friendlyName);
}

check().catch(err => console.error('Error:', err.message));
