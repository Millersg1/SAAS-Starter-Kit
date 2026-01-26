import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const faqs = [
    {
        question: "How do I get started?",
        answer: "Sign up for a free account, and you'll be guided through the setup process. You can start using the platform immediately with our free plan.",
    },
    {
        question: "Can I cancel my subscription at any time?",
        answer: "Yes, you can cancel your subscription at any time from the Billing page. Your access will continue until the end of your current billing period.",
    },
    {
        question: "Do you offer refunds?",
        answer: "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team within 14 days of your purchase for a full refund.",
    },
    {
        question: "How do I invite team members?",
        answer: "Go to the Team page in your dashboard and enter the email address of the person you want to invite. They'll receive an email with instructions to join your workspace.",
    },
    {
        question: "Is my data secure?",
        answer: "Yes, we take security seriously. All data is encrypted in transit and at rest. We use Supabase with Row Level Security (RLS) to ensure your data is protected.",
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe. Enterprise customers can also pay via invoice.",
    },
    {
        question: "Can I change my plan later?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period.",
    },
    {
        question: "Do you offer custom enterprise plans?",
        answer: "Yes, we offer custom enterprise plans for larger organizations. Contact our sales team to discuss your needs and get a custom quote.",
    },
    {
        question: "How do I contact support?",
        answer: "You can contact our support team through the Support page in your dashboard. Paid plans receive priority support.",
    },
    {
        question: "Is there a free trial?",
        answer: "We offer a free plan that you can use indefinitely. Paid plans include all features from day one, so you can evaluate everything before committing.",
    },
];

export default function DocsFAQ() {
    const { settings } = useSiteSettings();
    const supportEmail = settings.support_email || "support@example.com";

    // Update the answer in the FAQs array dynamically or just render it
    // For simplicity, we'll keep the static array but update the contact section at bottom

    return (
        <div className="prose prose-lg max-w-none">
            <h1>Frequently Asked Questions</h1>

            <div className="space-y-6 not-prose">
                {faqs.map((faq, index) => (
                    <div key={index} className="border-b pb-6 last:border-0">
                        <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                        <p className="text-slate-600">{faq.answer}</p>
                    </div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-slate-50 rounded-lg text-center not-prose">
                <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
                <p className="text-slate-600 mb-4">
                    Can't find the answer you're looking for? Our support team is happy to help at {supportEmail}.
                </p>
                <Link to="/dashboard/support" className="text-blue-500 hover:underline font-medium">
                    Contact Support →
                </Link>
            </div>
        </div>
    );
}
