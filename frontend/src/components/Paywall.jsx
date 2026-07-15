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

    const intervalRef = useRef(null);

    const paywallPayload = errorDetails?.detail || errorDetails || {};
    const currentUsage = paywallPayload.current_usage || errorDetails?.current_usage || 5;
    const rawAmount = paywallPayload.amount_payable || errorDetails?.amount_payable;
    const amountPayable = (rawAmount !== undefined && rawAmount !== null && !isNaN(parseFloat(rawAmount))) 
        ? parseFloat(rawAmount).toFixed(2) 
        : "5.00";
    const exceptionMessage = paywallPayload.error || errorDetails?.error || "Subscribe to unlock unlimited capabilities.";

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
                    if (data.status === 'completed') {
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

                    if (data.status === 'failed') {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment failed or cancelled. Please try again.');
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(intervalRef.current);
                        setPollingStatus('failed');
                        setPollingError('Payment processing timed out. Please confirm the prompt on your phone.');
                        return;
                    }

                    return;
                }

                if (attempts >= maxAttempts) {
                    clearInterval(intervalRef.current);
                    setPollingStatus('failed');
                    setPollingError('Payment verification taking longer than expected.');
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
        const payload = phoneNumber ? { phone_number: phoneNumber.trim(), payment_type: 'subscription' } : { payment_type: 'subscription' };

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-10"
                    disabled={pollingStatus === 'polling'}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Conditional Card Content via Ternary Operator */}
                {!paymentSent ? (
                    /* STATE 1: PAYWALL SUBSCRIPTION FORM */
                    <div className="overflow-y-auto pr-1 space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
                                <ShieldAlert className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Upgrade Required</h3>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Free Tier Limit Reached
                                </p>
                            </div>
                        </div>

                        {/* Error Context message */}
                        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                            <p className="text-sm text-gray-700 leading-relaxed">{exceptionMessage}</p>
                        </div>

                        {/* Usage & Cost Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Queries Used</p>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">
                                    {currentUsage} <span className="text-sm font-normal text-gray-400">/ 5</span>
                                </p>
                            </div>
                            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-center">
                                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Unlimited Access</p>
                                <p className="text-xl font-bold text-green-700 mt-0.5">KES {amountPayable}</p>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Checkout Form */}
                        <form onSubmit={handleMpesaCheckout} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    M-Pesa Phone Number 
                                </label>
                                <input 
                                    type="text"
                                    placeholder="2547XXXXXXXX"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    pattern="254[0-9]{9}"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                                />
                                <p className="text-xs text-gray-400 mt-1.5">Leave blank to use your registered account number</p>
                            </div>

                            {localError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 font-medium">{localError}</p>
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
                    </div>
                ) : (
                    /* STATE 2: DYNAMIC STK PUSH STATUS CARD (Wholly replaces inner contents) */
                    <div className="flex flex-col items-center justify-center text-center py-4 space-y-4">
                        
                        {/* Dynamic Status Icon */}
                        <div className="relative flex items-center justify-center">
                            {pollingStatus === 'polling' && (
                                <div className="relative w-16 h-16 flex items-center justify-center">
                                    <Loader2 className="w-16 h-16 text-green-500 animate-spin absolute" />
                                    <CreditCard className="w-6 h-6 text-green-600" />
                                </div>
                            )}
                            {pollingStatus === 'completed' && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-full">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                            )}
                            {pollingStatus === 'failed' && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-full">
                                    <AlertCircle className="w-12 h-12 text-red-600" />
                                </div>
                            )}
                        </div>

                        {/* Title and Descriptions */}
                        <div>
                            <h4 className="text-xl font-extrabold text-gray-900">
                                {pollingStatus === 'polling' && "STK Push Initiated"}
                                {pollingStatus === 'completed' && "Upgrade Successful!"}
                                {pollingStatus === 'failed' && "Payment Unsuccessful"}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                                {pollingStatus === 'polling' && "Please input your M-Pesa PIN on the prompt sent to your device."}
                                {pollingStatus === 'completed' && "Your subscription is now active. Enjoy premium features."}
                                {pollingStatus === 'failed' && (pollingError || "The checkout session was cancelled or timed out.")}
                            </p>
                        </div>

                        {/* Reference Receipt Pin */}
                        {checkoutId && (
                            <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg">
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Transaction Ref</span>
                                <span className="text-xs font-mono font-bold text-gray-700">{checkoutId.slice(0, 18)}...</span>
                            </div>
                        )}

                        {/* Status Inline Toast Box */}
                        <div className="w-full max-w-sm mt-1">
                            {pollingStatus === 'polling' && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                                    <p className="text-xs text-blue-700 font-semibold flex items-center justify-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Verifying transaction with Safaricom...
                                    </p>
                                </div>
                            )}
                            {pollingStatus === 'completed' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                                    <p className="text-xs text-green-700 font-semibold flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Your access is unlocked!
                                    </p>
                                </div>
                            )}
                            {pollingStatus === 'failed' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-xs text-red-700 font-semibold flex items-center justify-center gap-1.5">
                                        <AlertCircle className="w-4 h-4" />
                                        Payment request failed
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Control Button */}
                        <div className="w-full pt-4">
                            <button
                                onClick={onClose}
                                className="w-full px-5 py-2.5 bg-gray-950 hover:bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-500 rounded-xl text-sm font-semibold transition-all shadow-sm"
                                disabled={pollingStatus === 'polling'}
                            >
                                {pollingStatus === 'polling' ? 'Waiting for confirmation...' : 'Dismiss'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotaPaywallCard;
