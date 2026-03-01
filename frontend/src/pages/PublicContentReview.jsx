import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PublicContentReview({ type }) {
  // type = 'cms' | 'social'
  const { token } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null); // 'approved' | 'changes_requested'

  useEffect(() => {
    const url =
      type === 'cms'
        ? `${API_BASE}/cms/review/${token}`
        : `${API_BASE}/social/review/${token}`;
    axios.get(url)
      .then(r => setItem(r.data.data))
      .catch(() => setError('This review link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token, type]);

  const submit = async (review_status) => {
    setSubmitting(true);
    try {
      const url =
        type === 'cms'
          ? `${API_BASE}/cms/review/${token}`
          : `${API_BASE}/social/review/${token}`;
      await axios.post(url, { review_status, review_notes: notes, reviewer_name: reviewerName });
      setSubmitted(review_status);
    } catch {
      setError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Link Not Found</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isApproved = submitted === 'approved';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md text-center">
          <div className="text-6xl mb-4">{isApproved ? '✅' : '📝'}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {isApproved ? 'Approved!' : 'Feedback Submitted'}
          </h2>
          <p className="text-gray-500">
            {isApproved
              ? 'Thank you for your approval. The team has been notified.'
              : 'Your feedback has been sent to the team. They\'ll make the requested changes.'}
          </p>
        </div>
      </div>
    );
  }

  const alreadyReviewed = item?.review_status === 'approved' || item?.review_status === 'changes_requested';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{item?.brand_name || 'Content Review'}</p>
            <h1 className="text-xl font-bold text-gray-900">
              {type === 'cms' ? item?.title : `${item?.platform?.charAt(0).toUpperCase() + item?.platform?.slice(1)} Post`}
            </h1>
          </div>
          {item?.review_status && item.review_status !== 'none' && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              item.review_status === 'approved' ? 'bg-green-100 text-green-700' :
              item.review_status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {item.review_status === 'approved' ? '✓ Approved' :
               item.review_status === 'pending_review' ? 'Awaiting Review' :
               'Changes Requested'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Content</h2>

            {type === 'cms' ? (
              <article
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item?.content || '<p><em>No content</em></p>' }}
              />
            ) : (
              <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  item?.platform === 'linkedin' ? 'bg-blue-100 text-blue-700' :
                  item?.platform === 'twitter' ? 'bg-sky-100 text-sky-700' :
                  item?.platform === 'facebook' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-pink-100 text-pink-700'
                }`}>
                  <span>{
                    item?.platform === 'linkedin' ? '💼' :
                    item?.platform === 'twitter' ? '🐦' :
                    item?.platform === 'facebook' ? '📘' : '📷'
                  }</span>
                  {item?.platform}
                  {item?.account_handle && <span className="opacity-70">@{item.account_handle}</span>}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {item?.content}
                </div>

                {item?.media_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.media_urls.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                    ))}
                  </div>
                )}

                {item?.link_url && (
                  <a href={item.link_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline break-all">
                    {item.link_url}
                  </a>
                )}

                {item?.scheduled_at && (
                  <p className="text-sm text-gray-500">
                    Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {type === 'cms' && (item?.seo_title || item?.seo_description) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">SEO Preview</h2>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-blue-700 text-lg font-medium truncate">{item.seo_title || item.title}</p>
                <p className="text-green-700 text-xs mt-0.5">{item.site_name || 'yoursite.com'}/{item.slug}</p>
                <p className="text-gray-600 text-sm mt-1">{item.seo_description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Review panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Your Review</h2>

            {alreadyReviewed ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">
                  {item.review_status === 'approved' ? '✅' : '📝'}
                </div>
                <p className="font-semibold text-gray-700">
                  {item.review_status === 'approved' ? 'Already Approved' : 'Feedback Already Submitted'}
                </p>
                {item.reviewer_name && (
                  <p className="text-sm text-gray-500 mt-1">by {item.reviewer_name}</p>
                )}
                {item.review_notes && (
                  <div className="mt-3 text-left bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{item.review_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Add any comments or feedback..."
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}

                <button
                  onClick={() => submit('approved')}
                  disabled={submitting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : '✓ Approve'}
                </button>

                <button
                  onClick={() => submit('changes_requested')}
                  disabled={submitting}
                  className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl border border-gray-300 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : '✏️ Request Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
