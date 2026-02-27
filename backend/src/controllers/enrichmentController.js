import { query } from '../config/database.js';
import { getBrandMember } from '../models/brandModel.js';
import { getClientById, updateClient } from '../models/clientModel.js';
import https from 'https';

const httpHead = (url) =>
  new Promise((resolve) => {
    try {
      const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', () => resolve(0));
      req.on('timeout', () => { req.destroy(); resolve(0); });
      req.end();
    } catch {
      resolve(0);
    }
  });

const httpGet = (url) =>
  new Promise((resolve) => {
    try {
      const req = https.get(url, { timeout: 8000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch {
      resolve(null);
    }
  });

export const enrichClient = async (req, res) => {
  try {
    const { brandId, clientId } = req.params;
    const userId = req.user.id;

    await getBrandMember(brandId, userId);

    const client = await getClientById(brandId, clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const updates = {};

    // Extract domain
    let domain = null;
    if (client.website) {
      try {
        domain = new URL(client.website.startsWith('http') ? client.website : `https://${client.website}`).hostname.replace(/^www\./, '');
      } catch { /* ignore */ }
    }
    if (!domain && client.email) {
      const parts = client.email.split('@');
      if (parts.length === 2 && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(parts[1])) {
        domain = parts[1];
      }
    }

    if (domain) {
      // Company logo via Clearbit
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      const status = await httpHead(logoUrl);
      if (status === 200) updates.company_logo_url = logoUrl;

      // Hunter.io enrichment (optional)
      const brandRes = await query('SELECT hunter_api_key FROM brands WHERE id = $1', [brandId]);
      const hunterKey = brandRes.rows[0]?.hunter_api_key;
      if (hunterKey) {
        const hunterData = await httpGet(
          `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(hunterKey)}&limit=1`
        );
        if (hunterData?.data) {
          const person = hunterData.data.emails?.[0];
          if (person?.linkedin) updates.linkedin_url = person.linkedin;
          if (person?.twitter) updates.twitter_url = `https://twitter.com/${person.twitter}`;
        }
      }
    }

    updates.enriched_at = new Date().toISOString();
    const updated = await updateClient(clientId, updates);

    res.json({ success: true, data: { client: updated } });
  } catch (err) {
    console.error('Enrich error:', err);
    res.status(500).json({ success: false, message: 'Enrichment failed' });
  }
};
