import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import SEO from '../components/SEO';

const StarRating = ({ rating, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="focus:outline-none transition-transform hover:scale-110"
        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
      >
        <svg
          className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </button>
    ))}
  </div>
);

export default function SubmitTestimonial() {
  const [form, setForm] = useState({ name: '', role: '', company: '', quote: '', video_url: '', rating: 0 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim() || !form.quote.trim()) {
      setError('Please provide your name and review.');
      return;
    }
    if (form.rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/testimonials/submit', {
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        company: form.company.trim() || undefined,
        quote: form.quote.trim(),
        video_url: form.video_url.trim() || undefined,
        rating: form.rating,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SEO
        title="Share Your Experience"
        description="Tell us about your experience with SAAS Surface. Your feedback helps us improve and helps other agencies make informed decisions."
        url="https://saassurface.com/testimonial"
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-xl text-gray-900">SAAS Surface</span>
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
        <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Testimonials</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Share Your Experience</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          We value your feedback. Let us know how SAAS Surface has helped your agency grow.
        </p>
      </section>

      {/* Form Section */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          {success ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
              <p className="text-gray-600 mb-6">Your testimonial has been submitted for review. We truly appreciate your feedback!</p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-left">
                <p className="font-bold text-gray-900 mb-2">Would you also leave us a Google review?</p>
                <p className="text-gray-600 text-sm mb-4">It takes 30 seconds and helps other agencies find SAAS Surface. We'd really appreciate it.</p>
                <a
                  href="https://g.page/r/saassurface/review"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg font-semibold text-sm text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Leave a Google Review
                </a>
              </div>

              <Link
                to="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-1">
                    Your Role / Title
                  </label>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="CEO"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-1">
                  Company
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="Acme Agency"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rating <span className="text-red-500">*</span>
                </label>
                <StarRating rating={form.rating} onChange={(r) => setForm((prev) => ({ ...prev, rating: r }))} />
              </div>

              <div>
                <label htmlFor="quote" className="block text-sm font-semibold text-gray-700 mb-1">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="quote"
                  name="quote"
                  rows={5}
                  value={form.quote}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                  placeholder="Tell us how SAAS Surface has helped your agency..."
                />
              </div>

              <div>
                <label htmlFor="video_url" className="block text-sm font-semibold text-gray-700 mb-1">
                  Video Testimonial URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="video_url"
                  name="video_url"
                  type="url"
                  value={form.video_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder="https://www.youtube.com/watch?v=... or https://www.loom.com/share/..."
                />
                <p className="text-xs text-gray-500 mt-1">Paste a YouTube or Loom link to add a video testimonial.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Testimonial'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} SAAS Surface. All rights reserved.</p>
      </footer>
    </div>
  );
}
