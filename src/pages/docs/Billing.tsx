import { Link } from "react-router-dom";

export default function DocsBilling() {
    return (
        <div className="prose prose-lg max-w-none">
            <h1>Billing & Subscriptions</h1>

            <h2>Managing Your Subscription</h2>
            <p>
                You can manage your subscription from the <Link to="/dashboard/billing">Billing page</Link> in your dashboard.
            </p>

            <h3>Upgrading Your Plan</h3>
            <p>
                To upgrade your plan, go to the Billing page and click on the plan you want to upgrade to. Your new plan will take effect immediately, and you'll be charged a prorated amount for the remainder of your billing cycle.
            </p>

            <h3>Downgrading Your Plan</h3>
            <p>
                You can downgrade your plan at any time. The change will take effect at the end of your current billing period. You'll continue to have access to your current plan's features until then.
            </p>

            <h3>Canceling Your Subscription</h3>
            <p>
                To cancel your subscription, go to the Billing page and click "Cancel Subscription". Your access will continue until the end of your current billing period.
            </p>

            <h2>Payment Methods</h2>
            <p>We accept all major credit and debit cards through Stripe:</p>
            <ul>
                <li>Visa</li>
                <li>Mastercard</li>
                <li>American Express</li>
                <li>Discover</li>
            </ul>

            <h3>Updating Payment Method</h3>
            <p>
                You can update your payment method from the Billing page. Click "Update Payment Method" to add a new card or update your existing one.
            </p>

            <h2>Invoices</h2>
            <p>
                All invoices are available for download from the Billing page. You'll also receive email receipts for all payments.
            </p>

            <h2>Need Help?</h2>
            <p>
                If you have any questions about billing or need help with your subscription, please <Link to="/dashboard/support">contact our support team</Link>.
            </p>
        </div>
    );
}
