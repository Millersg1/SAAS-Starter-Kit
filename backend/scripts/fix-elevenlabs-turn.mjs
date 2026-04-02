const API_KEY = 'bd4264b2671a44f5fa290c7b392a84a81978a1d5576de49311b8d00d6602f1fb';
const AGENT_ID = 'agent_2601kn2fr76jfrcvzf821fj9dnsx';

async function fix() {
  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  // First get current settings to see everything
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, { headers });
  const agent = await getRes.json();

  console.log('Current turn:', JSON.stringify(agent.conversation_config?.turn, null, 2));
  console.log('Current VAD:', JSON.stringify(agent.conversation_config?.vad, null, 2));
  console.log('Current max_conversation_duration_message:', agent.conversation_config?.agent?.max_conversation_duration_message);

  // Update with very generous timeouts
  const updateBody = {
    conversation_config: {
      turn: {
        turn_timeout: 30,
        silence_end_call_timeout: 60,
        mode: 'turn',
      },
      agent: {
        max_conversation_duration_message: "I need to wrap up now, but our team will follow up with you. Thanks for calling SAAS Surface!",
      },
    },
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateBody),
  });

  if (res.ok) {
    console.log('\nSettings updated:');
    console.log('- Turn timeout: 30s');
    console.log('- Silence end call: 60s');
  } else {
    console.error('\nFailed:', res.status, await res.text());
  }
}

fix().catch(err => console.error('Error:', err.message));
