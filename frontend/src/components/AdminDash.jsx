// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Calendar, User, Crown } from 'lucide-react';

const AdminDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchComplaints = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const response = await fetch(`${baseUrl}/api/feedback/complaints/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Admin accounts bypass 429 - they get full access
            if (response.status === 429) {
                // This should never happen for admins, but handle gracefully
                setError("Admin rate limit unexpectedly hit. Please contact support.");
                return;
            }

            if (!response.ok) {
                throw new Error(`Server returned code: ${response.status}`);
            }
            
            const data = await response.json();
            setComplaints(data);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load system funnel logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-emerald-400" />
                        <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                            User Complaints
                        </span>
                    </h2>
                    <p className="text-[10px] font-bold text-emerald-400/60 tracking-widest uppercase mt-0.5">
                        {complaints.length} active reports
                    </p>
                </div>
                <button 
                    onClick={fetchComplaints}
                    disabled={loading}
                    className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-all duration-300 text-emerald-400 hover:text-emerald-300 group"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300 text-xs font-semibold backdrop-blur-sm">
                    ⚠️ {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-16">
                    <div className="inline-block">
                        <div className="w-10 h-10 border-3 border-emerald-500/20 rounded-full animate-spin border-t-emerald-400"></div>
                    </div>
                    <p className="mt-4 text-[10px] text-emerald-400/60 font-bold tracking-widest uppercase animate-pulse">
                        Fetching Database Instances...
                    </p>
                </div>
            ) : complaints.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-emerald-500/20 rounded-2xl bg-emerald-500/5">
                    <div className="text-4xl mb-3">🌿</div>
                    <p className="text-emerald-400/50 text-sm font-bold tracking-wide uppercase">
                        No active complaints found
                    </p>
                    <p className="text-[10px] text-emerald-400/30 mt-1">All feedback channels are clear</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {complaints.map((item) => (
                        <div 
                            key={item.id} 
                            className="group p-5 bg-gradient-to-br from-zinc-900/90 via-emerald-950/30 to-zinc-900/90 border border-emerald-500/10 hover:border-emerald-500/30 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[9px] font-black tracking-wider rounded-full uppercase">
                                        {item.subject || 'GENERAL COMPLAINT'}
                                    </span>
                                    <span className="text-[9px] font-bold text-emerald-400/40 flex items-center gap-1">
                                        <Crown className="w-3 h-3" />
                                        #{item.id}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-white/80 leading-relaxed font-medium line-clamp-3">
                                    {item.message}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-emerald-500/10 pt-3 mt-3 text-[10px] text-emerald-400/50 font-semibold">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <User className="w-3 h-3 text-emerald-400" />
                                    </div>
                                    <span className="text-emerald-300/70">{item.username || 'Anonymous'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(item.created_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;