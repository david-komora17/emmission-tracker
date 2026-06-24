// src/components/QuotaPaywallCard.jsx
import React, { useState } from 'react';
import { ShieldAlert, CreditCard, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const QuotaPaywallCard = ({ errorDetails, onClose, onPaymentSuccess }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [paymentSent, setPaymentSent] = useState(false);
    const [localError, setLocalError] = useState(null);

    // Extract precise structured limits thrown by backend PremiumTierPermission
    const currentUsage = errorDetails?.current_usage || 5;
    const amountPayable = errorDetails?.amount_payable ? errorDetails.amount_payable.toFixed(2) : "5.00";
    const exceptionMessage = errorDetails?.error || "Beyond this point you need to subscribe to unlock unlimited capabilities.";

    const handleMpesaCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLocalError(null);

        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        // Prepare optional customized structural phone asset token overriding backend defaults
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
                setPaymentSent(true);
                alert(`STK Push notification initialized to your device!`);
                if (onPaymentSuccess) {
                    // Triggers state recalculations upstream if applicable
                    onPaymentSuccess(data);
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

    return (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-6 overflow-hidden">
                
                {/* Decorative Premium Glow Element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header Information Context */}
                <div className="flex items-start space-x-3.5">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shrink-0">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black tracking-tight uppercase text-white">Quota Limit Exceeded</h3>
                        <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">Status Code: 429 Too Many Requests</p>
                    </div>
                </div>

                {/* Message Body Field */}
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">System Exception Notice</p>
                    <p className="text-sm text-white/80 font-medium leading-relaxed">{exceptionMessage}</p>
                </div>

                {/* Metrics Quota Allocation Indicators */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Evaluated Queries</span>
                        <span className="text-lg font-black text-white">{currentUsage} / 5</span>
                    </div>
                    <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">Subscription Cost</span>
                        <span className="text-lg font-black text-emerald-400">KES {amountPayable}</span>
                    </div>
                </div>

                <hr className="border-white/5" />

                {/* Actionable Interactive M-Pesa Request Node Interface */}
                {!paymentSent ? (
                    <form onSubmit={handleMpesaCheckout} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-white/60 uppercase tracking-wide">
                                Safaricom M-Pesa Phone Number <span className="text-white/30 font-normal">(Optional)</span>
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. 2547XXXXXXXX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                pattern="2547[0-9]{8}|2541[0-9]{8}"
                                className="w-full p-3 bg-zinc-950 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-sm text-white font-mono tracking-widest placeholder:text-zinc-600"
                            />
                            <p className="text-[10px] text-white/40 font-medium leading-normal">
                                Leaves field blank to automatically invoke the verified mobile asset linked securely to your UserProfile record instance.
                            </p>
                        </div>

                        {localError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-semibold leading-relaxed">
                                ⚠️ Request Blocked: {localError}
                            </div>
                        )}

                        <div className="flex space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-1/3 bg-white/5 hover:bg-white/10 border border-white/10 text-white p-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-2/3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg shadow-emerald-950"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Unlock Premium Tier</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                        <div>
                            <p className="text-sm font-bold text-white uppercase">STK Handset Prompt Transmitted</p>
                            <p className="text-xs text-white/60 mt-1 font-medium leading-relaxed">
                                Please input your secret M-Pesa PIN security validation token onto your active phone display interface.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider p-2.5 rounded-xl border border-white/5 transition-colors"
                        >
                            Close Workspace Panel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuotaPaywallCard;