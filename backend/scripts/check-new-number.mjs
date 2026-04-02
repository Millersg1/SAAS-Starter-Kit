import twilio from 'twilio';

const SID = 'AC4ef2d9f2b1eb14c287c1017b86d89424';
const TOKEN = '627232b169dafe4c4e6a3225f58a1d78';
const client = twilio(SID, TOKEN);

async function check() {
  // Check the new number
  const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: '+18666516660' });

  if (numbers.length === 0) {
    console.log('NUMBER NOT FOUND in this Twilio account!');
    console.log('It may not be purchased yet or is on a different account.');
    console.log('\nAll numbers on this account:');
    const all = await client.incomingPhoneNumbers.list({ limit: 20 });
    for (const n of all) {
      console.log(`  ${n.phoneNumber} — ${n.friendlyName} (${n.status})`);
    }
    return;
  }

  const n = numbers[0];
  console.log('Phone:', n.phoneNumber);
  console.log('Friendly Name:', n.friendlyName);
  console.log('SID:', n.sid);
  console.log('Status:', n.status);
  console.log('Voice URL:', n.voiceUrl);
  console.log('Voice Method:', n.voiceMethod);
  console.log('Voice Capable:', n.capabilities?.voice);
  console.log('SMS Capable:', n.capabilities?.sms);
  console.log('Date Created:', n.dateCreated);

  // Check call logs for this number
  console.log('\nRecent calls to/from this number:');
  const calls = await client.calls.list({ to: '+18666516660', limit: 5 });
  const calls2 = await client.calls.list({ from: '+18666516660', limit: 5 });
  for (const c of [...calls, ...calls2]) {
    console.log(`  ${c.direction} | ${c.from} → ${c.to} | ${c.status} | ${c.startTime}`);
  }

  if (calls.length === 0 && calls2.length === 0) {
    console.log('  (no calls found)');
  }
}

check().catch(err => console.error('Error:', err.message));
