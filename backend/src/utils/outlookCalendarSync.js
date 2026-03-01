import { query } from '../config/database.js';

const TENANT = 'common';
const AUTH_BASE = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const SCOPES = 'Calendars.ReadWrite offline_access';

function getRedirectUri() {
  const base = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000';
  return `${base}/api/outlook-calendar/callback`;
}

export function getAuthUrl(brandId) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state: brandId,
    response_mode: 'query',
    prompt: 'consent',
  });
  return `${AUTH_BASE}/authorize?${params}`;
}

export async function exchangeCodeForTokens(code) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
      scope: SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshAccessToken(connection) {
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
      scope: SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const tokens = await res.json();

  await query(
    `UPDATE outlook_calendar_connections SET access_token=$1, refresh_token=COALESCE($2, refresh_token), token_expiry=$3 WHERE id=$4`,
    [tokens.access_token, tokens.refresh_token || null, tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null, connection.id]
  );
  return tokens.access_token;
}

async function getAccessToken(connection) {
  if (connection.token_expiry && new Date(connection.token_expiry) > new Date(Date.now() + 60000)) {
    return connection.access_token;
  }
  return refreshAccessToken(connection);
}

export async function getConnectionForBrand(brandId) {
  return (await query(
    `SELECT * FROM outlook_calendar_connections WHERE brand_id = $1 AND is_active = TRUE LIMIT 1`,
    [brandId]
  )).rows[0] || null;
}

export async function saveConnection(brandId, tokens) {
  const existing = await getConnectionForBrand(brandId);
  const expiry = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;
  if (existing) {
    return (await query(
      `UPDATE outlook_calendar_connections SET access_token=$1, refresh_token=COALESCE($2, refresh_token), token_expiry=$3, is_active=TRUE WHERE brand_id=$4 RETURNING *`,
      [tokens.access_token, tokens.refresh_token || null, expiry, brandId]
    )).rows[0];
  }
  return (await query(
    `INSERT INTO outlook_calendar_connections (brand_id, access_token, refresh_token, token_expiry) VALUES ($1,$2,$3,$4) RETURNING *`,
    [brandId, tokens.access_token, tokens.refresh_token || '', expiry]
  )).rows[0];
}

export async function disconnectForBrand(brandId) {
  await query(`UPDATE outlook_calendar_connections SET is_active = FALSE WHERE brand_id = $1`, [brandId]);
}

async function graphGet(accessToken, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function graphPost(accessToken, url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph POST error: ${res.status}`);
  return res.json();
}

export async function syncForBrand(connection) {
  const brandId = connection.brand_id;
  const accessToken = await getAccessToken(connection);

  // Pull events from Outlook
  let url;
  if (connection.delta_link) {
    url = connection.delta_link;
  } else {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    url = `${GRAPH_BASE}/me/calendar/events/delta?$filter=lastModifiedDateTime ge '${since.toISOString()}'&$top=100`;
  }

  let deltaLink = connection.delta_link;
  try {
    let page = await graphGet(accessToken, url);
    while (true) {
      const events = page.value || [];
      for (const event of events) {
        if (event['@removed'] || event.isCancelled) {
          await query(`UPDATE calendar_events SET is_active = FALSE WHERE outlook_event_id = $1`, [event.id]);
          continue;
        }

        const startTime = event.start?.dateTime
          ? new Date(event.start.dateTime + (event.start.timeZone === 'UTC' ? 'Z' : '')).toISOString()
          : null;
        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime + (event.end.timeZone === 'UTC' ? 'Z' : '')).toISOString()
          : null;
        if (!startTime || !endTime) continue;

        const isAllDay = event.isAllDay || false;
        const existing = (await query(`SELECT id FROM calendar_events WHERE outlook_event_id = $1`, [event.id])).rows[0];

        if (existing) {
          await query(
            `UPDATE calendar_events SET title=$1, description=$2, location=$3, start_time=$4, end_time=$5 WHERE outlook_event_id=$6`,
            [event.subject || 'Untitled', event.bodyPreview || null, event.location?.displayName || null, startTime, endTime, event.id]
          );
        } else {
          await query(
            `INSERT INTO calendar_events (brand_id, title, description, location, start_time, end_time, all_day, event_type, outlook_event_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'meeting',$8) ON CONFLICT DO NOTHING`,
            [brandId, event.subject || 'Untitled', event.bodyPreview || null, event.location?.displayName || null,
             startTime, endTime, isAllDay, event.id]
          );
        }
      }

      if (page['@odata.nextLink']) {
        page = await graphGet(accessToken, page['@odata.nextLink']);
      } else {
        deltaLink = page['@odata.deltaLink'] || deltaLink;
        break;
      }
    }
  } catch (err) {
    if (err.message.includes('410') || err.message.includes('syncStateNotFound')) {
      await query(`UPDATE outlook_calendar_connections SET delta_link = NULL WHERE brand_id = $1`, [brandId]);
      return;
    }
    throw err;
  }

  // Push new local events (created in last 24h, not from Google or Outlook)
  const localEvents = (await query(
    `SELECT * FROM calendar_events
     WHERE brand_id = $1 AND google_event_id IS NULL AND outlook_event_id IS NULL
       AND is_active = TRUE AND created_at > NOW() - INTERVAL '24 hours'`,
    [brandId]
  )).rows;

  for (const ev of localEvents) {
    try {
      const resource = {
        subject: ev.title,
        body: ev.description ? { contentType: 'text', content: ev.description } : undefined,
        location: ev.location ? { displayName: ev.location } : undefined,
        start: {
          dateTime: new Date(ev.start_time).toISOString().replace('Z', ''),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(ev.end_time).toISOString().replace('Z', ''),
          timeZone: 'UTC',
        },
        isAllDay: ev.all_day || false,
      };
      const created = await graphPost(accessToken, `${GRAPH_BASE}/me/calendar/events`, resource);
      await query(`UPDATE calendar_events SET outlook_event_id = $1 WHERE id = $2`, [created.id, ev.id]);
    } catch (err) {
      console.error(`Failed to push event ${ev.id} to Outlook:`, err.message);
    }
  }

  await query(
    `UPDATE outlook_calendar_connections SET last_synced_at = NOW(), delta_link = $1 WHERE brand_id = $2`,
    [deltaLink, brandId]
  );
  console.log(`✅ Outlook Calendar synced for brand ${brandId}`);
}
