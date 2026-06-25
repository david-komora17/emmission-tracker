// src/components/CarbonHistory.jsx
import React, { useState, useEffect } from 'react';
import { 
    X, Leaf, TrendingDown, TreePine, Coins, 
    Loader2, CheckCircle2, AlertCircle, Calendar,
    ArrowUpRight, Award, Crown, Sparkles
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function CarbonHistory({ onClose, initialData }) {
    const [data, setData] = useState(initialData || null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState(null);
    const [offsetLoading, setOffsetLoading] = useState(false);
    const [offsetSuccess, setOffsetSuccess] = useState(false);
    const [showOffsetConfirm, setShowOffsetConfirm] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [premiumLoading, setPremiumLoading] = useState(false);
    const [premiumSuccess, setPremiumSuccess] = useState(false);

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

    const handleOffsetCarbon = async () => {
        setOffsetLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const offsetKg = data?.lifetime_footprint_balance?.net_outstanding_deficit_kg || 0;
            
            if (offsetKg <= 0) {
                setError("🌿 No outstanding carbon debt to offset. You're already carbon neutral!");
                setOffsetLoading(false);
                return;
            }

            // Initiate M-Pesa payment for carbon offset
            const payload = {
                phone_number: phoneNumber || data?.profile?.phone_number,
                offset_kg: offsetKg,
                amount: Math.max(5, Math.ceil(offsetKg * 0.5))
            };

            const response = await fetch(`${baseUrl}/api/payments/offset-checkout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                setOffsetSuccess(true);
                setTimeout(() => {
                    fetchHistoryData();
                    setShowOffsetConfirm(false);
                }, 4000);
            } else {
                setError(result.error || "Carbon offset payment failed.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error. Please check your connection.");
        } finally {
            setOffsetLoading(false);
        }
    };

    const handlePremiumUpgrade = async () => {
        setPremiumLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const payload = phoneNumber ? { phone_number: phoneNumber.trim() } : {};
            
            const response = await fetch(`${baseUrl}/api/payments/checkout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                setPremiumSuccess(true);
                localStorage.setItem('mpesa_checkout_id', result.CheckoutRequestID);
                
                setTimeout(() => {
                    onClose();
                }, 4000);
            } else {
                setError(result.error || "Payment initiation failed.");
            }
        } catch (err) {
            console.error(err);
            setError("Network error. Please check your connection.");
        } finally {
            setPremiumLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                <div className="bg-emerald-950/90 border border-emerald-500/20 rounded-2xl p-8 max-w-xs w-full flex flex-col items-center shadow-2xl">
                    <LoadingSpinner />
                    <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-4 animate-pulse">
                        Loading History...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl shadow-2xl shadow-emerald-500/10 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-emerald-500/10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <Leaf className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">
                                Carbon History
                            </h2>
                            <p className="text-[10px] font-bold text-emerald-400/50 tracking-widest uppercase">
                                {data?.profile?.username || 'User'} • Lifetime Footprint
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Messages */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-300 text-xs font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </p>
                        </div>
                    )}

                    {premiumSuccess && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
                            <p className="text-amber-400 text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Premium upgrade initiated! Check your phone for STK push.
                            </p>
                        </div>
                    )}

                    {offsetSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-pulse">
                            <p className="text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Carbon offset payment sent! Check your phone for STK push.
                            </p>
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Carbon Balance Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Emitted</p>
                                    <p className="text-xl font-black text-red-400">
                                        {data.lifetime_footprint_balance.cumulative_emitted_kg}
                                        <span className="text-xs font-normal text-white/30">kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Saved</p>
                                    <p className="text-xl font-black text-emerald-400">
                                        {data.lifetime_footprint_balance.cumulative_saved_kg}
                                        <span className="text-xs font-normal text-white/30">kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Offset</p>
                                    <p className="text-xl font-black text-blue-400">
                                        {data.lifetime_footprint_balance.cumulative_offset_kg}
                                        <span className="text-xs font-normal text-white/30">kg</span>
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 text-center">
                                    <p className="text-[8px] font-bold text-amber-400/60 uppercase tracking-widest">Net Debt</p>
                                    <p className="text-xl font-black text-amber-400">
                                        {data.lifetime_footprint_balance.net_outstanding_deficit_kg}
                                        <span className="text-xs font-normal text-amber-400/50">kg</span>
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Offset Carbon Button */}
                                <button
                                    onClick={() => setShowOffsetConfirm(true)}
                                    disabled={offsetLoading || data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0}
                                    className={`group p-4 rounded-xl border transition-all duration-300 ${
                                        data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0
                                            ? 'bg-emerald-500/10 border-emerald-500/20 cursor-not-allowed opacity-60'
                                            : 'bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${
                                            data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0
                                                ? 'bg-emerald-500/10'
                                                : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                                        }`}>
                                            <TreePine className={`w-5 h-5 ${
                                                data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0
                                                    ? 'text-emerald-400/50'
                                                    : 'text-emerald-400'
                                            }`} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-bold text-white">
                                                Offset Carbon
                                            </p>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                                {data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0
                                                    ? '🌿 Carbon neutral!'
                                                    : `${data.lifetime_footprint_balance.net_outstanding_deficit_kg} kg remaining`}
                                            </p>
                                        </div>
                                        {offsetLoading ? (
                                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                                        ) : data.lifetime_footprint_balance.net_outstanding_deficit_kg <= 0 ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <ArrowUpRight className="w-5 h-5 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                                        )}
                                    </div>
                                </button>

                                {/* Premium Upgrade Button */}
                                <button
                                    onClick={handlePremiumUpgrade}
                                    disabled={premiumLoading || data.profile.account_tier === 'Premium'}
                                    className={`group p-4 rounded-xl border transition-all duration-300 ${
                                        data.profile.account_tier === 'Premium'
                                            ? 'bg-amber-500/10 border-amber-500/20 cursor-not-allowed opacity-60'
                                            : 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${
                                            data.profile.account_tier === 'Premium'
                                                ? 'bg-amber-500/10'
                                                : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                                        }`}>
                                            <Crown className={`w-5 h-5 ${
                                                data.profile.account_tier === 'Premium'
                                                    ? 'text-amber-400/50'
                                                    : 'text-amber-400'
                                            }`} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-sm font-bold text-white">
                                                {data.profile.account_tier === 'Premium' 
                                                    ? '✨ Premium Active' 
                                                    : 'Upgrade to Premium'}
                                            </p>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                                {data.profile.account_tier === 'Premium'
                                                    ? 'Unlimited AI queries'
                                                    : 'KES 5.00 / month'}
                                            </p>
                                        </div>
                                        {premiumLoading ? (
                                            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                                        ) : data.profile.account_tier === 'Premium' ? (
                                            <CheckCircle2 className="w-5 h-5 text-amber-400" />
                                        ) : (
                                            <ArrowUpRight className="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
                                        )}
                                    </div>
                                </button>
                            </div>

                            {/* Activity History List */}
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-emerald-400/60 tracking-widest uppercase flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Activity Log
                                </h4>
                                <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                    {data.historical_activity_logs?.length > 0 ? (
                                        data.historical_activity_logs.map((log) => (
                                            <div key={log.log_id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-white/80 truncate">
                                                            {log.activity_description}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                                                                {log.category}
                                                            </span>
                                                            <span className="text-[8px] text-white/20">•</span>
                                                            <span className="text-[9px] font-medium text-white/30">
                                                                {log.date}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                        log.metrics.co2e_impact_kg > 0
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    }`}>
                                                        {log.metrics.co2e_impact_kg > 0 ? '+' : ''}
                                                        {log.metrics.co2e_impact_kg} kg
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-6 text-center text-white/30 text-xs font-medium border border-dashed border-emerald-500/10 rounded-xl">
                                            No activity logged yet. Start tracking your carbon footprint!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Offset Confirmation Modal */}
            {showOffsetConfirm && data && data.lifetime_footprint_balance.net_outstanding_deficit_kg > 0 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Coins className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Offset Carbon Debt</h4>
                                <p className="text-[10px] text-white/40">Confirm payment for carbon offset</p>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Outstanding Debt</span>
                                <span className="font-bold text-amber-400">
                                    {data.lifetime_footprint_balance.net_outstanding_deficit_kg} kg CO2e
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Estimated Cost</span>
                                <span className="font-bold text-emerald-400">
                                    KES {Math.max(5, Math.ceil(data.lifetime_footprint_balance.net_outstanding_deficit_kg * 0.5))}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/60">Phone Number</span>
                                <span className="font-medium text-white/80 text-xs">
                                    {phoneNumber || data.profile.phone_number || 'Not set'}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowOffsetConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOffsetCarbon}
                                disabled={offsetLoading}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:from-emerald-800/50 disabled:to-green-800/50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                                {offsetLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <TreePine className="w-4 h-4" />
                                        Confirm Offset
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}