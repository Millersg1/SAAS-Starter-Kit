export default function ServiceLevelAgreement() {
  return (
    <div style={{ fontFamily: 'Arial, system-ui, -apple-system, Segoe UI, Roboto', margin: 0, background: '#f7f8fb', color: '#0b1220', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: 22 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Service Level Agreement</h1>
              <div style={{ color: '#5b6478' }}>Effective date: February 21, 2026</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#eef6ff', color: '#0b3b77', border: '1px solid #d7e9ff' }}>
              Faith Harbor Client Hub
            </div>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />

          <p style={{ lineHeight: 1.55 }}>This Service Level Agreement ("SLA") describes the service commitments made by <strong>Faith Harbor LLC</strong> to subscribers of <strong>Faith Harbor Client Hub</strong>. This SLA forms part of the Terms of Service.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Uptime Commitment</h2>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC commits to a <strong>99% monthly uptime</strong> for the Faith Harbor Client Hub platform. This allows for approximately 7.3 hours of downtime per month.</p>
          <p style={{ lineHeight: 1.55 }}>Uptime is calculated as:</p>
          <div style={{ background: '#f7f8fb', border: '1px solid #e6e8ee', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', margin: '10px 0' }}>
            Uptime % = ((Total minutes in month − Downtime minutes) / Total minutes in month) × 100
          </div>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Exclusions</h2>
          <p style={{ lineHeight: 1.55 }}>The uptime commitment does not apply to downtime caused by:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Scheduled maintenance (announced in advance when possible)</li>
            <li>Events beyond our reasonable control (force majeure)</li>
            <li>Third-party service failures (e.g. Stripe, email providers, DNS)</li>
            <li>User actions, misuse, or violations of our Terms of Service</li>
            <li>Issues arising from the user's own internet connection or device</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Scheduled Maintenance</h2>
          <p style={{ lineHeight: 1.55 }}>We aim to perform scheduled maintenance during off-peak hours. Where maintenance is expected to cause significant downtime, we will provide advance notice by email where possible.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Support Response Times</h2>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC commits to responding to support requests within <strong>72 hours</strong> on business days (Monday–Friday, excluding US public holidays).</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>General support:</strong> Response within 72 hours</li>
            <li><strong>Billing issues:</strong> Response within 72 hours</li>
            <li><strong>Security incidents:</strong> Acknowledged within 24 hours</li>
          </ul>
          <p style={{ lineHeight: 1.55 }}>To contact support, email <a href="mailto:support@faithharborclienthub.com" style={{ color: '#2f8cff' }}>support@faithharborclienthub.com</a>.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Incident Communication</h2>
          <p style={{ lineHeight: 1.55 }}>In the event of a significant service disruption, Faith Harbor LLC will communicate status updates via email to affected account holders as promptly as possible.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>SLA Credits</h2>
          <p style={{ lineHeight: 1.55 }}>If we fail to meet the 99% uptime commitment in a given calendar month, affected subscribers may request a service credit equal to one day of their pro-rated subscription fee for each hour of excess downtime, up to a maximum of 30% of that month's subscription fee.</p>
          <p style={{ lineHeight: 1.55 }}>To request a credit, email <a href="mailto:support@faithharborclienthub.com" style={{ color: '#2f8cff' }}>support@faithharborclienthub.com</a> within 30 days of the incident with details of the outage. Credits are applied to future invoices and are not redeemable for cash.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Limitations</h2>
          <p style={{ lineHeight: 1.55 }}>SLA credits are the sole and exclusive remedy for any failure by Faith Harbor LLC to meet the uptime commitment. This SLA does not modify or supersede the limitation of liability provisions in our Terms of Service.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Contact</h2>
          <p style={{ lineHeight: 1.55 }}>For SLA inquiries, contact us at <a href="mailto:support@faithharborclienthub.com" style={{ color: '#2f8cff' }}>support@faithharborclienthub.com</a>.</p>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />
          <div style={{ color: '#5b6478', fontSize: 12 }}>
            Contact: Faith Harbor LLC • 815 Superior Ave East • Suite 1618 • Cleveland, OH, 44114 • United States •{' '}
            Email: <a href="mailto:support@faithharborclienthub.com" style={{ color: '#2f8cff' }}>support@faithharborclienthub.com</a>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />
          <div style={{ color: '#5b6478', fontSize: 12 }}>
            <strong>Legal Disclaimer:</strong> Faith Harbor Legal Pages provides informational templates for educational purposes only.
            We are not a law firm and do not provide legal advice. Review with qualified counsel for your jurisdiction.
          </div>

        </div>
      </div>
    </div>
  );
}
