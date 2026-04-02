/**
 * Pre-built page templates for the CMS.
 * Each template has: id, name, category, thumbnail description, and HTML content.
 */

export const PAGE_TEMPLATES = [
  {
    id: 'business-homepage',
    name: 'Business Homepage',
    category: 'page',
    description: 'Professional homepage with hero, services, about, and CTA sections',
    content: `<section style="position:relative;color:white;padding:6rem 2rem;text-align:center;background:linear-gradient(rgba(15,23,42,0.7),rgba(15,23,42,0.8)),url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80') center/cover no-repeat">
  <h1 style="font-size:3rem;font-weight:800;margin-bottom:1rem">Grow Your Business With Confidence</h1>
  <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 2rem">We help businesses scale with modern solutions tailored to your unique needs.</p>
  <a href="#contact" style="display:inline-block;background:white;color:#2563eb;padding:0.875rem 2rem;border-radius:0.5rem;font-weight:700;text-decoration:none">Get Started</a>
</section>

<section style="padding:4rem 2rem;max-width:1000px;margin:0 auto">
  <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:0.5rem">Our Services</h2>
  <p style="text-align:center;color:#6b7280;margin-bottom:3rem">Everything you need to succeed</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem">
    <div style="padding:2rem;border:1px solid #e5e7eb;border-radius:1rem;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:1rem">🚀</div>
      <h3 style="font-weight:700;margin-bottom:0.5rem">Strategy</h3>
      <p style="color:#6b7280">Data-driven strategies that deliver measurable results for your business.</p>
    </div>
    <div style="padding:2rem;border:1px solid #e5e7eb;border-radius:1rem;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:1rem">🎨</div>
      <h3 style="font-weight:700;margin-bottom:0.5rem">Design</h3>
      <p style="color:#6b7280">Beautiful, conversion-focused designs that make a lasting impression.</p>
    </div>
    <div style="padding:2rem;border:1px solid #e5e7eb;border-radius:1rem;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:1rem">📈</div>
      <h3 style="font-weight:700;margin-bottom:0.5rem">Growth</h3>
      <p style="color:#6b7280">Scalable growth systems that compound your success over time.</p>
    </div>
  </div>
</section>

<section style="background:#f9fafb;padding:4rem 2rem">
  <div style="max-width:800px;margin:0 auto;text-align:center">
    <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem">About Us</h2>
    <p style="color:#374151;font-size:1.1rem;line-height:1.8">We are a team of passionate professionals dedicated to helping businesses thrive. With years of experience across multiple industries, we bring expertise and creativity to every project we take on.</p>
  </div>
</section>

<section id="contact" style="padding:4rem 2rem;text-align:center;color:white;background:linear-gradient(rgba(37,99,235,0.9),rgba(30,58,95,0.9)),url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80') center/cover no-repeat">
  <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem">Ready to Get Started?</h2>
  <p style="opacity:0.9;margin-bottom:2rem">Let's discuss how we can help your business grow.</p>
  <a href="mailto:hello@example.com" style="display:inline-block;background:white;color:#2563eb;padding:0.875rem 2rem;border-radius:0.5rem;font-weight:700;text-decoration:none">Contact Us</a>
</section>`,
  },

  {
    id: 'landing-page',
    name: 'Landing Page',
    category: 'page',
    description: 'High-converting landing page with headline, benefits, social proof, and signup',
    content: `<section style="position:relative;padding:6rem 2rem;text-align:center;color:white;background:linear-gradient(rgba(37,99,235,0.85),rgba(30,64,175,0.9)),url('https://images.unsplash.com/photo-1551434678-e076c223a692?w=1400&q=80') center/cover no-repeat">
  <p style="font-weight:700;text-transform:uppercase;letter-spacing:0.1em;font-size:0.85rem;margin-bottom:1rem;opacity:0.9">Limited Time Offer</p>
  <h1 style="font-size:2.75rem;font-weight:800;max-width:700px;margin:0 auto 1rem;line-height:1.2">The Fastest Way to [Achieve Your Goal]</h1>
  <p style="font-size:1.15rem;opacity:0.9;max-width:550px;margin:0 auto 2rem">Join 2,000+ professionals who already use our solution to save time and grow faster.</p>
  <a href="#signup" style="display:inline-block;background:white;color:#2563eb;padding:1rem 2.5rem;border-radius:0.5rem;font-weight:700;font-size:1.1rem;text-decoration:none">Start Free Trial</a>
  <p style="opacity:0.7;font-size:0.85rem;margin-top:0.75rem">No credit card required</p>
</section>

<section style="padding:4rem 2rem;max-width:900px;margin:0 auto">
  <h2 style="text-align:center;font-size:1.75rem;font-weight:700;margin-bottom:3rem">Why Choose Us</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem">
    <div style="display:flex;gap:1rem;align-items:flex-start">
      <div style="background:#dbeafe;border-radius:0.75rem;padding:0.75rem;font-size:1.5rem;flex-shrink:0">✅</div>
      <div><h3 style="font-weight:700;margin-bottom:0.25rem">Save 10+ Hours/Week</h3><p style="color:#6b7280;font-size:0.95rem">Automate repetitive tasks and focus on what matters.</p></div>
    </div>
    <div style="display:flex;gap:1rem;align-items:flex-start">
      <div style="background:#dbeafe;border-radius:0.75rem;padding:0.75rem;font-size:1.5rem;flex-shrink:0">📊</div>
      <div><h3 style="font-weight:700;margin-bottom:0.25rem">Real-Time Analytics</h3><p style="color:#6b7280;font-size:0.95rem">Make data-driven decisions with live dashboards.</p></div>
    </div>
    <div style="display:flex;gap:1rem;align-items:flex-start">
      <div style="background:#dbeafe;border-radius:0.75rem;padding:0.75rem;font-size:1.5rem;flex-shrink:0">🔒</div>
      <div><h3 style="font-weight:700;margin-bottom:0.25rem">Enterprise Security</h3><p style="color:#6b7280;font-size:0.95rem">Bank-level encryption keeps your data safe.</p></div>
    </div>
  </div>
</section>

<section style="background:#f9fafb;padding:4rem 2rem">
  <div style="max-width:700px;margin:0 auto;text-align:center">
    <h2 style="font-size:1.75rem;font-weight:700;margin-bottom:2rem">What Our Customers Say</h2>
    <blockquote style="font-size:1.15rem;font-style:italic;color:#374151;line-height:1.7;margin-bottom:1rem">"This tool completely transformed how we work. We saved 15 hours a week and doubled our output in the first month."</blockquote>
    <p style="font-weight:700">Sarah Johnson</p>
    <p style="color:#6b7280;font-size:0.9rem">CEO, Johnson Corp</p>
  </div>
</section>

<section id="signup" style="padding:4rem 2rem;text-align:center">
  <h2 style="font-size:2rem;font-weight:700;margin-bottom:1rem">Start Your Free Trial Today</h2>
  <p style="color:#6b7280;margin-bottom:2rem">No credit card. No commitment. Cancel anytime.</p>
  <a href="mailto:hello@example.com" style="display:inline-block;background:#2563eb;color:white;padding:1rem 2.5rem;border-radius:0.5rem;font-weight:700;text-decoration:none">Get Started Free</a>
</section>`,
  },

  {
    id: 'about-us',
    name: 'About Us',
    category: 'page',
    description: 'Company story with team, mission, and values',
    content: `<section style="position:relative;padding:5rem 2rem;text-align:center;color:white;background:linear-gradient(rgba(15,23,42,0.7),rgba(15,23,42,0.75)),url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80') center/cover no-repeat">
  <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:1rem">About Us</h1>
  <p style="font-size:1.15rem;opacity:0.9;line-height:1.8;max-width:700px;margin:0 auto">We started with a simple mission: make it easier for businesses to succeed. Today, we serve thousands of clients worldwide.</p>
</section>

<section style="background:#f9fafb;padding:4rem 2rem">
  <div style="max-width:900px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem;text-align:center">
    <div style="padding:2rem"><p style="font-size:2.5rem;font-weight:800;color:#2563eb">500+</p><p style="color:#6b7280">Happy Clients</p></div>
    <div style="padding:2rem"><p style="font-size:2.5rem;font-weight:800;color:#2563eb">12</p><p style="color:#6b7280">Years Experience</p></div>
    <div style="padding:2rem"><p style="font-size:2.5rem;font-weight:800;color:#2563eb">98%</p><p style="color:#6b7280">Client Retention</p></div>
  </div>
</section>

<section style="padding:4rem 2rem;max-width:900px;margin:0 auto">
  <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:0.5rem">Our Values</h2>
  <p style="text-align:center;color:#6b7280;margin-bottom:3rem">What drives everything we do</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2rem">
    <div style="padding:1.5rem;border-left:4px solid #2563eb"><h3 style="font-weight:700;margin-bottom:0.5rem">Integrity</h3><p style="color:#6b7280">We do what's right, even when no one is watching.</p></div>
    <div style="padding:1.5rem;border-left:4px solid #2563eb"><h3 style="font-weight:700;margin-bottom:0.5rem">Innovation</h3><p style="color:#6b7280">We constantly push boundaries to deliver better solutions.</p></div>
    <div style="padding:1.5rem;border-left:4px solid #2563eb"><h3 style="font-weight:700;margin-bottom:0.5rem">Partnership</h3><p style="color:#6b7280">Your success is our success — we grow together.</p></div>
  </div>
</section>

<section style="padding:4rem 2rem;max-width:900px;margin:0 auto">
  <h2 style="text-align:center;font-size:2rem;font-weight:700;margin-bottom:2rem">Meet the Team</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;text-align:center">
    <div><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face" alt="Jane Smith" style="width:100px;height:100px;border-radius:50%;margin:0 auto 1rem;object-fit:cover;display:block"><h3 style="font-weight:700">Jane Smith</h3><p style="color:#6b7280;font-size:0.9rem">CEO & Founder</p></div>
    <div><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face" alt="Mike Johnson" style="width:100px;height:100px;border-radius:50%;margin:0 auto 1rem;object-fit:cover;display:block"><h3 style="font-weight:700">Mike Johnson</h3><p style="color:#6b7280;font-size:0.9rem">CTO</p></div>
    <div><img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face" alt="Sarah Lee" style="width:100px;height:100px;border-radius:50%;margin:0 auto 1rem;object-fit:cover;display:block"><h3 style="font-weight:700">Sarah Lee</h3><p style="color:#6b7280;font-size:0.9rem">Head of Design</p></div>
  </div>
</section>`,
  },

  {
    id: 'services',
    name: 'Services',
    category: 'page',
    description: 'Service cards with descriptions and pricing tiers',
    content: `<section style="padding:4rem 2rem;text-align:center;background:linear-gradient(180deg,#f0f9ff,white)">
  <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:0.5rem">Our Services</h1>
  <p style="color:#6b7280;font-size:1.1rem">Solutions tailored to your business needs</p>
</section>

<section style="padding:3rem 2rem;max-width:1000px;margin:0 auto">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem">
    <div style="border:1px solid #e5e7eb;border-radius:1rem;overflow:hidden">
      <div style="background:#2563eb;color:white;padding:2rem;text-align:center"><h2 style="font-size:1.5rem;font-weight:700">Web Design</h2><p style="opacity:0.9;margin-top:0.5rem">Starting at $2,500</p></div>
      <div style="padding:2rem"><ul style="list-style:none;padding:0"><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Custom responsive design</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ SEO optimized</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Mobile-first approach</li><li style="padding:0.5rem 0">✓ 30-day support</li></ul></div>
    </div>
    <div style="border:2px solid #2563eb;border-radius:1rem;overflow:hidden;transform:scale(1.02)">
      <div style="background:#1e40af;color:white;padding:2rem;text-align:center"><p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8;margin-bottom:0.25rem">Most Popular</p><h2 style="font-size:1.5rem;font-weight:700">Full Branding</h2><p style="opacity:0.9;margin-top:0.5rem">Starting at $5,000</p></div>
      <div style="padding:2rem"><ul style="list-style:none;padding:0"><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Everything in Web Design</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Logo & brand identity</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Social media setup</li><li style="padding:0.5rem 0">✓ 90-day support</li></ul></div>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:1rem;overflow:hidden">
      <div style="background:#2563eb;color:white;padding:2rem;text-align:center"><h2 style="font-size:1.5rem;font-weight:700">Marketing</h2><p style="opacity:0.9;margin-top:0.5rem">Starting at $1,500/mo</p></div>
      <div style="padding:2rem"><ul style="list-style:none;padding:0"><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ SEO & content strategy</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Social media management</li><li style="padding:0.5rem 0;border-bottom:1px solid #f3f4f6">✓ Email campaigns</li><li style="padding:0.5rem 0">✓ Monthly reporting</li></ul></div>
    </div>
  </div>
</section>`,
  },

  {
    id: 'contact',
    name: 'Contact',
    category: 'page',
    description: 'Contact page with form placeholder, map area, and business info',
    content: `<section style="padding:4rem 2rem;text-align:center">
  <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:0.5rem">Get In Touch</h1>
  <p style="color:#6b7280;font-size:1.1rem">We'd love to hear from you</p>
</section>

<section style="padding:2rem;max-width:900px;margin:0 auto">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:3rem">
    <div>
      <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Send Us a Message</h2>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <input type="text" placeholder="Your Name" style="padding:0.75rem 1rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:1rem">
        <input type="email" placeholder="Your Email" style="padding:0.75rem 1rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:1rem">
        <textarea placeholder="Your Message" rows="5" style="padding:0.75rem 1rem;border:1px solid #d1d5db;border-radius:0.5rem;font-size:1rem;resize:vertical"></textarea>
        <button style="background:#2563eb;color:white;padding:0.875rem;border:none;border-radius:0.5rem;font-weight:700;font-size:1rem;cursor:pointer">Send Message</button>
      </div>
    </div>
    <div>
      <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:1.5rem">Contact Info</h2>
      <div style="display:flex;flex-direction:column;gap:1.25rem">
        <div><p style="font-weight:600">Email</p><p style="color:#6b7280">hello@example.com</p></div>
        <div><p style="font-weight:600">Phone</p><p style="color:#6b7280">(555) 123-4567</p></div>
        <div><p style="font-weight:600">Address</p><p style="color:#6b7280">123 Business Ave, Suite 100<br>New York, NY 10001</p></div>
        <div><p style="font-weight:600">Hours</p><p style="color:#6b7280">Mon-Fri: 9am - 6pm EST</p></div>
      </div>
    </div>
  </div>
</section>`,
  },

  {
    id: 'portfolio',
    name: 'Portfolio',
    category: 'page',
    description: 'Project gallery grid with descriptions',
    content: `<section style="padding:4rem 2rem;text-align:center">
  <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:0.5rem">Our Work</h1>
  <p style="color:#6b7280;font-size:1.1rem">A selection of projects we're proud of</p>
</section>

<section style="padding:2rem;max-width:1000px;margin:0 auto">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem">
    <div style="border-radius:1rem;overflow:hidden;border:1px solid #e5e7eb">
      <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=300&fit=crop" alt="Brand Refresh" style="width:100%;height:200px;object-fit:cover">
      <div style="padding:1.5rem"><h3 style="font-weight:700;margin-bottom:0.5rem">Brand Refresh — Acme Corp</h3><p style="color:#6b7280;font-size:0.95rem">Complete rebrand including logo, website, and marketing collateral.</p><p style="color:#2563eb;font-weight:600;margin-top:0.75rem;font-size:0.9rem">Web Design • Branding</p></div>
    </div>
    <div style="border-radius:1rem;overflow:hidden;border:1px solid #e5e7eb">
      <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop" alt="E-Commerce" style="width:100%;height:200px;object-fit:cover">
      <div style="padding:1.5rem"><h3 style="font-weight:700;margin-bottom:0.5rem">E-Commerce Launch — StyleHQ</h3><p style="color:#6b7280;font-size:0.95rem">Built a high-converting Shopify store that doubled online revenue.</p><p style="color:#2563eb;font-weight:600;margin-top:0.75rem;font-size:0.9rem">E-Commerce • Strategy</p></div>
    </div>
    <div style="border-radius:1rem;overflow:hidden;border:1px solid #e5e7eb">
      <img src="https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&h=300&fit=crop" alt="SEO Campaign" style="width:100%;height:200px;object-fit:cover">
      <div style="padding:1.5rem"><h3 style="font-weight:700;margin-bottom:0.5rem">SEO Campaign — GrowthCo</h3><p style="color:#6b7280;font-size:0.95rem">From page 5 to position 1 in 6 months. 340% increase in organic traffic.</p><p style="color:#2563eb;font-weight:600;margin-top:0.75rem;font-size:0.9rem">SEO • Content</p></div>
    </div>
    <div style="border-radius:1rem;overflow:hidden;border:1px solid #e5e7eb">
      <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=300&fit=crop" alt="App Design" style="width:100%;height:200px;object-fit:cover">
      <div style="padding:1.5rem"><h3 style="font-weight:700;margin-bottom:0.5rem">App Design — FitTrack</h3><p style="color:#6b7280;font-size:0.95rem">UI/UX design for a fitness tracking app with 50k+ downloads.</p><p style="color:#2563eb;font-weight:600;margin-top:0.75rem;font-size:0.9rem">UI/UX • Mobile</p></div>
    </div>
  </div>
</section>`,
  },

  {
    id: 'pricing',
    name: 'Pricing',
    category: 'page',
    description: 'Plan comparison cards with CTA buttons',
    content: `<section style="padding:4rem 2rem;text-align:center;background:linear-gradient(180deg,#f0f9ff,white)">
  <h1 style="font-size:2.5rem;font-weight:800;margin-bottom:0.5rem">Simple, Transparent Pricing</h1>
  <p style="color:#6b7280;font-size:1.1rem">No hidden fees. Cancel anytime.</p>
</section>

<section style="padding:2rem;max-width:1000px;margin:0 auto">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem">
    <div style="border:1px solid #e5e7eb;border-radius:1rem;padding:2.5rem;text-align:center">
      <h3 style="font-weight:700;color:#6b7280;text-transform:uppercase;font-size:0.85rem;letter-spacing:0.05em">Starter</h3>
      <p style="font-size:3rem;font-weight:800;margin:1rem 0 0.25rem">$29<span style="font-size:1rem;font-weight:400;color:#6b7280">/mo</span></p>
      <p style="color:#6b7280;margin-bottom:2rem">Perfect for small teams</p>
      <ul style="list-style:none;padding:0;text-align:left;margin-bottom:2rem"><li style="padding:0.5rem 0;color:#374151">✓ Up to 5 users</li><li style="padding:0.5rem 0;color:#374151">✓ 10 projects</li><li style="padding:0.5rem 0;color:#374151">✓ Email support</li><li style="padding:0.5rem 0;color:#9ca3af">✗ Custom branding</li></ul>
      <a href="#" style="display:block;padding:0.75rem;border:2px solid #2563eb;color:#2563eb;border-radius:0.5rem;font-weight:700;text-decoration:none">Get Started</a>
    </div>
    <div style="border:2px solid #2563eb;border-radius:1rem;padding:2.5rem;text-align:center;position:relative">
      <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#2563eb;color:white;padding:0.25rem 1rem;border-radius:1rem;font-size:0.8rem;font-weight:700">POPULAR</div>
      <h3 style="font-weight:700;color:#2563eb;text-transform:uppercase;font-size:0.85rem;letter-spacing:0.05em">Professional</h3>
      <p style="font-size:3rem;font-weight:800;margin:1rem 0 0.25rem">$79<span style="font-size:1rem;font-weight:400;color:#6b7280">/mo</span></p>
      <p style="color:#6b7280;margin-bottom:2rem">For growing businesses</p>
      <ul style="list-style:none;padding:0;text-align:left;margin-bottom:2rem"><li style="padding:0.5rem 0;color:#374151">✓ Up to 25 users</li><li style="padding:0.5rem 0;color:#374151">✓ Unlimited projects</li><li style="padding:0.5rem 0;color:#374151">✓ Priority support</li><li style="padding:0.5rem 0;color:#374151">✓ Custom branding</li></ul>
      <a href="#" style="display:block;padding:0.75rem;background:#2563eb;color:white;border-radius:0.5rem;font-weight:700;text-decoration:none">Get Started</a>
    </div>
    <div style="border:1px solid #e5e7eb;border-radius:1rem;padding:2.5rem;text-align:center">
      <h3 style="font-weight:700;color:#6b7280;text-transform:uppercase;font-size:0.85rem;letter-spacing:0.05em">Enterprise</h3>
      <p style="font-size:3rem;font-weight:800;margin:1rem 0 0.25rem">Custom</p>
      <p style="color:#6b7280;margin-bottom:2rem">For large organizations</p>
      <ul style="list-style:none;padding:0;text-align:left;margin-bottom:2rem"><li style="padding:0.5rem 0;color:#374151">✓ Unlimited everything</li><li style="padding:0.5rem 0;color:#374151">✓ Dedicated account manager</li><li style="padding:0.5rem 0;color:#374151">✓ SLA guarantee</li><li style="padding:0.5rem 0;color:#374151">✓ Custom integrations</li></ul>
      <a href="#" style="display:block;padding:0.75rem;border:2px solid #2563eb;color:#2563eb;border-radius:0.5rem;font-weight:700;text-decoration:none">Contact Sales</a>
    </div>
  </div>
</section>`,
  },

  {
    id: 'blog-post',
    name: 'Blog Post',
    category: 'blog',
    description: 'Blog article with featured image area, content, and author bio',
    content: `<article>
  <p style="color:#2563eb;font-weight:600;font-size:0.9rem;margin-bottom:0.5rem">Category Name</p>
  <h1 style="font-size:2.25rem;font-weight:800;line-height:1.3;margin-bottom:1rem">Your Blog Post Title Goes Here</h1>
  <p style="color:#6b7280;margin-bottom:2rem">Published on January 1, 2026 • 5 min read</p>

  <p>Your introduction paragraph goes here. This should hook the reader and give them a reason to keep reading. Make it compelling and relevant to your audience.</p>

  <h2>First Section Heading</h2>
  <p>Dive deeper into your topic here. Use concrete examples, data, and actionable advice. Break up long paragraphs to keep readers engaged.</p>
  <ul>
    <li>Key point one with supporting detail</li>
    <li>Key point two with supporting detail</li>
    <li>Key point three with supporting detail</li>
  </ul>

  <h2>Second Section Heading</h2>
  <p>Continue building your argument or narrative. Include quotes, statistics, or case studies to add credibility to your content.</p>
  <blockquote>"A great quote from an expert or customer that supports your main point and adds authority to your article."</blockquote>

  <h2>Key Takeaways</h2>
  <ol>
    <li>Summarize your first main point</li>
    <li>Summarize your second main point</li>
    <li>Summarize your third main point</li>
  </ol>

  <p>Wrap up with a strong conclusion and a clear call to action. Tell readers what to do next — subscribe, contact you, or try your product.</p>

  <hr style="margin:3rem 0;border:none;border-top:1px solid #e5e7eb">
  <div style="display:flex;gap:1rem;align-items:center">
    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face" alt="Author" style="width:60px;height:60px;border-radius:50%;flex-shrink:0;object-fit:cover">
    <div><p style="font-weight:700">Author Name</p><p style="color:#6b7280;font-size:0.9rem">Brief bio — Writer, consultant, and coffee enthusiast. Helping businesses grow since 2015.</p></div>
  </div>
</article>`,
  },
];

export function getTemplateById(id) {
  return PAGE_TEMPLATES.find(t => t.id === id) || null;
}

export function getTemplatesByCategory(category) {
  if (!category) return PAGE_TEMPLATES;
  return PAGE_TEMPLATES.filter(t => t.category === category);
}
