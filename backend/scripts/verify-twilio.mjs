import twilio from 'twilio';

const SID = 'AC4ef2d9f2b1eb14c287c1017b86d89424';
const TOKEN = '627232b169dafe4c4e6a3225f58a1d78';

async function verify() {
  try {
    const client = twilio(SID, TOKEN);

    // 1. Check account
    const account = await client.api.accounts(SID).fetch();
    console.log('Account:', account.friendlyName);
    console.log('Status:', account.status);
    console.log('Type:', account.type);

    // 2. Check balance
    const balance = await client.balance.fetch();
    console.log('Balance:', balance.currency, balance.balance);

    // 3. Check the specific number
    const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: '+12162386665' });
    if (numbers.length > 0) {
      const n = numbers[0];
      console.log('\nNumber:', n.phoneNumber);
      console.log('Voice URL:', n.voiceUrl);
      console.log('Voice capable:', n.capabilities?.voice);
      console.log('Status:', n.status);
    }

    // 4. Try making a test outbound call to verify the number works
    console.log('\nAttempting test outbound call to +13309190037...');
    const call = await client.calls.create({
      from: '+12162386665',
      to: '+13309190037',
      twiml: '<Response><Say voice="Polly.Joanna">Hi, this is Surf. Your voice agent is working correctly. Everything looks good. Goodbye!</Say></Response>',
    });
    console.log('Call initiated! SID:', call.sid, 'Status:', call.status);

  } catch (err) {
    console.error('ERROR:', err.message);
    if (err.code) console.error('Code:', err.code);
    if (err.status) console.error('HTTP Status:', err.status);
  }
}

verify();
