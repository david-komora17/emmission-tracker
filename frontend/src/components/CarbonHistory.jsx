// src/components/CarbonHistory.jsx
import React, { useState, useEffect } from 'react';
import { X, Leaf, TreePine, Coins, Loader2, CheckCircle2, AlertCircle, Calendar, Crown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function CarbonHistory({ onClose, initialData }) {
    const [data, setData] = useState(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(null);
    const [showOffsetConfirm, setShowOffsetConfirm] = useState(false);
    
    // Offset Checkout & Polling State Variables
    const [offsetLoading, setOffsetLoading] = useState(false);
    const [paymentSent, setPaymentSent] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [checkoutId, setCheckoutId] = useState(null);
    const [pollingStatus, setPollingStatus] = useState('idle');
    const [pollingError, setPollingError] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');

    const resetOffsetFlow = () => {
        setShowOffsetConfirm(false);
        setPaymentSent(false);
        setLocalError(null);
        setPollingError(null);
        setCheckoutId(null);
        setPollingStatus('idle');
    };

    useEffect(() => {
        if (!initialData) {
            fetchHistoryData();
        } else {
            if (initialData.profile?.phone_number) {
                setPhoneNumber(initialData.profile.phone_number);
            }
        }
    }, [initialData]);

    const fetchHistoryData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const response = await fetch(`${baseUrl}/api/user/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch history: Status ${response.status}`);
            }

            const result = await response.json();
            setData(result);
            if (result.profile?.phone_number) {
                setPhoneNumber(result.profile.phone_number);
            }
        } catch (err) {
            setError(err.message || "Failed to load carbon history.");
        } finally {
            setLoading(false);
        }
    };

    const startPolling = (checkoutRequestId) => {
        setPollingStatus('polling');
        let attempts = 0;
        const maxAttempts = 20;
        let intervalId = null;

        const checkStatus = async () => {
            try {
                attempts += 1;
                const token = localStorage.getItem('token');
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                
                const response = await fetch(`${baseUrl}/api/payments/status/${checkoutRequestId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const resData = await response.json();
                
                if (response.ok) {
                    if (resData.status === 'completed') {
                        clearInterval(intervalId);
                        setPollingStatus('completed');
                        setTimeout(() => {
                            // Reset state and refresh profile balance metrics
                            setShowOffsetConfirm(false);
                            setPaymentSent(false);
                            setCheckoutId(null);
                            setPollingStatus('idle');
                            fetchHistoryData();
                        }, 1500);
                        return;
                    }
                    if (resData.status === 'failed') {
                        clearInterval(intervalId);
                        setPollingStatus('failed');
                        setPollingError('Payment failed or cancelled. Please try again.');
                        return;
                    }
                    if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        setPollingStatus('failed');
                        setPollingError('Payment processing timed out. Please verify via M-Pesa statements.');
                        return;
                    }
                    return;
                }
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    setPollingStatus('failed');
                    setPollingError('Payment processing timed out. Please verify via M-Pesa statements.');
                }
            } catch (err) {
                console.error('Error verifying transaction status:', err);
                attempts += 1;
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    setPollingStatus('failed');
                    setPollingError('Network error checking payment status.');
                }
            }
        };

        intervalId = setInterval(checkStatus, 3000);
        checkStatus();
    };

    const handleOffsetPayment = async (e) => {
        if (e) e.preventDefault();
        setOffsetLoading(true);
        setLocalError(null);
        setPollingError(null);

        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const payload = phoneNumber ? { phone_number: phoneNumber.trim() } : {};

        try {
            const response = await fetch(`${baseUrl}/api/payments/checkout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const resData = await response.json();

            if (response.ok) {
                setCheckoutId(resData.CheckoutRequestID);
                setPaymentSent(true);
                startPolling(resData.CheckoutRequestID);
            } else {
                setLocalError(resData.error || "M-Pesa authorization sequence failed.");
            }
        } catch (err) {
            console.error(err);
            setLocalError("Network error. Please verify host accessibility.");
        } finally {
            setOffsetLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full">
                    <LoadingSpinner />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-xl">
                            <Leaf className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Carbon History</h2>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {data?.profile?.username || 'User'} • Lifetime Footprint
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Carbon Balance Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Emitted</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {data.lifetime_footprint_balance?.cumulative_emitted_kg?.toFixed(1) || '0.0'}
                                        <span className="text-sm font-normal text-gray-400"> kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Saved</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {data.lifetime_footprint_balance?.cumulative_saved_kg?.toFixed(1) || '0.0'}
                                        <span className="text-sm font-normal text-gray-400"> kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl text-center">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Offset</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {data.lifetime_footprint_balance?.cumulative_offset_kg?.toFixed(1) || '0.0'}
                                        <span className="text-sm font-normal text-gray-400"> kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-200">
                                    <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Net Debt</p>
                                    <p className="text-xl font-bold text-amber-700">
                                        {data.lifetime_footprint_balance?.net_outstanding_deficit_kg?.toFixed(1) || '0.0'}
                                        <span className="text-sm font-normal text-amber-500"> kg</span>
                                    </p>
                                </div>
                            </div>

                            {showOffsetConfirm ? (
                                <div className="min-h-[320px] rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/80 to-white p-5 shadow-sm flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 rounded-xl">
                                                <Coins className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Offset Carbon Debt</h4>
                                                <p className="text-xs text-gray-500">Authorize payment for structural green offset</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white/80 rounded-xl border border-gray-200 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Outstanding Debt</span>
                                                <span className="font-bold text-amber-600">
                                                    {data.lifetime_footprint_balance?.net_outstanding_deficit_kg?.toFixed(1)} kg CO2e
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Estimated Cost</span>
                                                <span className="font-bold text-green-600">
                                                    KES {Math.max(5, Math.ceil(data.lifetime_footprint_balance?.net_outstanding_deficit_kg * 0.5))}
                                                </span>
                                            </div>
                                        </div>

                                        {!paymentSent ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                        M-Pesa Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="2547XXXXXXXX"
                                                        value={phoneNumber}
                                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                                        pattern="254[0-9]{9}"
                                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">Leave blank to use defaults</p>
                                                </div>

                                                {localError && (
                                                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs">
                                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                                        <span>{localError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                                                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
                                                <h5 className="text-sm font-bold text-gray-900">STK Push Inflight!</h5>
                                                <p className="text-xs text-gray-600 mt-0.5">Please check your handset interface prompt</p>

                                                {checkoutId && (
                                                    <p className="text-[10px] text-gray-400 mt-1.5 font-mono">Ref: {checkoutId.slice(0, 14)}...</p>
                                                )}

                                                {pollingStatus === 'polling' && (
                                                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg mt-3 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Awaiting transaction authorization...
                                                    </div>
                                                )}

                                                {pollingStatus === 'completed' && (
                                                    <div className="p-2 bg-green-100 border border-green-200 rounded-lg mt-3 flex items-center justify-center gap-2 text-xs text-green-700 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Verification Successful!
                                                    </div>
                                                )}

                                                {pollingStatus === 'failed' && (
                                                    <div className="p-2 bg-red-50 border border-red-100 rounded-lg mt-3 flex items-center justify-center gap-2 text-xs text-red-600 font-medium text-left">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{pollingError || 'Verification error encountered.'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={resetOffsetFlow}
                                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 text-sm font-medium transition-colors"
                                        >
                                            {paymentSent ? 'Done!' : 'Cancel'}
                                        </button>
                                        {!paymentSent && (
                                            <button
                                                onClick={handleOffsetPayment}
                                                disabled={offsetLoading}
                                                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                {offsetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TreePine className="w-4 h-4" />}
                                                Pay & Offset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => {
                                                resetOffsetFlow();
                                                setShowOffsetConfirm(true);
                                            }}
                                            disabled={data.lifetime_footprint_balance?.net_outstanding_deficit_kg <= 0}
                                            className={`p-4 rounded-xl border transition-all ${
                                                data.lifetime_footprint_balance?.net_outstanding_deficit_kg <= 0
                                                    ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                                                    : 'bg-green-50 border-green-200 hover:bg-green-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <TreePine className={`w-5 h-5 ${
                                                    data.lifetime_footprint_balance?.net_outstanding_deficit_kg <= 0
                                                        ? 'text-gray-400'
                                                        : 'text-green-600'
                                                }`} />
                                                <div className="flex-1 text-left">
                                                    <p className="text-sm font-medium text-gray-900">Offset Carbon</p>
                                                    <p className="text-xs text-gray-500">
                                                        {data.lifetime_footprint_balance?.net_outstanding_deficit_kg <= 0
                                                            ? ' Carbon neutral!'
                                                            : `${data.lifetime_footprint_balance?.net_outstanding_deficit_kg?.toFixed(1)} kg remaining`}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                onClose();
                                                window.dispatchEvent(new CustomEvent('openPaywall'));
                                            }}
                                            className="p-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Crown className="w-5 h-5 text-amber-600" />
                                                <div className="flex-1 text-left">
                                                    <p className="text-sm font-medium text-gray-900">Upgrade Premium</p>
                                                    <p className="text-xs text-gray-500">Unlimited AI queries</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Activity Log */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Activity Log
                                        </h4>
                                        <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar">
                                            {data.historical_activity_logs?.length > 0 ? (
                                                data.historical_activity_logs.map((log) => (
                                                    <div key={log.log_id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-700 truncate">
                                                                    {log.activity_description}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-xs font-medium text-gray-400 uppercase">
                                                                        {log.category}
                                                                    </span>
                                                                    <span className="text-xs text-gray-300">•</span>
                                                                    <span className="text-xs text-gray-400">{log.date}</span>
                                                                    <span className="text-xs text-gray-300">•</span>
                                                                    <span className="text-xs text-gray-400">{log.time}</span>
                                                                </div>
                                                            </div>
                                                            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                                log.metrics.co2e_impact_kg > 0
                                                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                                                    : 'bg-green-50 text-green-600 border border-green-200'
                                                            }`}>
                                                                {log.metrics.co2e_impact_kg > 0 ? '+' : ''}
                                                                {log.metrics.co2e_impact_kg} kg
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                                                    No activity logged yet. Start tracking your carbon footprint!
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}