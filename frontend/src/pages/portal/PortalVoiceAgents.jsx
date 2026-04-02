import { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { portalAPI } from '../../services/portalApi';

export default function PortalVoiceAgents() {
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('agents');

  useEffect(() => {
    fetchAgents();
    fetchCalls();
  }, []);

  const fetchAgents = async () => {
    try {
      const r = await portalAPI.getVoiceAgents();
      setAgents(r.data.data?.agents || []);
    } catch { setAgents([]); }
    setLoading(false);
  };

  const fetchCalls = async () => {
    try {
      const r = await portalAPI.getVoiceAgentCalls();
      setCalls(r.data.data?.calls || []);
    } catch { setCalls([]); }
  };

  const requestCall = async (agentId) => {
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setRequesting(agentId); setError(''); setSuccess('');
    try {
      const r = await portalAPI.requestVoiceAgentCall(agentId, { phone: phone.trim() });
      setSuccess(r.data.message || 'Call requested! You will receive a call shortly.');
      setRequesting(null);
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to request call');
      setRequesting(null);
    }
  };

  const fmtDuration = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Phone Support</h1>
        <p className="text-gray-500 mb-6">Get instant help from our AI assistant over the phone. Request a callback and our AI agent will call you right away.</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab('agents')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'agents' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Request a Call
          </button>
          <button onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'history' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Call History {calls.length > 0 && <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{calls.length}</span>}
          </button>
        </div>

        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {tab === 'agents' && (
          <>
            {/* Phone number input */}
            <div className="bg-white rounded-lg border p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Phone Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full border rounded-lg px-3 py-2 text-sm max-w-sm" />
              <p className="text-xs text-gray-400 mt-1">We'll call you at this number</p>
            </div>

            {/* Agent cards */}
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <div className="text-4xl mb-3">🎙️</div>
                <p className="text-gray-500">No voice agents are currently available.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {agents.map(agent => (
                  <div key={agent.id} className="bg-white rounded-lg border p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">🎙️</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <span className="text-xs text-green-600">Available now</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">{agent.greeting}</p>
                    <button onClick={() => requestCall(agent.id)} disabled={requesting === agent.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                      {requesting === agent.id ? 'Requesting...' : 'Request Callback'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="bg-white rounded-lg border overflow-hidden">
            {calls.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No call history yet.</div>
            ) : (
              <div className="divide-y">
                {calls.map(call => (
                  <div key={call.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{call.agent_name || 'AI Agent'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          call.direction === 'inbound' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>{call.direction}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(call.started_at).toLocaleString()}</span>
                    </div>
                    {call.summary && <p className="text-sm text-gray-600 mb-1">{call.summary}</p>}
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Duration: {fmtDuration(call.duration_seconds)}</span>
                      {call.sentiment && (
                        <span className={call.sentiment === 'positive' ? 'text-green-500' : call.sentiment === 'negative' ? 'text-red-500' : ''}>
                          {call.sentiment}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
