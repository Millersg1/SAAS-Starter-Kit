import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { siteConfig } from "@/config/site";

// Hero Section
function Hero() {
    return (
        <section className="py-20 md:py-32">
            <div className="container-xl">
                {/* Badge */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        ✨ Launch Your Business Today
                    </div>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto mb-6 text-center">
                    Create Websites &{" "}
                    <span className="gradient-text">Landing Pages</span>{" "}
                    in Minutes
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-center">
                    The all-in-one platform that helps small businesses create stunning websites,
                    manage customers, and grow online—no coding required.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                    <Link to="/signup">
                        <Button size="lg" className="text-base px-8">
                            Start Free Trial →
                        </Button>
                    </Link>
                    <Link to="/pricing">
                        <Button size="lg" variant="outline" className="text-base px-8">
                            View Pricing
                        </Button>
                    </Link>
                </div>

                {/* Hero Image Placeholder */}
                <div className="relative max-w-5xl mx-auto">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-2xl border border-border overflow-hidden shadow-2xl">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-muted-foreground font-medium">Hero Image / Product Screenshot</p>
                                <p className="text-sm text-muted-foreground/60 mt-1">Replace with your product preview</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute -z-10 -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
                    <div className="absolute -z-10 -bottom-8 -left-8 w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
                </div>

                {/* Social Proof */}
                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="flex -space-x-2">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background"
                            />
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{siteConfig.socialProof?.customers || "1,000+"}</span> happy customers •
                        <span className="font-semibold text-foreground ml-1">⭐ {siteConfig.socialProof?.rating || "4.9"}</span> rating
                    </p>
                </div>
            </div>
        </section>
    );
}

// Features Section
function Features() {
    const features = [
        {
            icon: "🎨",
            title: "Beautiful Templates",
            description: "Choose from dozens of stunning, professionally designed templates for any business.",
        },
        {
            icon: "🛒",
            title: "Online Store",
            description: "Sell products and services online with built-in e-commerce functionality.",
        },
        {
            icon: "📅",
            title: "Easy Scheduling",
            description: "Let customers book appointments and manage your calendar effortlessly.",
        },
        {
            icon: "📧",
            title: "Email Marketing",
            description: "Send beautiful email campaigns to engage and grow your audience.",
        },
        {
            icon: "📊",
            title: "Analytics",
            description: "Track visits, sales, and customer behavior with powerful insights.",
        },
        {
            icon: "📱",
            title: "Mobile Ready",
            description: "Every page looks perfect on desktop, tablet, and mobile devices.",
        },
    ];

    return (
        <section className="py-20 bg-muted">
            <div className="container-xl">
                <div className="text-center mb-4">
                    <span className="text-sm font-medium text-primary uppercase tracking-wider">Everything you need</span>
                </div>
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Perfect for All Small Businesses
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Whether you're a freelancer, agency, or growing startup—we have all the tools you need to succeed.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="bg-background rounded-xl p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-center"
                        >
                            <div className="text-4xl mb-4 flex justify-center">{feature.icon}</div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link to="/signup">
                        <Button size="lg" className="text-base px-8">
                            See All Features →
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

// Value Proposition Section
function ValueProp() {
    return (
        <section className="py-20">
            <div className="container-xl">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Content */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">
                            Run your business in{" "}
                            <span className="gradient-text">1 simple place</span>
                        </h2>
                        <p className="text-lg text-muted-foreground mb-6">
                            Stop juggling multiple tools. Our platform brings together everything you need—
                            website, store, marketing, and analytics—in one powerful solution.
                        </p>
                        <ul className="space-y-4 mb-8">
                            {[
                                "No coding or technical skills required",
                                "24/7 customer support when you need it",
                                "Free SSL certificate for security",
                                "Connect your custom domain",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Link to="/signup">
                            <Button size="lg" className="text-base px-8">
                                Get Started Free →
                            </Button>
                        </Link>
                    </div>

                    {/* Right - Image Placeholder */}
                    <div className="relative">
                        <div className="aspect-square bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-2xl border border-border overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center p-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-muted-foreground font-medium">Dashboard Preview</p>
                                    <p className="text-sm text-muted-foreground/60 mt-1">Replace with your product image</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Testimonials Section
function Testimonials() {
    const testimonials = [
        {
            quote: "This platform transformed how I run my business. I went from struggling with multiple tools to having everything in one place.",
            author: "Sarah Johnson",
            role: "Freelance Designer",
            avatar: "👩‍🎨",
        },
        {
            quote: "I was able to launch my online store in just one weekend. The templates are beautiful and the support team is incredibly helpful.",
            author: "Michael Chen",
            role: "E-commerce Owner",
            avatar: "👨‍💼",
        },
    ];

    return (
        <section className="py-20 bg-muted">
            <div className="container-xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Listen to what {siteConfig.socialProof?.customers || "1,000+"} other{" "}
                        <span className="gradient-text">happy customers</span> say
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {testimonials.map((testimonial) => (
                        <div
                            key={testimonial.author}
                            className="bg-background rounded-xl p-8 border border-border"
                        >
                            <div className="text-4xl mb-4">{testimonial.avatar}</div>
                            <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                            <div>
                                <p className="font-semibold">{testimonial.author}</p>
                                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link to="/signup">
                        <Button size="lg" variant="outline" className="text-base px-8">
                            Join Them Today →
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

// FAQ Section
function FAQ() {
    const faqs = [
        {
            q: "How long does it take to get started?",
            a: "You can have your website live in under 30 minutes. Just choose a template, customize it with your content, and publish.",
        },
        {
            q: "Do I need any technical skills?",
            a: "Not at all! Our drag-and-drop builder makes it easy for anyone to create a professional website without writing a single line of code.",
        },
        {
            q: "Can I cancel my subscription anytime?",
            a: "Yes, you can cancel at any time. There are no long-term contracts or hidden fees. Your access continues until the end of your billing period.",
        },
        {
            q: "Is there a free trial available?",
            a: "We offer a free plan that lets you explore the platform. Paid plans unlock advanced features and remove all limitations.",
        },
        {
            q: "Do you offer customer support?",
            a: "Absolutely! We provide 24/7 email support for all customers, with priority support for paid plans. We're here to help you succeed.",
        },
    ];

    return (
        <section className="py-20 bg-muted">
            <div className="container-xl">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Frequently asked{" "}
                            <span className="gradient-text">questions</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq) => (
                            <details
                                key={faq.q}
                                className="group bg-background rounded-xl border border-border overflow-hidden"
                            >
                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                                    <span className="font-semibold pr-4">{faq.q}</span>
                                    <svg
                                        className="w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </summary>
                                <div className="px-6 pb-6 text-muted-foreground">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link to="/signup">
                            <Button size="lg" className="text-base px-8">
                                Start Free Trial →
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Final CTA Section
function CTA() {
    return (
        <section className="py-20 bg-blue-500">
            <div className="container-xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Ready to grow your business?
                </h2>
                <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
                    Join {siteConfig.socialProof?.customers || "1,000+"} businesses already using our platform.
                    Start your free trial today—no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/signup">
                        <Button
                            size="lg"
                            className="bg-white text-blue-500 hover:bg-white/90 text-base px-8"
                        >
                            Get Started Free →
                        </Button>
                    </Link>
                    <Link to="/pricing">
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white text-white hover:bg-white/10 text-base px-8"
                        >
                            View Pricing
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function HomePage() {
    return (
        <>
            <Hero />
            <Features />
            <ValueProp />
            <Testimonials />
            <FAQ />
            <CTA />
        </>
    );
}
