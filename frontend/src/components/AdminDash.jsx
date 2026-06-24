// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Calendar, User } from 'lucide-react';

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

            if (!response.ok) throw new Error(`Server returned code: ${response.status}`);
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
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                        User Complaints
                    </h2>
                </div>
                <button 
                    onClick={fetchComplaints}
                    disabled={loading}
                    className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-colors text-white/80"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300 text-xs font-semibold">
                    ⚠️ Error Processing Logs: {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12 text-sm text-white/40 font-bold tracking-wider uppercase animate-pulse">
                    Fetching Database Instances...
                </div>
            ) : complaints.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm font-semibold border border-dashed border-white/5 rounded-2xl">
                    No active complaints found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {complaints.map((item) => (
                        <div key={item.id} className="p-4 bg-zinc-950/60 border border-white/10 rounded-2xl flex flex-col justify-between space-y-4 shadow-md">
                            <div className="space-y-2">
                                <span className="px-2.5 py-1 mb-5 bg-red-500/10 border border-red-500/20 text-red-200 text-[10px] font-black tracking-wider rounded-md uppercase">
                                    {item.subject || 'GENERAL COMPLAINT'}
                                </span>
                                <p className="text-sm text-white/90 leading-relaxed font-medium">{item.message}</p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-white/40 font-semibold">
                                <div className="flex items-center space-x-1.5">
                                    <User className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{item.username || 'Anonymous Submitter'}</span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
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