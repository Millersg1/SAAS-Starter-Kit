import { query } from '../config/database.js';
import { google } from 'googleapis';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000'}/api/google-calendar/callback`
  );
}

export function getAuthUrl(brandId) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: brandId,
    prompt: 'consent',
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getConnectionForBrand(brandId) {
  return (await query(
    `SELECT * FROM google_calendar_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
    [brandId]
  )).rows[0] || null;
}

export async function saveConnection(brandId, tokens) {
  const existing = await getConnectionForBrand(brandId);
  if (existing) {
    return (await query(
      `UPDATE google_calendar_connections SET access_token=$1, refresh_token=COALESCE($2, refresh_token), token_expiry=$3, is_active=TRUE WHERE brand_id=$4 RETURNING *`,
      [tokens.access_token, tokens.refresh_token || null, tokens.expiry_date ? new Date(tokens.expiry_date) : null, brandId]
    )).rows[0];
  }
  return (await query(
    `INSERT INTO google_calendar_connections (brand_id, access_token, refresh_token, token_expiry) VALUES ($1,$2,$3,$4) RETURNING *`,
    [brandId, tokens.access_token, tokens.refresh_token || '', tokens.expiry_date ? new Date(tokens.expiry_date) : null]
  )).rows[0];
}

export async function disconnectForBrand(brandId) {
  await query(`UPDATE google_calendar_connections SET is_active = FALSE WHERE brand_id = $1`, [brandId]);
}

async function getAuthorizedClient(connection) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : null,
  });
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await query(
        `UPDATE google_calendar_connections SET access_token=$1, token_expiry=$2 WHERE brand_id=$3`,
        [tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null, connection.brand_id]
      );
    }
  });
  return oauth2Client;
}

export async function syncForBrand(connection) {
  const brandId = connection.brand_id;
  const auth = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: 'v3', auth });

  const listParams = {
    calendarId: connection.calendar_id || 'primary',
    maxResults: 250,
    singleEvents: true,
  };

  if (connection.sync_token) {
    listParams.syncToken = connection.sync_token;
  } else {
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    listParams.timeMin = timeMin.toISOString();
    listParams.orderBy = 'updated';
  }

  let syncToken = null;
  try {
    const response = await calendar.events.list(listParams);
    const events = response.data.items || [];
    syncToken = response.data.nextSyncToken;

    for (const event of events) {
      if (event.status === 'cancelled') {
        await query(`UPDATE calendar_events SET is_active = FALSE WHERE google_event_id = $1`, [event.id]);
        continue;
      }
      const startTime = event.start?.dateTime || (event.start?.date ? event.start.date + 'T00:00:00' : null);
      const endTime = event.end?.dateTime || (event.end?.date ? event.end.date + 'T00:00:00' : null);
      if (!startTime || !endTime) continue;

      const existing = (await query(`SELECT id FROM calendar_events WHERE google_event_id = $1`, [event.id])).rows[0];
      if (existing) {
        await query(
          `UPDATE calendar_events SET title=$1, description=$2, location=$3, start_time=$4, end_time=$5 WHERE google_event_id=$6`,
          [event.summary || 'Untitled', event.description || null, event.location || null, startTime, endTime, event.id]
        );
      } else {
        await query(
          `INSERT INTO calendar_events (brand_id, title, description, location, start_time, end_time, all_day, event_type, google_event_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'meeting',$8) ON CONFLICT DO NOTHING`,
          [brandId, event.summary || 'Untitled', event.description || null, event.location || null,
           startTime, endTime, !!event.start?.date, event.id]
        );
      }
    }
  } catch (err) {
    if (err.code === 410) {
      // Sync token expired — reset and try again next time
      await query(`UPDATE google_calendar_connections SET sync_token = NULL WHERE brand_id = $1`, [brandId]);
      return;
    }
    throw err;
  }

  // Push new local events (created in last 24h without a google_event_id)
  const localEvents = (await query(
    `SELECT * FROM calendar_events WHERE brand_id = $1 AND google_event_id IS NULL AND is_active = TRUE AND created_at > NOW() - INTERVAL '24 hours'`,
    [brandId]
  )).rows;

  for (const ev of localEvents) {
    try {
      const resource = {
        summary: ev.title,
        description: ev.description || undefined,
        location: ev.location || undefined,
        start: ev.all_day
          ? { date: new Date(ev.start_time).toISOString().slice(0, 10) }
          : { dateTime: new Date(ev.start_time).toISOString() },
        end: ev.all_day
          ? { date: new Date(ev.end_time).toISOString().slice(0, 10) }
          : { dateTime: new Date(ev.end_time).toISOString() },
      };
      const created = await calendar.events.insert({ calendarId: connection.calendar_id || 'primary', requestBody: resource });
      await query(`UPDATE calendar_events SET google_event_id = $1 WHERE id = $2`, [created.data.id, ev.id]);
    } catch (err) {
      console.error(`Failed to push event ${ev.id} to Google:`, err.message);
    }
  }

  await query(
    `UPDATE google_calendar_connections SET last_synced_at = NOW(), sync_token = $1 WHERE brand_id = $2`,
    [syncToken || connection.sync_token, brandId]
  );
  console.log(`✅ Google Calendar synced for brand ${brandId}`);
}
