// src/components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { X, Award, Mail, ShieldCheck, Zap, User } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function UserProfile({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://127.0.0.1:8000/api/user/profile/', {
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-emerald-950/90 border border-emerald-500/20 rounded-2xl p-6 max-w-xs w-full flex flex-col items-center shadow-xl">
                    <LoadingSpinner />
                    <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-3">Verifying Identity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-zinc-950 border border-emerald-500/20 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl shadow-emerald-950/40 relative">
                
                {/* Minimal Header Background Accent */}
                <div className="h-16 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                    <div className="flex items-center space-x-1.5 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-[10px] uppercase font-black tracking-wider text-white/80">My Account</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Main Card Body */}
                <div className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium text-center">
                            {error}
                        </div>
                    )}

                    {data && (
                        <>
                            {/* Avatar & Core Meta */}
                            <div className="flex items-center space-x-4 pb-2 border-b border-white/5">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-base font-black shadow-inner select-none ring-2 ring-emerald-500/20">
                                    {data.profile.username.charAt(0) || 'U'}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <h3 className="text-sm font-bold tracking-tight text-white truncate">{data.profile.username}</h3>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border ${
                                        data.profile.account_tier === 'Premium' 
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        <Award className="w-2.5 h-2.5 mr-1" />
                                        {data.profile.account_tier} Account
                                    </span>
                                </div>
                            </div>

                            {/* Contact & Quota Details Deck */}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center space-x-3 p-2.5 bg-white/5 rounded-xl border border-white/5">
                                    <Mail className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] uppercase font-bold text-white/30 tracking-wide">Email Address</p>
                                        <p className="font-semibold text-white/80 truncate">{data.profile.email || "Not Provided"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 p-2.5 bg-white/5 rounded-xl border border-white/5">
                                    <Zap className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] uppercase font-bold text-white/30 tracking-wide">Contact</p>
                                        
                                        {/* Dynamic Inline DB Condition Check */}
                                        {data.profile.phone_number ? (
                                            <p className="font-semibold text-white/80 truncate">
                                                {data.profile.phone_number}
                                            </p>
                                        ) : (
                                            <p className="font-semibold text-emerald-400/80 cursor-pointer hover:text-emerald-300 transition-colors">
                                                None, add my contacts
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}