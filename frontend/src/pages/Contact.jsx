import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/public/contact', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="font-bold text-xl text-gray-900">ClientHub</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Log In</Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-16 pb-12 px-6 text-center">
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Get in Touch</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Talk to our team</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Questions about pricing, features, or getting started? We respond to every message within one business day.
        </p>
      </section>

      {/* Content */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">

          {/* Contact info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">We'd love to hear from you</h2>

            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  📧
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Email us</p>
                  <a href="mailto:sales@faithharborclienthub.com" className="text-blue-600 hover:underline text-sm">
                    sales@faithharborclienthub.com
                  </a>
                  <p className="text-gray-500 text-xs mt-1">We respond within one business day.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  💬
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Sales questions</p>
                  <p className="text-gray-600 text-sm">Interested in a demo or have questions about plans? Use the form and mention your agency size.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  🛠️
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-0.5">Support</p>
                  <p className="text-gray-600 text-sm">Already a customer? Log in and use the support link in your account, or email us directly.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p className="font-semibold text-blue-900 mb-2">14-day free trial</p>
              <p className="text-blue-700 text-sm leading-relaxed">
                Ready to get started? No credit card required. Your portal can be live in under 10 minutes.
              </p>
              <Link
                to="/register"
                className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl mx-auto mb-4">✓</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                <p className="text-gray-600 text-sm mb-6">Thanks for reaching out. We'll get back to you within one business day.</p>
                <Link to="/" className="text-blue-600 hover:underline text-sm font-medium">← Back to home</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Send us a message</h3>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Jane Smith"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="jane@youragency.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / Agency</label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Acme Creative Agency"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us about your agency and what you're looking for..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Sending...' : 'Send Message →'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  By submitting this form you agree to our{' '}
                  <Link to="/privacy-policy" className="underline hover:text-gray-600">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="font-bold text-white">ClientHub</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} ClientHub · All rights reserved.</p>
          <div className="flex gap-4 text-sm">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/" className="hover:text-white transition-colors">← Back to Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
