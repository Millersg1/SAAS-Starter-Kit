import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { brandAPI } from '../services/api';

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', desc: 'Formal, expert, authoritative' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, conversational' },
  { value: 'bold', label: 'Bold', desc: 'Direct, confident, impactful' },
  { value: 'playful', label: 'Playful', desc: 'Fun, energetic, creative' },
  { value: 'empathetic', label: 'Empathetic', desc: 'Caring, supportive, understanding' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Expert, commanding, trustworthy' },
];

const defaultVoice = {
  tone: 'professional',
  target_audience: '',
  industry: '',
  brand_keywords: '',
  avoid_words: '',
  writing_style_notes: '',
  sample_copy: '',
};

export default function BrandVoice() {
  const [brand, setBrand] = useState(null);
  const [voice, setVoice] = useState(defaultVoice);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    brandAPI.getBrands().then(res => {
      const b = (res.data.data || [])[0];
      setBrand(b);
      if (b) {
        brandAPI.getBrandVoice(b.id).then(r => {
          setVoice({ ...defaultVoice, ...r.data.data });
        }).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, []);

  const setField = (key, value) => setVoice(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      await brandAPI.updateBrandVoice(brand.id, voice);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    setSaving(false);
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64 text-gray-400">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Brand Voice Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            These settings guide all AI-generated content — social captions, blog posts, and reports — to sound consistently on-brand.
          </p>
        </div>

        <div className="space-y-6">
          {/* Tone selector */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Brand Tone</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setField('tone', opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    voice.tone === opt.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Audience & Industry */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Audience & Industry</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                <input
                  value={voice.target_audience}
                  onChange={e => setField('target_audience', e.target.value)}
                  placeholder="e.g. Small business owners, marketing managers aged 30-50"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <input
                  value={voice.industry}
                  onChange={e => setField('industry', e.target.value)}
                  placeholder="e.g. Digital marketing, SaaS, Healthcare"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Keywords & Word Choice</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Brand Keywords <span className="text-gray-400 font-normal">(use naturally in content)</span>
                </label>
                <input
                  value={voice.brand_keywords}
                  onChange={e => setField('brand_keywords', e.target.value)}
                  placeholder="e.g. growth, results, partnership, innovation"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Words to Avoid <span className="text-gray-400 font-normal">(never use these)</span>
                </label>
                <input
                  value={voice.avoid_words}
                  onChange={e => setField('avoid_words', e.target.value)}
                  placeholder="e.g. cheap, synergy, leverage, game-changer"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Writing Style & Sample */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Writing Style</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style Notes</label>
                <textarea
                  value={voice.writing_style_notes}
                  onChange={e => setField('writing_style_notes', e.target.value)}
                  rows={3}
                  placeholder="e.g. Use short sentences. Lead with benefits, not features. Ask rhetorical questions. Use data when possible."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sample Copy <span className="text-gray-400 font-normal">(show AI how you write)</span>
                </label>
                <textarea
                  value={voice.sample_copy}
                  onChange={e => setField('sample_copy', e.target.value)}
                  rows={4}
                  placeholder="Paste a paragraph of existing content that perfectly represents your brand voice..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">The AI will study this example and match the style in all generated content.</p>
              </div>
            </div>
          </div>

          {/* Preview strip */}
          {(voice.tone || voice.target_audience) && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-5">
              <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">✨ Brand Voice Summary</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                AI will write in a <strong>{voice.tone || 'professional'}</strong> tone
                {voice.target_audience && <>, targeting <strong>{voice.target_audience}</strong></>}
                {voice.industry && <> in the <strong>{voice.industry}</strong> industry</>}
                {voice.brand_keywords && <>, using keywords like <em>{voice.brand_keywords.split(',').slice(0, 3).join(', ')}</em></>}
                {voice.avoid_words && <>, avoiding words like <em>{voice.avoid_words.split(',').slice(0, 2).join(', ')}</em></>}.
              </p>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Brand Voice'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
