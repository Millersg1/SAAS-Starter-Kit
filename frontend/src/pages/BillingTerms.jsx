import SEO from '../components/SEO';

export default function BillingTerms() {
  return (
    <div style={{ fontFamily: 'Arial, system-ui, -apple-system, Segoe UI, Roboto', margin: 0, background: '#f7f8fb', color: '#0b1220', minHeight: '100vh' }}>
      <SEO title="Billing Terms" description="Billing terms and payment policies for SAAS Surface subscriptions." url="https://saassurface.com/billing-terms" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 18px' }}>
        <div style={{ background: '#fff', border: '1px solid #e6e8ee', borderRadius: 16, padding: 22 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28 }}>Billing Terms</h1>
              <div style={{ color: '#5b6478' }}>Effective date: February 21, 2026</div>
            </div>
            <div style={{ display: 'inline-block', fontSize: 12, padding: '6px 10px', borderRadius: 999, background: '#eef6ff', color: '#0b3b77', border: '1px solid #d7e9ff' }}>
              SAAS Surface
            </div>
          </div>

          <div style={{ height: 1, background: '#e6e8ee', margin: '18px 0' }} />

          <p style={{ lineHeight: 1.55 }}>These Billing Terms govern all subscription charges for <strong>SAAS Surface</strong>, operated by <strong>Faith Harbor LLC</strong>. By subscribing, you agree to these terms.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Free Trial</h2>
          <p style={{ lineHeight: 1.55 }}>New accounts receive a <strong>14-day free trial</strong> with full access to platform features. No credit card is required to start your trial. You will only be charged if you choose to subscribe after your trial ends.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Subscription Plans</h2>
          <p style={{ lineHeight: 1.55 }}>SAAS Surface is offered on monthly and annual subscription plans. Plan details, features, and pricing are displayed on the Subscriptions page within your account. All prices are in US Dollars (USD) unless otherwise stated.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Billing Cycle</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Monthly plans:</strong> Billed every 30 days from the date your subscription begins.</li>
            <li><strong>Annual plans:</strong> Billed once per year from the date your subscription begins.</li>
            <li>Your billing date is set when you first subscribe and remains consistent each cycle.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Automatic Renewal</h2>
          <p style={{ lineHeight: 1.55 }}>Subscriptions automatically renew at the end of each billing period. By subscribing, you authorize Faith Harbor LLC to charge your payment method on file for each renewal period until you cancel. For annual plans, we will send a reminder email at least 7 days before renewal.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Payment Methods</h2>
          <p style={{ lineHeight: 1.55 }}>We accept major credit and debit cards through our payment processor, Stripe. Your payment information is stored securely by Stripe — Faith Harbor LLC does not store your full card details.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Failed Payments</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li>If a payment fails, we will notify you by email and attempt to retry the charge.</li>
            <li>If payment cannot be collected after multiple attempts, your account may be downgraded or suspended until payment is resolved.</li>
            <li>You are responsible for keeping your payment information current.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Plan Changes</h2>
          <ul style={{ lineHeight: 1.55 }}>
            <li><strong>Upgrades:</strong> Take effect immediately. You will be charged a pro-rated amount for the remainder of your current billing period.</li>
            <li><strong>Downgrades:</strong> Take effect at the start of your next billing period. You will retain your current plan features until then.</li>
          </ul>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Taxes</h2>
          <p style={{ lineHeight: 1.55 }}>Prices shown do not include applicable taxes. Where required by law, taxes will be calculated and added to your invoice at checkout.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Invoices</h2>
          <p style={{ lineHeight: 1.55 }}>A billing receipt is emailed to you after each successful charge. You can also view your billing history in your account settings.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Refunds</h2>
          <p style={{ lineHeight: 1.55 }}>Please refer to our <a href="/refund-policy" style={{ color: '#2f8cff' }}>Refund &amp; Cancellation Policy</a> for full details on refund eligibility.</p>

          <h2 style={{ margin: '22px 0 10px', fontSize: 18 }}>Contact</h2>
          <p style={{ lineHeight: 1.55 }}>For billing questions, contact us at <a href="mailto:support@saassurface.com" style={{ color: '#2f8cff' }}>support@saassurface.com</a>.</p>

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
