// src/components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { 
    X, Award, Mail, ShieldCheck, Zap, User, 
    Leaf, Calendar, ArrowUpRight, Crown
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import CarbonHistory from './CarbonHistory';

export default function UserProfile({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
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
                    throw new Error(`Profile identity sync failure: Status ${response.status}`);
                }

                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err.message || "Failed processing user identification parameters.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                <div className="bg-emerald-950/90 border border-emerald-500/20 rounded-2xl p-8 max-w-xs w-full flex flex-col items-center shadow-2xl">
                    <LoadingSpinner />
                    <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-4 animate-pulse">
                        Loading Profile...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Profile Card Modal */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl shadow-emerald-950/40">
                    
                    {/* Header */}
                    <div className="h-16 bg-white/5 border-b border-emerald-500/10 flex items-center justify-between px-4">
                        <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] uppercase font-black tracking-wider text-white/80">My Account</span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-red-300 text-xs font-medium text-center">{error}</p>
                            </div>
                        )}

                        {data && (
                            <>
                                {/* Avatar & Core Meta */}
                                <div className="flex items-center space-x-4 pb-3 border-b border-emerald-500/10">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/30">
                                        {data.profile.username.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <h3 className="text-base font-bold tracking-tight text-white truncate">
                                            {data.profile.username}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border ${
                                            data.profile.account_tier === 'Premium' 
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                            <Award className="w-3 h-3 mr-1" />
                                            {data.profile.account_tier}
                                        </span>
                                    </div>
                                </div>

                                {/* Contact Details */}
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3 p-2.5 bg-white/5 rounded-xl border border-emerald-500/10">
                                        <Mail className="w-4 h-4 text-emerald-400/60 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] uppercase font-bold text-white/30 tracking-wide">Email</p>
                                            <p className="text-sm font-medium text-white/80 truncate">
                                                {data.profile.email || "Not Provided"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-2.5 bg-white/5 rounded-xl border border-emerald-500/10">
                                        <Zap className="w-4 h-4 text-emerald-400/60 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] uppercase font-bold text-white/30 tracking-wide">Phone</p>
                                            <p className="text-sm font-medium text-white/80 truncate">
                                                {data.profile.phone_number || "Not Set"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 p-2.5 bg-white/5 rounded-xl border border-emerald-500/10">
                                        <Leaf className="w-4 h-4 text-emerald-400/60 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] uppercase font-bold text-white/30 tracking-wide">AI Queries</p>
                                            <p className="text-sm font-medium text-white/80">
                                                {data.profile.ai_query_count || 0} / 5 used
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all duration-300"
                                    >
                                        <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                            History
                                        </span>
                                    </button>
                                    
                                    <button
                                        onClick={() => {
                                            // Trigger premium upgrade directly
                                            // This will open the paywall or initiate STK push
                                            onClose();
                                            // You can emit an event or use a global state to trigger the paywall
                                            window.dispatchEvent(new CustomEvent('openPaywall', { 
                                                detail: { errorDetails: { current_usage: data.profile.ai_query_count } }
                                            }));
                                        }}
                                        className={`group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                                            data.profile.account_tier === 'Premium'
                                                ? 'bg-amber-500/10 border border-amber-500/20 cursor-default opacity-60'
                                                : 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10'
                                        }`}
                                    >
                                        {data.profile.account_tier === 'Premium' ? (
                                            <>
                                                <Crown className="w-4 h-4 text-amber-400" />
                                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                                    Premium
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                                    Upgrade
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Carbon History Modal */}
            {showHistory && (
                <CarbonHistory 
                    onClose={() => setShowHistory(false)} 
                    initialData={data}
                />
            )}
        </>
    );
}

