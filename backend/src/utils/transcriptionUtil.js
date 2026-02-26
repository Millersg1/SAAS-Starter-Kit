import { query } from '../config/database.js';
import https from 'https';
import { createWriteStream, unlinkSync, createReadStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export async function transcribeCallRecording(callLogId, recordingUrl, accountSid, authToken) {
  await query(`UPDATE call_logs SET transcription_status = 'processing' WHERE id = $1`, [callLogId]);
  const tmpFile = join(tmpdir(), `rec_${callLogId}.mp3`);

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      await query(`UPDATE call_logs SET transcription_status = 'skipped' WHERE id = $1`, [callLogId]);
      return;
    }

    // Download MP3 from Twilio
    const audioUrl = `${recordingUrl}.mp3`;
    await new Promise((resolve, reject) => {
      const url = new URL(audioUrl);
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const options = {
        hostname: url.hostname,
        path: url.pathname + (url.search || ''),
        headers: { Authorization: `Basic ${basicAuth}` }
      };
      https.get(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (r2) => {
            const stream = createWriteStream(tmpFile);
            r2.pipe(stream);
            stream.on('finish', resolve);
            stream.on('error', reject);
          }).on('error', reject);
        } else {
          const stream = createWriteStream(tmpFile);
          res.pipe(stream);
          stream.on('finish', resolve);
          stream.on('error', reject);
        }
      }).on('error', reject);
    });

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tmpFile),
      model: 'whisper-1',
    });

    await query(
      `UPDATE call_logs SET transcript = $1, transcription_status = 'completed' WHERE id = $2`,
      [transcription.text, callLogId]
    );
    console.log(`✅ Transcription complete for call log ${callLogId}`);
  } catch (err) {
    console.error(`❌ Transcription failed for ${callLogId}:`, err.message);
    await query(`UPDATE call_logs SET transcription_status = 'failed' WHERE id = $1`, [callLogId]);
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}
