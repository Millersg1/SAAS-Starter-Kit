export default function DataProcessingAgreement() {
  return (
    <div style={{ fontFamily: 'Arial, system-ui, -apple-system, Segoe UI, Roboto', margin: 0, background: '#f7f8fb', color: '#0b1220', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: 22 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Data Processing Agreement</h1>
              <div style={{ color: '#5b6478' }}>Effective date: February 21, 2026</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#eef6ff', color: '#0b3b77', border: '1px solid #d7e9ff' }}>
              SAAS Surface
            </div>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />

          <p style={{ lineHeight: 1.55 }}>This Data Processing Agreement ("DPA") is entered into between <strong>Faith Harbor LLC</strong> ("Processor") and the agency or business ("Controller") using <strong>SAAS Surface</strong>. This DPA forms part of the Terms of Service and applies where the Controller processes personal data of EU/EEA/UK data subjects through the platform.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Definitions</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Controller:</strong> The agency or business account holder who determines the purposes and means of processing personal data.</li>
            <li><strong>Processor:</strong> Faith Harbor LLC, which processes personal data on behalf of the Controller.</li>
            <li><strong>Personal Data:</strong> Any information relating to an identified or identifiable natural person.</li>
            <li><strong>Processing:</strong> Any operation performed on personal data, including collection, storage, use, and deletion.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Scope and Purpose</h2>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC processes personal data solely to provide the SAAS Surface platform services as described in the Terms of Service. Processing includes:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Storing client contact information entered by the Controller</li>
            <li>Processing invoice and payment data</li>
            <li>Facilitating client portal access</li>
            <li>Delivering email communications on behalf of the Controller</li>
            <li>Storing documents and project information uploaded by the Controller</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Processor Obligations</h2>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC agrees to:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Process personal data only on documented instructions from the Controller.</li>
            <li>Ensure persons authorized to process personal data are bound by confidentiality obligations.</li>
            <li>Implement appropriate technical and organizational security measures.</li>
            <li>Assist the Controller in responding to data subject rights requests.</li>
            <li>Delete or return all personal data upon termination of the service, at the Controller's choice.</li>
            <li>Provide all necessary information to demonstrate compliance with GDPR obligations.</li>
            <li>Notify the Controller without undue delay upon becoming aware of a personal data breach.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Controller Obligations</h2>
          <p style={{ lineHeight: 1.55 }}>The Controller agrees to:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li>Ensure they have a lawful basis for processing personal data entered into the platform.</li>
            <li>Obtain necessary consents from data subjects where required.</li>
            <li>Comply with all applicable data protection laws.</li>
            <li>Only instruct Faith Harbor LLC to process personal data in ways that comply with applicable law.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Sub-Processors</h2>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC uses the following sub-processors to provide the service:</p>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Hosting provider</strong> — infrastructure and data storage</li>
            <li><strong>Email service provider</strong> — transactional email delivery</li>
          </ul>
          <p style={{ lineHeight: 1.55 }}>Faith Harbor LLC will notify Controllers of any intended changes to sub-processors and give Controllers the opportunity to object.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Data Retention</h2>
          <p style={{ lineHeight: 1.55 }}>Personal data is retained for the duration of the Controller's subscription plus a reasonable period for backup and legal compliance purposes. Upon account termination, data is deleted within 90 days unless longer retention is required by law.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Data Transfers</h2>
          <p style={{ lineHeight: 1.55 }}>Data is stored and processed in the United States. For transfers of EU/EEA personal data, Faith Harbor LLC relies on Standard Contractual Clauses or other approved transfer mechanisms as required by applicable law.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Contact</h2>
          <p style={{ lineHeight: 1.55 }}>For data protection inquiries, contact us at <a href="mailto:privacy@saassurface.com" style={{ color: '#2f8cff' }}>privacy@saassurface.com</a>.</p>

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
