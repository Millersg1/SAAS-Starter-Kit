import SEO from '../components/SEO';

export default function SecurityPolicy() {
  return (
    <div style={{ fontFamily: 'Arial, system-ui, -apple-system, Segoe UI, Roboto', margin: 0, background: '#f7f8fb', color: '#0b1220', minHeight: '100vh' }}>
      <SEO title="Security Policy" description="How SAAS Surface protects your data with enterprise-grade security measures." url="https://saassurface.com/security-policy" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: 22 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Security Policy</h1>
              <div style={{ color: '#5b6478' }}>Effective date: February 21, 2026</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#eef6ff', color: '#0b3b77', border: '1px solid #d7e9ff' }}>
              SAAS Surface
            </div>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />

          <p style={{ lineHeight: 1.55 }}>At <strong>Faith Harbor LLC</strong>, we take the security of your data seriously. This Security Policy describes the measures we take to protect the information stored and processed through <strong>SAAS Surface</strong>.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Data Encryption</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>All data transmitted between your browser and our servers is encrypted using TLS (Transport Layer Security).</li>
            <li>Passwords are hashed using industry-standard algorithms and are never stored in plain text.</li>
            <li>Sensitive data at rest is protected through server-level encryption.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Authentication &amp; Access Control</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>User accounts are protected by password authentication with enforced complexity requirements.</li>
            <li>Two-factor authentication (2FA) is available and recommended for all agency accounts.</li>
            <li>Session tokens expire automatically after a period of inactivity.</li>
            <li>Access to client data is strictly scoped — users can only access data belonging to their brand.</li>
            <li>Client portal access is separately authenticated and isolated from agency accounts.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Payment Security</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>All payment processing is handled by <strong>Stripe</strong>, a PCI DSS compliant payment processor.</li>
            <li>Faith Harbor LLC does not store full credit card numbers or sensitive payment card data.</li>
            <li>Payment links are generated with unique tokens and expire after use.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Infrastructure Security</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Our servers are hosted in secure data centers with physical access controls.</li>
            <li>Regular software updates and security patches are applied to all systems.</li>
            <li>Rate limiting is applied to all API endpoints to prevent abuse and brute-force attacks.</li>
            <li>Audit logs record all significant account actions for security review.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Data Backup</h2>
          <p style={{ lineHeight: 1.55 }}>Database backups are performed regularly to protect against data loss. Backups are stored securely and tested periodically.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Incident Response</h2>
          <p style={{ lineHeight: 1.55 }}>In the event of a security incident or data breach, Faith Harbor LLC will:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Investigate and contain the incident promptly.</li>
            <li>Notify affected users as required by applicable law.</li>
            <li>Take corrective action to prevent recurrence.</li>
            <li>Cooperate with regulatory authorities as required.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Your Responsibilities</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Use a strong, unique password for your account.</li>
            <li>Enable two-factor authentication where available.</li>
            <li>Do not share your account credentials with others.</li>
            <li>Log out of your account when using shared devices.</li>
            <li>Report any suspicious activity to us immediately.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Reporting Security Vulnerabilities</h2>
          <p style={{ lineHeight: 1.55 }}>If you discover a security vulnerability in our platform, please report it responsibly to <a href="mailto:support@saassurface.com" style={{ color: '#2f8cff' }}>support@saassurface.com</a>. We take all reports seriously and will respond promptly.</p>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />
          <div style={{ color: '#5b6478', fontSize: 12 }}>
            Contact: Faith Harbor LLC • 815 Superior Ave East • Suite 1618 • Cleveland, OH, 44114 • United States •{' '}
            Email: <a href="mailto:support@saassurface.com" style={{ color: '#2f8cff' }}>support@saassurface.com</a>
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
