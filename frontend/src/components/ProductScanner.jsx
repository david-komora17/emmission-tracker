// src/components/ProductScanner.jsx
import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, X, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function ProductScanner() {
    const [inputValue, setInputValue] = useState('');
    const [scanning, setScanning] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 20000); // 20 seconds duration
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        setScanning(true);
        setToast(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:8000/api/scanner/ingest/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ qr_payload: inputValue.trim() })
            });

            const data = await response.json();

            if (response.ok) {
                setToast({
                    success: true,
                    title: data.product_name || "Extracted Item",
                    footprint: data.calculated_footprint_kg,
                    cost: data.offset_cost_kes,
                    tier: data.advisory_status?.tier || "GREEN",
                    message: data.advisory_status?.message || "Processed successfully."
                });
                setInputValue('');
            } else {
                setToast({ success: false, message: data.error || "Failed to parse metadata." });
            }
        } catch (err) {
            setToast({ success: false, message: "System offline. Check backend local port." });
        } finally {
            setScanning(false);
        }
    };

    const getTierConfigs = (tier) => {
        switch (tier) {
            case 'RED': 
                return {
                    border: 'border-red-500/30 shadow-red-950/50',
                    bg: 'from-zinc-900/90 via-red-950/40 to-zinc-950/90',
                    text: 'text-red-400',
                    icon: <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
                };
            case 'YELLOW': 
                return {
                    border: 'border-amber-500/30 shadow-amber-950/50',
                    bg: 'from-zinc-900/90 via-amber-950/30 to-zinc-950/90',
                    text: 'text-amber-400',
                    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />
                };
            default: 
                return {
                    border: 'border-emerald-500/30 shadow-emerald-950/50',
                    bg: 'from-zinc-900/90 via-emerald-950/30 to-zinc-950/90',
                    text: 'text-emerald-400',
                    icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />
                };
        }
    };

    const tierStyle = toast?.success ? getTierConfigs(toast.tier) : null;

    return (
        <div className="w-full">
            {/* Minimalist Premium Capsule Input */}
            <form onSubmit={handleProductSubmit} className="relative flex items-center bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/10 shadow-lg focus-within:border-emerald-500/40 focus-within:bg-white/[0.05] focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all duration-300">
                <div className="pl-4 text-white/30">
                    <Search className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Input or paste product payload..."
                    className="w-full bg-transparent pl-3 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none"
                    disabled={scanning}
                />
                {scanning && (
                    <div className="absolute right-3">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    </div>
                )}
            </form>

            {/* Premium 20-Second Toast Dashboard Interface */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 max-w-sm w-full p-5 rounded-2xl border bg-gradient-to-br backdrop-blur-xl shadow-2xl transition-all duration-500 scale-100 ${toast.success ? `${tierStyle.border} ${tierStyle.bg}` : 'border-red-500/30 bg-zinc-950/95 shadow-red-950/20'}`}>
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            {toast.success ? tierStyle.icon : <AlertOctagon className="w-5 h-5 text-red-400" />}
                            <div>
                                <h3 className="font-bold text-sm tracking-tight text-white">
                                    {toast.success ? toast.title : "Scan Failure"}
                                </h3>
                                {toast.success && (
                                    <span className={`inline-block text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded mt-0.5 bg-white/5 ${tierStyle.text}`}>
                                        {toast.tier} STATUS
                                    </span>
                                )}
                            </div>
                        </div>
                        <button onClick={() => setToast(null)} className="text-white/30 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Main Content Body */}
                    <div className="mt-4 space-y-3.5">
                        {toast.success ? (
                            <>
                                {/* Metric Cards Row */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-left">
                                        <p className="text-[10px] font-medium tracking-wider text-white/40 uppercase">Footprint</p>
                                        <p className="text-lg font-black text-white mt-0.5">
                                            {toast.footprint} <span className="text-xs font-normal text-white/40">kg</span>
                                        </p>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-left">
                                        <p className="text-[10px] font-medium tracking-wider text-white/40 uppercase">Offset Cost</p>
                                        <p className="text-lg font-black text-emerald-400 mt-0.5">
                                            {toast.cost} <span className="text-xs font-normal text-emerald-400/60">KES</span>
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Advisory Message block */}
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                    <p className="text-xs leading-relaxed text-white/70 font-medium">
                                        {toast.message}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-red-300/90 font-medium bg-red-500/5 border border-red-500/10 rounded-xl p-3 leading-relaxed">
                                {toast.message}
                            </p>
                        )}
                        
                        {/* 20s Active Countdown Indicator bar */}
                        <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-white/20 animate-[shrink_20s_linear_forwards]" style={{ transformOrigin: 'left' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}