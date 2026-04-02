const API_KEY = 'bd4264b2671a44f5fa290c7b392a84a81978a1d5576de49311b8d00d6602f1fb';

async function findVoice() {
  // Verify key works
  const profileRes = await fetch('https://api.elevenlabs.io/v1/user', {
    headers: { 'xi-api-key': API_KEY },
  });

  if (!profileRes.ok) {
    console.error('API key invalid:', profileRes.status, await profileRes.text());
    return;
  }

  const profile = await profileRes.json();
  console.log('Account:', profile.subscription?.tier || 'unknown');
  console.log('Characters remaining:', profile.subscription?.character_count, '/', profile.subscription?.character_limit);
  console.log('');

  // Get all available voices
  const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': API_KEY },
  });
  const { voices } = await voicesRes.json();

  console.log(`Found ${voices.length} voices. Filtering for Surf...\n`);

  // Score voices for Surf's personality: professional, warm, confident, not robotic
  const ideal = [];

  for (const v of voices) {
    const labels = v.labels || {};
    const name = v.name || '';
    const desc = (v.description || '').toLowerCase();
    const accent = labels.accent || '';
    const gender = labels.gender || '';
    const age = labels.age || '';
    const useCase = labels.use_case || labels['use case'] || '';

    let score = 0;

    // Prefer female voices for assistant (warm, approachable)
    if (gender === 'female') score += 2;

    // American accent
    if (accent === 'american' || accent === 'American') score += 3;

    // Young to middle aged
    if (age === 'young' || age === 'middle aged' || age === 'middle-aged') score += 2;

    // Professional use cases
    if (useCase.includes('narration') || useCase.includes('assistant') || useCase.includes('conversational')) score += 3;
    if (desc.includes('professional') || desc.includes('warm') || desc.includes('friendly')) score += 2;
    if (desc.includes('confident') || desc.includes('clear') || desc.includes('natural')) score += 1;

    // Avoid characters/gaming/animation voices
    if (useCase.includes('characters') || useCase.includes('gaming') || desc.includes('cartoon')) score -= 3;
    if (desc.includes('raspy') || desc.includes('deep') || desc.includes('old')) score -= 1;

    if (score >= 4) {
      ideal.push({ name: v.name, id: v.voice_id, score, gender, accent, age, useCase, preview: v.preview_url });
    }
  }

  // Sort by score
  ideal.sort((a, b) => b.score - a.score);

  console.log('Top voices for Surf:\n');
  for (const v of ideal.slice(0, 10)) {
    console.log(`${v.score}pts | ${v.name} (${v.id})`);
    console.log(`       ${v.gender} | ${v.accent} | ${v.age} | ${v.useCase}`);
    if (v.preview) console.log(`       Preview: ${v.preview}`);
    console.log('');
  }
}

findVoice().catch(err => console.error('Error:', err.message));
