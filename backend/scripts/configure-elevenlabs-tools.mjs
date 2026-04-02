/**
 * Configure ElevenLabs agent with webhook tools for lead capture and appointment booking.
 */

const API_KEY = 'bd4264b2671a44f5fa290c7b392a84a81978a1d5576de49311b8d00d6602f1fb';
const AGENT_ID = 'agent_2601kn2fr76jfrcvzf821fj9dnsx';
const BASE_URL = 'https://api.saassurface.com/api/surf/elevenlabs';

async function configure() {
  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  // 1. Get current agent config
  console.log('Fetching current agent config...');
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, { headers });
  if (!getRes.ok) {
    console.error('Failed to get agent:', getRes.status, await getRes.text());
    return;
  }
  const agent = await getRes.json();
  console.log('Agent:', agent.name);

  // 2. Update agent with tools
  console.log('\nAdding tools to agent...');

  const tools = [
    {
      type: 'webhook',
      name: 'capture_lead',
      description: 'REQUIRED: You MUST call this function the moment a caller tells you their name, email, or phone number. Call it immediately — do not wait until the end of the call. Call it multiple times if they give info at different points.',
      api_schema: {
        url: `${BASE_URL}/capture-lead`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        request_body_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Caller full name' },
            email: { type: 'string', description: 'Caller email address' },
            phone: { type: 'string', description: 'Caller phone number' },
            interest: { type: 'string', description: 'What the caller is interested in' },
          },
          required: ['name'],
        },
      },
    },
    {
      type: 'webhook',
      name: 'book_appointment',
      description: 'REQUIRED: You MUST call this function when a caller wants to schedule a meeting, appointment, callback, or consultation. Call it as soon as they agree to schedule.',
      api_schema: {
        url: `${BASE_URL}/book-appointment`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        request_body_schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Caller name' },
            email: { type: 'string', description: 'Caller email' },
            preferred_date: { type: 'string', description: 'Preferred date (e.g. tomorrow, next Monday)' },
            preferred_time: { type: 'string', description: 'Preferred time (e.g. 2pm, morning)' },
            reason: { type: 'string', description: 'Reason for appointment' },
          },
          required: ['name', 'reason'],
        },
      },
    },
  ];

  const updateBody = {
    conversation_config: {
      agent: {
        prompt: {
          tools,
        },
      },
    },
  };

  const updateRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateBody),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    console.error('Failed to update agent:', updateRes.status, errText);

    // Try alternative format with tool_ids approach
    console.log('\nTrying alternative: creating tools first...');

    for (const tool of tools) {
      console.log(`Creating tool: ${tool.name}...`);
      const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/tools', {
        method: 'POST',
        headers,
        body: JSON.stringify(tool),
      });
      if (createRes.ok) {
        const created = await createRes.json();
        console.log(`  Created: ${created.tool_id || created.id || JSON.stringify(created)}`);
      } else {
        console.log(`  Failed:`, createRes.status, await createRes.text());
      }
    }
    return;
  }

  const updated = await updateRes.json();
  console.log('Agent updated successfully!');
  console.log('Tools configured:', tools.map(t => t.name).join(', '));

  // 3. Set up post-call webhook
  console.log('\nSetting up post-call webhook...');
  const webhookBody = {
    platform_settings: {
      post_call_webhook: {
        url: `${BASE_URL}/post-call`,
      },
    },
  };

  const webhookRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(webhookBody),
  });

  if (webhookRes.ok) {
    console.log('Post-call webhook configured!');
  } else {
    console.log('Post-call webhook failed:', webhookRes.status, await webhookRes.text());
  }

  console.log('\nDone! Surf now captures leads and books appointments during calls.');
}

configure().catch(err => console.error('Error:', err.message));
