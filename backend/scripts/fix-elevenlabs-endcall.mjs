const API_KEY = 'bd4264b2671a44f5fa290c7b392a84a81978a1d5576de49311b8d00d6602f1fb';
const AGENT_ID = 'agent_2601kn2fr76jfrcvzf821fj9dnsx';

async function fix() {
  const headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  // Get full config
  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, { headers });
  const agent = await getRes.json();

  // Check tools for end_call
  const tools = agent.conversation_config?.agent?.prompt?.tools || [];
  console.log('Current tools:', tools.map(t => `${t.name || t.type} (${t.type})`).join(', '));

  // Check for system tools
  const builtIn = agent.conversation_config?.agent?.prompt?.built_in_tools || [];
  console.log('Built-in tools:', JSON.stringify(builtIn));

  // Check the prompt for end_call references
  const prompt = agent.conversation_config?.agent?.prompt?.prompt || '';
  console.log('\nPrompt mentions "end" or "hang":', prompt.includes('end_call') || prompt.includes('hang up') || prompt.includes('end the call'));

  // Check first message
  console.log('First message:', agent.conversation_config?.agent?.first_message);

  // Check if there's a max turns or similar
  console.log('\nFull turn config:', JSON.stringify(agent.conversation_config?.turn, null, 2));

  // Now update — remove any end_call tool, add explicit "never hang up" instruction
  const filteredTools = tools.filter(t => t.name !== 'end_call');

  const updateBody = {
    conversation_config: {
      turn: {
        turn_timeout: 30,
        silence_end_call_timeout: 60,
        mode: 'turn',
        speculative_turn: false,  // disable speculative turn detection
      },
      agent: {
        first_message: "Hi there! This is Surf, the AI assistant for SAAS Surface. How can I help you today?",
        prompt: {
          prompt: prompt + '\n\n# CRITICAL: NEVER END THE CALL\n- NEVER hang up or end the call yourself.\n- NEVER use the end_call tool.\n- Always wait for the caller to say goodbye first.\n- After asking a question, WAIT patiently for the response — do not end the call if there is silence.\n- Keep the conversation going until the caller explicitly says they are done.',
          tools: filteredTools,
        },
      },
    },
  };

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updateBody),
  });

  if (res.ok) {
    console.log('\nUpdated successfully!');
    console.log('- Removed end_call tool if present');
    console.log('- Added "never end the call" instruction');
    console.log('- Disabled speculative turn detection');
    console.log('- Turn timeout: 30s, silence end: 60s');
  } else {
    console.error('\nFailed:', res.status, await res.text());
  }
}

fix().catch(err => console.error('Error:', err.message));
