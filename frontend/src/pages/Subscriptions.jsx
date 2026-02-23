import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { subscriptionAPI, brandAPI } from '../services/api';

const Subscriptions = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => { fetchBrands(); fetchPlans(); }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetchSubscription();
      fetchPaymentMethods();
      fetchBillingHistory();
    }
  }, [selectedBrand]);

  const fetchBrands = async () => {
    try {
      const response = await brandAPI.getUserBrands();
      const brandsData = response.data.data?.brands || [];
      setBrands(brandsData);
      if (brandsData.length > 0) setSelectedBrand(brandsData[0]);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await subscriptionAPI.getPlans();
      setPlans(response.data.data?.plans || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const fetchSubscription = async () => {
    try {
      const response = await subscriptionAPI.getSubscription(selectedBrand.id);
      setSubscription(response.data.data?.subscription || null);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to load subscription:', err);
      }
      setSubscription(null);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await subscriptionAPI.getPaymentMethods(selectedBrand.id);
      setPaymentMethods(response.data.data?.payment_methods || []);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const response = await subscriptionAPI.getBillingHistory(selectedBrand.id);
      setBillingHistory(response.data.data?.billing_history || []);
    } catch (err) {
      console.error('Failed to load billing history:', err);
    }
  };

  const handleSubscribe = async (planId) => {
    setSubscribing(true);
    setError('');
    try {
      await subscriptionAPI.createSubscription(selectedBrand.id, { plan_id: planId });
      setSuccessMessage('Subscription created successfully');
      fetchSubscription();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleChangePlan = async (planId) => {
    setSubscribing(true);
    setError('');
    try {
      await subscriptionAPI.updateSubscription(selectedBrand.id, { plan_id: planId });
      setSuccessMessage('Plan updated successfully');
      fetchSubscription();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError('');
    try {
      await subscriptionAPI.cancelSubscription(selectedBrand.id);
      setSuccessMessage('Subscription cancelled. Access continues until the end of the billing period.');
      setShowCancelModal(false);
      fetchSubscription();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleResume = async () => {
    setError('');
    try {
      await subscriptionAPI.resumeSubscription(selectedBrand.id);
      setSuccessMessage('Subscription resumed successfully');
      fetchSubscription();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resume subscription');
    }
  };

  const handleSetDefault = async (methodId) => {
    try {
      await subscriptionAPI.setDefaultPaymentMethod(selectedBrand.id, methodId);
      setSuccessMessage('Default payment method updated');
      fetchPaymentMethods();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment method');
    }
  };

  const handleDeletePaymentMethod = async (methodId) => {
    if (!window.confirm('Remove this payment method?')) return;
    try {
      await subscriptionAPI.deletePaymentMethod(selectedBrand.id, methodId);
      setSuccessMessage('Payment method removed');
      fetchPaymentMethods();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove payment method');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-red-100 text-red-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'cancel_at_period_end': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading subscriptions...</p>
        </div>
      </Layout>
    );
  }

  if (!selectedBrand) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">No brands available. Create a brand first.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-gray-600 mt-1">Manage your plan and billing</p>
          </div>

          {brands.length > 1 && (
            <select
              value={selectedBrand?.id || ''}
              onChange={(e) => setSelectedBrand(brands.find(b => b.id === e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {['overview', 'plans', 'payment methods', 'billing history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {subscription ? (
              <>
                {/* Current Plan Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{subscription.plan_name || 'Current Plan'}</h2>
                      <p className="text-gray-500 text-sm mt-1">
                        {formatCurrency(subscription.amount, subscription.currency)} / {subscription.billing_interval === 'year' || subscription.billing_interval === 'annual' ? 'year' : 'month'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                      {subscription.status?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Started</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(subscription.current_period_start)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Next Renewal</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(subscription.current_period_end)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Trial Ends</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(subscription.trial_end) || 'No trial'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium">Cancel At Period End</p>
                      <p className="text-sm text-gray-900 mt-1">{subscription.cancel_at_period_end ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Change Plan
                    </button>
                    {subscription.cancel_at_period_end ? (
                      <button
                        onClick={handleResume}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                      >
                        Resume Subscription
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="bg-white text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 text-sm font-medium"
                      >
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                </div>

                {/* Usage Summary */}
                {subscription.usage && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(subscription.usage).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-xl font-bold text-gray-900 mt-1">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-5xl mb-4">💳</p>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-6">Choose a plan to get started</p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div>
            {plans.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <p className="text-gray-500">No plans available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const isCurrent = subscription?.plan_id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                        isCurrent ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      {isCurrent && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mb-3">
                          Current Plan
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <div className="mt-2 mb-4">
                        <span className="text-3xl font-bold text-gray-900">
                          {formatCurrency(plan.price, plan.currency)}
                        </span>
                        <span className="text-gray-500 text-sm"> / {plan.billing_interval === 'year' || plan.billing_interval === 'annual' ? 'year' : 'month'}</span>
                      </div>

                      {plan.description && (
                        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                      )}

                      {plan.features && Array.isArray(plan.features) && (
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="text-green-500">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-2 text-sm text-gray-600 mb-6">
                        {plan.max_clients && (
                          <div className="flex justify-between">
                            <span>Clients</span>
                            <span className="font-medium">{plan.max_clients === -1 ? 'Unlimited' : plan.max_clients}</span>
                          </div>
                        )}
                        {plan.max_projects && (
                          <div className="flex justify-between">
                            <span>Projects</span>
                            <span className="font-medium">{plan.max_projects === -1 ? 'Unlimited' : plan.max_projects}</span>
                          </div>
                        )}
                        {plan.storage_limit_gb && (
                          <div className="flex justify-between">
                            <span>Storage</span>
                            <span className="font-medium">{plan.storage_limit_gb} GB</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => isCurrent ? null : (subscription ? handleChangePlan(plan.id) : handleSubscribe(plan.id))}
                        disabled={isCurrent || subscribing}
                        className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
                          isCurrent
                            ? 'bg-gray-100 text-gray-500 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                        }`}
                      >
                        {isCurrent ? 'Current Plan' : subscribing ? 'Processing...' : subscription ? 'Switch to This Plan' : 'Select Plan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Payment Methods Tab */}
        {activeTab === 'payment methods' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>

            {paymentMethods.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-4">💳</p>
                <p className="text-gray-500 mb-2">No payment methods on file</p>
                <p className="text-gray-400 text-sm">Payment methods are added automatically when you subscribe to a plan via Stripe.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {method.card_brand} •••• {method.card_last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {method.card_exp_month}/{method.card_exp_year}
                        </p>
                      </div>
                      {method.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">Default</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!method.is_default && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Billing History Tab */}
        {activeTab === 'billing history' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
            </div>

            {billingHistory.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-5xl mb-4">🧾</p>
                <p className="text-gray-500">No billing history yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billingHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.created_at || item.billing_date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description || item.plan_name || 'Subscription charge'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount, item.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === 'paid' ? 'bg-green-100 text-green-800' :
                          item.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Subscription</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel? You'll keep access until the end of your current billing period on{' '}
                <strong>{formatDate(subscription?.current_period_end)}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Subscriptions;
