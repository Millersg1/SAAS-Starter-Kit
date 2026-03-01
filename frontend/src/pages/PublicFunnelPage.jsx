// PublicFunnelPage.jsx — clean landing page renderer for published funnels
// Accessed at: /lp/:funnelSlug and /lp/:funnelSlug/:stepSlug
// No app chrome — renders only the funnel blocks.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BlockRenderer from '../components/funnel/BlockRenderer';
import { funnelAPI } from '../services/api';

export default function PublicFunnelPage() {
  const { funnelSlug, stepSlug } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!funnelSlug) return;
    loadStep();
  }, [funnelSlug, stepSlug]);

  const loadStep = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await funnelAPI.publicView(funnelSlug, stepSlug);
      const data = res.data;
      setStep(data.step);
      setFunnel(data.funnel);

      // If the API returned a redirect (first step of funnel), navigate to it
      if (data.redirectTo) {
        navigate(data.redirectTo, { replace: true });
        return;
      }

      // Set page title
      if (data.step?.seo_title) {
        document.title = data.step.seo_title;
      } else if (data.funnel?.name) {
        document.title = data.funnel.name;
      }

      // Set meta description
      const metaDesc = data.step?.seo_description || data.funnel?.seo_description;
      if (metaDesc) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', metaDesc);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('This page does not exist or is no longer available.');
      } else {
        setError('Unable to load this page. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle lead form submissions
  const handleFormSubmit = useCallback(async (stepId, formData) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await funnelAPI.publicSubmit(stepId, formData);
      const data = res.data;

      if (data.redirectUrl) {
        // Navigate to next step or external URL
        if (data.redirectUrl.startsWith('/') || data.redirectUrl.startsWith('http')) {
          window.location.href = data.redirectUrl;
        } else {
          navigate(data.redirectUrl);
        }
      }
      // If no redirect, BlockRenderer handles showing successMessage
      return data;
    } catch (err) {
      console.error('Form submission error:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [submitting, navigate]);

  // ── Loading ──

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Error ──

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Page Not Found</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!step) return null;

  const blocks = step.blocks || [];

  // ── Render ──

  return (
    <div className="min-h-screen bg-white">
      {/* OG image / SEO meta set via document API above */}

      {/* Render each block */}
      {blocks.length === 0 ? (
        <div className="min-h-screen flex items-center justify-center text-center p-8">
          <div>
            <div className="text-5xl mb-4">🚧</div>
            <h1 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h1>
            <p className="text-sm text-gray-400">This page is being set up. Check back soon.</p>
          </div>
        </div>
      ) : (
        blocks.map(block => (
          <BlockRenderer
            key={block.id}
            block={block}
            isEditing={false}
            isSelected={false}
            onSelect={null}
            onSubmit={
              block.type === 'lead_form'
                ? (formData) => handleFormSubmit(step.id, formData)
                : null
            }
          />
        ))
      )}

      {/* Powered-by footer (subtle branding — can be removed for white-label) */}
      <footer className="py-4 text-center">
        <p className="text-xs text-gray-300">
          Powered by <a href="/" className="hover:text-gray-500 transition-colors">ClientHub</a>
        </p>
      </footer>
    </div>
  );
}
