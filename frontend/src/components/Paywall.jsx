// src/components/Paywall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CreditCard, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react';

const QuotaPaywallCard = ({ errorDetails, onClose, onPaymentSuccess, onRetryAI }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentSent, setPaymentSent] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [checkoutId, setCheckoutId] = useState(null);
    const [pollingStatus, setPollingStatus] = useState('idle');
    const [pollingError, setPollingError] = useState(null);

    // Use a ref to track the polling interval across renders and handle unmounting safely
    const intervalRef = useRef(null);

    const paywallPayload = errorDetails?.detail || errorDetails || {};
    const currentUsage = paywallPayload.current_usage || errorDetails?.current_usage || 5;
    const rawAmount = paywallPayload.amount_payable || errorDetails?.amount_payable;
    const amountPayable = (rawAmount !== undefined && rawAmount !== null && !isNaN(parseFloat(rawAmount))) 
        ? parseFloat(rawAmount).toFixed(2) 
        : "5.00";
    const exceptionMessage = paywallPayload.error || errorDetails?.error || "Subscribe to unlock unlimited capabilities.";

    // Clear any active polling interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startPolling = (targetCheckoutId) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        setPollingStatus('polling');
        let attempts = 0;
        const maxAttempts = 20;

        const checkStatus = async () => {
            try {
                attempts += 1;
                const token = localStorage.getItem('token');
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                
                const response = await fetch(`${baseUrl}/api/payments/status/${targetCheckoutId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.status === 'completed' || data.status === 'Success' || data.status === 'success') {
                        clearInterval(intervalRef.current);
                        setPollingStatus('completed');
                        if (onPaymentSuccess) {
                            onPaymentSuccess({ status: 'completed', checkout_id: targetCheckoutId, amount: data.amount });
                        }
                        if (onRetryAI) {
                            setTimeout(() => onRetryAI(), 1000);
                        }
                        return;
                    }

                    if (data.status === 'failed' || data.status === 'Failed' || data.status === 'cancelled') {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment failed or was cancelled.');
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment timed out. Confirm the transaction on your phone or try again.');
                        return;
                    }
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
                attempts += 1;
                if (attempts >= maxAttempts) {
                    clearInterval(intervalRef.current);
                    setPollingStatus('failed');
                    setPollingError('Network error checking payment status.');
                }
            }
        };

        intervalRef.current = setInterval(checkStatus, 3000);
        checkStatus();
    };

    const handleMpesaCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLocalError(null);

        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        
        // Standardize input value parsing
        let formattedPhone = phoneNumber.trim().replace('+', '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
            formattedPhone = '254' + formattedPhone;
        }

        const payload = formattedPhone ? { phone_number: formattedPhone, payment_type: 'subscription' } : { payment_type: 'subscription' };

        try {
            const response = await fetch(`${baseUrl}/api/payments/checkout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                const reqId = data.CheckoutRequestID || data.checkout_id;
                setCheckoutId(reqId);
                setPaymentSent(true);
                localStorage.setItem('mpesa_checkout_id', reqId);
                
                if (onPaymentSuccess) {
                    onPaymentSuccess({ status: 'initiated', checkout_id: reqId, amount: data.amount_billed });
                }
                startPolling(reqId);
            } else {
                setLocalError(data.error || data.detail || "M-Pesa payment initiation failed.");
            }
        } catch (err) {
            console.error(err);
            setLocalError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden transition-all duration-300">
                {/* Close Control */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    disabled={pollingStatus === 'polling'}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Conditional View Placement with clean Ternary swap to prevent layout bloat */}
                {!paymentSent ? (
                    <div className="space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
                                <ShieldAlert className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Upgrade Required</h3>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Free Tier Limit Reached
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed">{exceptionMessage}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Queries Used</p>
                                <p className="text-lg font-bold text-gray-900 mt-0.5">{currentUsage} <span className="text-xs font-normal text-gray-400">/ 5</span></p>
                            </div>
                            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-center">
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">One Month</p>
                                <p className="text-lg font-bold text-green-700 mt-0.5">KES {amountPayable}</p>
                            </div>
                        </div>

                        <form onSubmit={handleMpesaCheckout} className="space-y-4 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    M-Pesa Phone Number
                                </label>
                                <input 
                                    type="tel"
                                    placeholder="07XXXXXXXX or 254..."
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm font-medium transition-all"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Empty inputs default to your registered line</p>
                            </div>

                            {localError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{localError}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4" />
                                            <span>Pay & Upgrade</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* The Entire Content Container Replaced Completely On Initiation */
                    <div className="text-center py-6 space-y-4 animate-fade-in">
                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                            pollingStatus === 'completed' ? 'bg-green-100' : pollingStatus === 'failed' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                            {pollingStatus === 'completed' ? (
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            ) : pollingStatus === 'failed' ? (
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            ) : (
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            )}
                        </div>

                        <div>
                            <h4 className="text-lg font-bold text-gray-900">
                                {pollingStatus === 'completed' ? 'Subscription Upgraded!' : pollingStatus === 'failed' ? 'Payment Failed' : 'STK Push Sent!'}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                {pollingStatus === 'completed' 
                                    ? 'Thank you! Enjoy your unlimited queries.' 
                                    : pollingStatus === 'failed' 
                                        ? 'Your transaction did not finalize.' 
                                        : 'Please enter your M-Pesa PIN when prompted.'}
                            </p>
                        </div>

                        {checkoutId && (
                            <p className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 inline-block">
                                ID: {checkoutId.slice(0, 14)}...
                            </p>
                        )}

                        <div className="w-full">
                            {pollingStatus === 'polling' && (
                                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                                    <p className="text-xs text-blue-700 font-semibold flex items-center justify-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Awaiting signature approval on your device...
                                    </p>
                                </div>
                            )}

                            {pollingStatus === 'completed' && (
                                <div className="p-3.5 bg-green-50 border border-green-100 rounded-xl">
                                    <p className="text-xs text-green-700 font-semibold flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Successfully activated premium package
                                    </p>
                                </div>
                            )}

                            {pollingStatus === 'failed' && (
                                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-xs text-red-700 font-semibold flex items-center justify-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{pollingError || 'Cancelled or transaction timed out.'}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors"
                            disabled={pollingStatus === 'polling'}
                        >
                            {pollingStatus === 'polling' ? 'Waiting for M-Pesa PIN...' : 'Continue'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotaPaywallCard;
