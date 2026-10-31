const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function testGeminiFast() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const targetModel = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-lite-latest';

  console.log('================================================================');
  console.log('     DevTrace AI — Google Gemini Live Connectivity Test        ');
  console.log('================================================================');

  if (!apiKey) {
    console.error('✗ No GEMINI_API_KEY in .env');
    process.exit(1);
  }

  console.log(`[1] Found Key: ${apiKey.slice(0, 15)}...`);
  console.log(`[2] Active Model: ${targetModel}`);
  console.log(`[3] Sending request to Google Gemini API...`);

  const start = Date.now();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "Hello, DevTrace AI is live!" in 6 words.' }] }],
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`\n🎉 SUCCESS! Gemini responded in ${elapsed} seconds:`);
      console.log('----------------------------------------------------------------');
      console.log('Gemini Live Response:');
      console.log(text?.trim());
      console.log('----------------------------------------------------------------');
      console.log('✓ Your Google Gemini API key is 100% active, fast, and working!');
    } else {
      const err = await res.text();
      console.log(`\n✗ HTTP ${res.status} (${elapsed}s): ${err}`);
    }
  } catch (e) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n✗ Error after ${elapsed}s: ${e.message}`);
  }
}

testGeminiFast();
