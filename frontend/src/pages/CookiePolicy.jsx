import SEO from '../components/SEO';

export default function CookiePolicy() {
  return (
    <div style={{ fontFamily: 'Arial, system-ui, -apple-system, Segoe UI, Roboto', margin: 0, background: '#f7f8fb', color: '#0b1220', minHeight: '100vh' }}>
      <SEO title="Cookie Policy" description="How SAAS Surface uses cookies and similar tracking technologies." url="https://saassurface.com/cookie-policy" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: 22 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Cookie Policy</h1>
              <div style={{ color: '#5b6478' }}>Effective date: February 21, 2026</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#eef6ff', color: '#0b3b77', border: '1px solid #d7e9ff' }}>
              SAAS Surface
            </div>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />

          <p style={{ lineHeight: 1.55 }}>This Cookie Policy explains how <strong>Faith Harbor LLC</strong> uses cookies and similar technologies on <strong>SAAS Surface</strong> (https://saassurface.com).</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>What Are Cookies?</h2>
          <p style={{ lineHeight: 1.55 }}>Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and understand how you use it.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Types of Cookies We Use</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Essential Cookies:</strong> Required for the platform to function. These include session tokens and authentication cookies that keep you logged in. These cannot be disabled.</li>
            <li><strong>Preference Cookies:</strong> Remember your settings and preferences (such as theme or language) so you don't have to re-enter them each visit.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors use the platform so we can improve it. Data collected is aggregated and anonymous.</li>
            <li><strong>Security Cookies:</strong> Used to detect and prevent fraudulent activity and protect the integrity of the platform.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Third-Party Cookies</h2>
          <p style={{ lineHeight: 1.55 }}>We use third-party services that may set their own cookies, including:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Stripe</strong> — for payment processing</li>
            <li><strong>Analytics providers</strong> — for usage reporting</li>
          </ul>
          <p style={{ lineHeight: 1.55 }}>These third parties have their own privacy and cookie policies which we encourage you to review.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Managing Cookies</h2>
          <p style={{ lineHeight: 1.55 }}>You can control and delete cookies through your browser settings. Please note that disabling essential cookies will affect the functionality of the platform and you may not be able to log in or use core features.</p>
          <p style={{ lineHeight: 1.55 }}>Common browser cookie settings:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
            <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong>Edge:</strong> Settings → Privacy, Search, and Services → Cookies</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>GDPR &amp; CCPA</h2>
          <p style={{ lineHeight: 1.55 }}>If you are located in the EEA, UK, or California, you have additional rights regarding cookies and tracking technologies. You may opt out of non-essential cookies at any time by adjusting your browser settings or contacting us at <a href="mailto:privacy@saassurface.com" style={{ color: '#2f8cff' }}>privacy@saassurface.com</a>.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Contact</h2>
          <p style={{ lineHeight: 1.55 }}>For questions about our use of cookies, contact us at <a href="mailto:privacy@saassurface.com" style={{ color: '#2f8cff' }}>privacy@saassurface.com</a>.</p>

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
