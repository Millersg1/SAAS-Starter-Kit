import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicSurveyAPI } from '../services/api';

export default function SurveyResponse() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const [survey, setSurvey]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [score, setScore]           = useState(null);
  const [comment, setComment]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    const prefillScore = searchParams.get('score');
    publicSurveyAPI.get(token)
      .then(res => {
        const data = res.data.data;
        if (data.already_responded) {
          setSubmitted(true);
        } else {
          setSurvey(data);
          if (prefillScore !== null) setScore(parseInt(prefillScore));
        }
      })
      .catch(() => setError('This survey link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await publicSurveyAPI.submit(token, { score, comment: comment.trim() || undefined });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg?.includes('Already')) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isNps  = survey?.type !== 'csat';
  const scores = isNps
    ? Array.from({ length: 11 }, (_, i) => i)
    : Array.from({ length: 5 },  (_, i) => i + 1);

  const scoreColor = (n) => {
    if (isNps) {
      if (n >= 9) return score === n ? 'bg-green-500 text-white scale-110' : 'bg-green-50 text-green-700 hover:bg-green-100';
      if (n >= 7) return score === n ? 'bg-yellow-500 text-white scale-110' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
      return score === n ? 'bg-red-500 text-white scale-110' : 'bg-red-50 text-red-700 hover:bg-red-100';
    }
    if (n >= 4) return score === n ? 'bg-green-500 text-white scale-110' : 'bg-green-50 text-green-700 hover:bg-green-100';
    if (n === 3) return score === n ? 'bg-yellow-500 text-white scale-110' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
    return score === n ? 'bg-red-500 text-white scale-110' : 'bg-red-50 text-red-700 hover:bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Link Invalid</h2>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        ) : submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Thank you!</h2>
            <p className="text-gray-500 text-sm">
              {survey?.brand_name
                ? `${survey.brand_name} appreciates your feedback.`
                : 'Your feedback has been recorded.'}
            </p>
          </div>
        ) : (
          <>
            {/* Brand header */}
            {survey?.brand_name && (
              <p className="text-center text-sm font-semibold text-blue-700 mb-1">{survey.brand_name}</p>
            )}
            {survey?.client_name && (
              <p className="text-center text-sm text-gray-500 mb-4">Hi, {survey.client_name} 👋</p>
            )}

            {/* Question */}
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6 leading-snug">
              {survey?.question}
            </h2>

            {/* Scale hint */}
            <div className="flex justify-between text-xs text-gray-400 mb-2 px-1">
              <span>{isNps ? '0 — Not at all' : '1 — Very dissatisfied'}</span>
              <span>{isNps ? '10 — Extremely likely' : '5 — Very satisfied'}</span>
            </div>

            {/* Score buttons */}
            <div className={`flex gap-2 mb-6 ${isNps ? 'flex-wrap justify-center' : 'justify-center'}`}>
              {scores.map(n => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm border transition-all transform ${scoreColor(n)}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional comments <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us more…"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={score === null || submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
