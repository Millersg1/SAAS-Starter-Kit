const API_KEY = 'bd4264b2671a44f5fa290c7b392a84a81978a1d5576de49311b8d00d6602f1fb';
const AGENT_ID = 'agent_2601kn2fr76jfrcvzf821fj9dnsx';

async function fix() {
  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  // Get current config to see what's there
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, { headers });
  const agent = await getRes.json();

  console.log('Current conversation config keys:', Object.keys(agent.conversation_config || {}));
  console.log('Current agent config keys:', Object.keys(agent.conversation_config?.agent || {}));

  // Check for timeout/turn settings
  const cc = agent.conversation_config || {};
  console.log('\nTurn settings:', JSON.stringify(cc.turn, null, 2));
  console.log('Conversation settings:', JSON.stringify(cc.conversation, null, 2));
  console.log('Platform settings:', JSON.stringify(agent.platform_settings, null, 2));

  // Update with longer timeouts
  const updateBody = {
    conversation_config: {
      conversation: {
        max_duration_seconds: 600,  // 10 minutes max
        client_events: ['agent_response', 'agent_response_correction', 'user_transcript', 'internal_tentative_agent_response'],
      },
      turn: {
        mode: {
          type: 'turn_based',
          silence_end_call_timeout: 30,  // 30 seconds of silence before hanging up
        },
      },
    },
  };

  const updateRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateBody),
  });

  if (updateRes.ok) {
    console.log('\nTimeout settings updated!');
    console.log('- Max call duration: 600s (10 min)');
    console.log('- Silence timeout: 30s');
  } else {
    const errText = await updateRes.text();
    console.error('\nUpdate failed:', updateRes.status, errText);

    // Try simpler update
    console.log('\nTrying simpler update...');
    const simpleBody = {
      conversation_config: {
        conversation: {
          max_duration_seconds: 600,
        },
      },
    };

    const retryRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(simpleBody),
    });

    if (retryRes.ok) {
      console.log('Simple update succeeded — max duration set to 600s');
    } else {
      console.error('Simple update also failed:', retryRes.status, await retryRes.text());
    }
  }
}

fix().catch(err => console.error('Error:', err.message));
