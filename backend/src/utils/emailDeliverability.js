import dns from 'dns';
import { promisify } from 'util';
import { query } from '../config/database.js';

const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

/**
 * Email deliverability utilities:
 * - SPF/DKIM/DMARC validation
 * - Bounce handling
 * - Suppression list management
 */

/**
 * Check SPF, DKIM, DMARC records for a domain.
 */
export async function checkDomainHealth(domain) {
  const results = { spf: false, dkim: false, dmarc: false, mx: false, issues: [] };

  try {
    // Check MX records
    const mx = await resolveMx(domain).catch(() => []);
    results.mx = mx.length > 0;
    if (!results.mx) results.issues.push('No MX records found — domain cannot receive email.');

    // Check SPF
    const txtRecords = await resolveTxt(domain).catch(() => []);
    const spf = txtRecords.flat().find(r => r.startsWith('v=spf1'));
    results.spf = !!spf;
    if (!spf) {
      results.issues.push('Missing SPF record. Add: v=spf1 include:_spf.yourmailprovider.com ~all');
    }

    // Check DMARC
    const dmarcRecords = await resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const dmarc = dmarcRecords.flat().find(r => r.startsWith('v=DMARC1'));
    results.dmarc = !!dmarc;
    if (!dmarc) {
      results.issues.push('Missing DMARC record. Add TXT record at _dmarc.yourdomain.com: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com');
    }

    // Check DKIM (common selectors)
    const selectors = ['default', 'google', 'selector1', 'selector2', 'k1', 'dkim'];
    for (const sel of selectors) {
      const dkimRecords = await resolveTxt(`${sel}._domainkey.${domain}`).catch(() => []);
      if (dkimRecords.length > 0) {
        results.dkim = true;
        results.dkim_selector = sel;
        break;
      }
    }
    if (!results.dkim) {
      results.issues.push('No DKIM record found. Configure DKIM signing with your email provider.');
    }

    results.score = [results.spf, results.dkim, results.dmarc, results.mx].filter(Boolean).length;
    results.max_score = 4;
    results.grade = results.score >= 4 ? 'A' : results.score >= 3 ? 'B' : results.score >= 2 ? 'C' : 'F';
  } catch (err) {
    results.error = err.message;
  }

  return results;
}

/**
 * Record an email bounce.
 */
export async function recordBounce(brandId, email, bounceType, reason) {
  try {
    await query(
      `INSERT INTO email_bounces (brand_id, email, bounce_type, reason) VALUES ($1, $2, $3, $4)`,
      [brandId, email, bounceType, reason]
    );

    // After 3 hard bounces, add to suppression list
    if (bounceType === 'hard') {
      const count = await query(
        `SELECT COUNT(*)::int AS cnt FROM email_bounces WHERE email = $1 AND bounce_type = 'hard'`,
        [email]
      );
      if (count.rows[0].cnt >= 3) {
        await addToSuppressionList(email, 'hard_bounce');
      }
    }
  } catch (err) {
    console.error('[Deliverability] Record bounce error:', err.message);
  }
}

/**
 * Record a spam complaint.
 */
export async function recordComplaint(brandId, email) {
  await recordBounce(brandId, email, 'complaint', 'Spam complaint');
  await addToSuppressionList(email, 'complaint');
}

/**
 * Add email to suppression list.
 */
async function addToSuppressionList(email, reason) {
  try {
    await query(
      `INSERT INTO email_bounces (email, bounce_type, reason)
       VALUES ($1, 'suppressed', $2)
       ON CONFLICT DO NOTHING`,
      [email, `Suppressed: ${reason}`]
    );
  } catch (err) {
    console.error('[Deliverability] Suppression error:', err.message);
  }
}

/**
 * Check if an email is on the suppression list.
 */
export async function isEmailSuppressed(email) {
  const result = await query(
    `SELECT COUNT(*)::int AS cnt FROM email_bounces
     WHERE email = $1 AND bounce_type IN ('suppressed', 'complaint')`,
    [email]
  );
  return result.rows[0].cnt > 0;
}

/**
 * Get bounce statistics for a brand.
 */
export async function getBounceStats(brandId) {
  const result = await query(
    `SELECT bounce_type, COUNT(*)::int AS count
     FROM email_bounces WHERE brand_id = $1
     GROUP BY bounce_type`,
    [brandId]
  );
  return result.rows;
}
