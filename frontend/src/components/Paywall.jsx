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

    const currentUsage = errorDetails?.current_usage || 5;
    const rawAmount = errorDetails?.amount_payable;
    const amountPayable = (rawAmount !== undefined && rawAmount !== null && !isNaN(parseFloat(rawAmount))) 
        ? parseFloat(rawAmount).toFixed(2) 
        : "5.00";
    const exceptionMessage = errorDetails?.error || "Subscribe to unlock unlimited capabilities.";

    // Clear any active polling interval on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startPolling = (targetCheckoutId) => {
        // Clear any existing poll before starting a new one
        if (intervalRef.current) clearInterval(intervalRef.current);

        setPollingStatus('polling');
        let attempts = 0;
        const maxAttempts = 20;

        const checkStatus = async () => {
            try {
                const token = localStorage.getItem('token');
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
                
                const response = await fetch(`${baseUrl}/api/payments/status/${targetCheckoutId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    if (data.status === 'completed') {
                        clearInterval(intervalRef.current);
                        setPollingStatus('completed');
                        if (onPaymentSuccess) {
                            onPaymentSuccess({ status: 'completed', checkout_id: targetCheckoutId, amount: data.amount });
                        }
                        if (onRetryAI) {
                            setTimeout(() => onRetryAI(), 1000);
                        }
                    } else if (data.status === 'failed') {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment failed. Please try again.');
                    }
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment is taking longer than expected. Please check your M-Pesa.');
                    }
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(intervalRef.current);
                    setPollingStatus('failed');
                    setPollingError('Network error checking payment status.');
                }
            }
        };

        // Execute immediately, then poll every 3 seconds
        checkStatus();
        intervalRef.current = setInterval(checkStatus, 3000);
    };

    const handleMpesaCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLocalError(null);

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

            const data = await response.json();

            if (response.ok) {
                const reqId = data.CheckoutRequestID;
                setCheckoutId(reqId);
                setPaymentSent(true);
                localStorage.setItem('mpesa_checkout_id', reqId);
                
                if (onPaymentSuccess) {
                    onPaymentSuccess({ status: 'initiated', checkout_id: reqId, amount: data.amount_billed });
                }
                startPolling(reqId);
            } else {
                setLocalError(data.error || "M-Pesa payment initiation failed.");
            }
        } catch (err) {
            console.error(err);
            setLocalError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const renderPollingStatus = () => {
        switch (pollingStatus) {
            case 'polling':
                return (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3">
                        <p className="text-sm text-blue-600 font-medium flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing your payment...
                        </p>
                    </div>
                );
            case 'completed':
                return (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl mt-3">
                        <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Payment successful! Redirecting...
                        </p>
                    </div>
                );
            case 'failed':
                return (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl mt-3">
                        <p className="text-sm text-red-600 font-medium flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {pollingError || 'Payment failed. Please try again.'}
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={pollingStatus === 'polling'}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Upgrade Required</h3>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Free Tier Limit Reached
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl mb-6">
                    <p className="text-sm text-gray-700">{exceptionMessage}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Queries Used</p>
                        <p className="text-xl font-bold text-gray-900">{currentUsage} <span className="text-sm font-normal text-gray-400">/ 5</span></p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-center">
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider">One Month</p>
                        <p className="text-xl font-bold text-green-700">KES {amountPayable}</p>
                    </div>
                </div>

                <hr className="border-gray-200 mb-6" />

                {!paymentSent ? (
                    <form onSubmit={handleMpesaCheckout} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                M-Pesa Phone Number <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                            </label>
                            <input 
                                type="text"
                                placeholder="2547XXXXXXXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                pattern="254[0-9]{9}"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                            />
                            <p className="text-xs text-gray-400 mt-1">Leave blank to use your registered number</p>
                        </div>

                        {localError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-600">{localError}</p>
                            </div>
                        )}

                        <div className="flex gap-3">
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
                                className="flex-[2] px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard className="w-4 h-4" />
                                        Pay & Upgrade
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <h4 className="text-lg font-bold text-gray-900">STK Push Sent!</h4>
                            <p className="text-sm text-gray-600 mt-1">Check your phone for the M-Pesa prompt</p>
                            {checkoutId && (
                                <p className="text-xs text-gray-400 mt-2 font-mono bg-white/50 inline-block px-2 py-0.5 rounded border border-green-100">
                                    Ref: {checkoutId.slice(0, 16)}...
                                </p>
                            )}
                            {renderPollingStatus()}
                            <button
                                onClick={onClose}
                                className="w-full mt-4 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                                disabled={pollingStatus === 'polling'}
                            >
                                {pollingStatus === 'polling' ? 'Waiting for M-Pesa Pin...' : 'Done'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotaPaywallCard;