// src/components/QuotaPaywallCard.jsx
import React, { useState } from 'react';
import { ShieldAlert, CreditCard, Sparkles, Loader2, CheckCircle2, X } from 'lucide-react';

const QuotaPaywallCard = ({ errorDetails, onClose, onPaymentSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentSent, setPaymentSent] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [checkoutId, setCheckoutId] = useState(null);

    // Extract precise structured limits thrown by backend PremiumTierPermission
    const currentUsage = errorDetails?.current_usage || 5;
    
    const rawAmount = errorDetails?.amount_payable;
    const amountPayable = (rawAmount !== undefined && rawAmount !== null && !isNaN(parseFloat(rawAmount))) 
        ? parseFloat(rawAmount).toFixed(2) 
        : "5.00";

    const exceptionMessage = errorDetails?.error || "Beyond this point you need to subscribe to unlock unlimited capabilities.";

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
                setCheckoutId(data.CheckoutRequestID);
                setPaymentSent(true);
                
                // Store checkout ID for verification
                localStorage.setItem('mpesa_checkout_id', data.CheckoutRequestID);
                
                // Notify parent component about payment initiation
                if (onPaymentSuccess) {
                    onPaymentSuccess({
                        status: 'initiated',
                        checkout_id: data.CheckoutRequestID,
                        amount: data.amount_billed
                    });
                }
            } else {
                setLocalError(data.error || "M-Pesa API gateway processing handshake failed.");
            }
        } catch (err) {
            console.error(err);
            setLocalError("Network connectivity timeout reaching Safaricom node endpoints.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // If payment was sent but not confirmed, we could optionally check status
        if (paymentSent) {
            // You could add a callback to check payment status
            // For now, just close the modal
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="w-full max-w-md bg-gradient-to-br from-zinc-900 via-emerald-950/30 to-zinc-900 border border-emerald-500/20 rounded-3xl p-6 shadow-2xl shadow-emerald-500/10 relative space-y-6">
                
                {/* Decorative Premium Glow Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-start space-x-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl shrink-0">
                        <ShieldAlert className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-white">
                            Upgrade Required
                        </h3>
                        <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest">
                            Free Tier Limit Reached
                        </p>
                    </div>
                </div>

                {/* Message Body */}
                <div className="p-4 bg-white/5 border border-emerald-500/10 rounded-xl">
                    <p className="text-xs font-medium text-white/70 leading-relaxed">
                        {exceptionMessage}
                    </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center">
                        <span className="block text-[9px] font-bold text-white/40 uppercase tracking-widest">Queries Used</span>
                        <span className="text-xl font-black text-white">
                            {currentUsage}
                            <span className="text-sm font-normal text-white/30"> / 5</span>
                        </span>
                    </div>
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
                        <span className="block text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest">One Month</span>
                        <span className="text-xl font-black text-emerald-400">
                            KES {amountPayable}
                        </span>
                    </div>
                </div>

                <hr className="border-emerald-500/10" />

                {/* M-Pesa Form */}
                {!paymentSent ? (
                    <form onSubmit={handleMpesaCheckout} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">
                                M-Pesa Phone Number
                                <span className="text-white/20 font-normal ml-1">(Optional)</span>
                            </label>
                            <input 
                                type="text"
                                placeholder="2547XXXXXXXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                pattern="254[0-9]{9}"
                                className="w-full p-3 bg-black/40 border border-emerald-500/10 rounded-xl focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 text-sm text-white font-mono tracking-widest placeholder:text-white/20 transition-all"
                            />
                            <p className="text-[9px] text-emerald-400/30 font-medium">
                                Leave blank to use your registered phone number
                            </p>
                        </div>

                        {localError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-red-300 text-xs font-medium flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                    {localError}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:from-emerald-800/50 disabled:to-green-800/50 disabled:cursor-not-allowed text-white p-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
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
                ) : (
                    // Payment Sent Success State
                    <div className="space-y-4">
                        <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-center space-y-3">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">STK Push Sent!</h4>
                                <p className="text-xs text-emerald-400/60 mt-1 font-medium">
                                    Check your phone for the M-Pesa prompt
                                </p>
                                {checkoutId && (
                                    <p className="text-[9px] text-emerald-400/30 mt-2 font-mono">
                                        Ref: {checkoutId.slice(0, 12)}...
                                    </p>
                                )}
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider p-3 rounded-xl border border-white/10 transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotaPaywallCard;