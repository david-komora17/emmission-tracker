// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, 
    RefreshCw, 
    Calendar, 
    User, 
    Crown, 
    OctagonAlert,
    CheckCircle,
    Clock,
    AlertCircle,
    Edit2,
    X,
    Save,
    Trash2,
    Reply,
    ChevronDown,
    ChevronUp,
    Filter,
    Send,
    MessageSquare
} from 'lucide-react';
import {
    fetchComplaints,
    updateComplaintStatus,
    sendResponse,
    deleteComplaint,
    deleteAllAddressed
} from '../services/complaintService';

const AdminDashboard = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [editingStatus, setEditingStatus] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [showResponseModal, setShowResponseModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [responseText, setResponseText] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [complaintToDelete, setComplaintToDelete] = useState(null);

    // Load complaints
    const loadComplaints = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        const result = await fetchComplaints();
        
        if (result.success) {
            const complaintsWithStatus = result.data.map(complaint => ({
                ...complaint,
                status: complaint.status || 'pending',
                response: complaint.response || null
            }));
            setComplaints(complaintsWithStatus);
        } else {
            setError(result.error || "Failed to load complaints.");
        }
        
        setLoading(false);
    };

    useEffect(() => {
        loadComplaints();
    }, []);

    // Update status
    const handleUpdateStatus = async (complaintId, newStatus) => {
        const result = await updateComplaintStatus(complaintId, newStatus);
        
        if (result.success) {
            setComplaints(prev =>
                prev.map(c => c.id === complaintId ? { ...c, status: newStatus } : c)
            );
            setSuccess(`Status updated to '${newStatus.replace('_', ' ')}'`);
            setEditingStatus(null);
            setSelectedStatus('');
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.error || 'Failed to update status');
            setTimeout(() => setError(null), 4000);
        }
    };

    // Send response
    const handleSendResponse = async (complaintId, responseText) => {
        const result = await sendResponse(complaintId, responseText);
        
        if (result.success) {
            setComplaints(prev =>
                prev.map(c => c.id === complaintId ? { ...c, response: responseText, status: 'addressed' } : c)
            );
            setSuccess('Response sent successfully!');
            setShowResponseModal(false);
            setResponseText('');
            setSelectedComplaint(null);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.error || 'Failed to send response');
            setTimeout(() => setError(null), 4000);
        }
    };

    // Delete single complaint
    const handleDeleteComplaint = async (complaintId) => {
        const result = await deleteComplaint(complaintId);
        
        if (result.success) {
            setComplaints(prev => prev.filter(c => c.id !== complaintId));
            setSuccess('Complaint deleted successfully!');
            setShowDeleteConfirm(false);
            setComplaintToDelete(null);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.error || 'Failed to delete complaint');
            setTimeout(() => setError(null), 4000);
        }
    };

    // Bulk delete addressed
    const handleDeleteAllAddressed = async () => {
        const result = await deleteAllAddressed(complaints);
        
        if (result.success) {
            setComplaints(prev => prev.filter(c => c.status !== 'addressed'));
            setSuccess(`${result.data.deletedCount} addressed complaints deleted!`);
            setTimeout(() => setSuccess(null), 3000);
        } else {
            setError(result.error || 'Failed to delete addressed complaints');
            setTimeout(() => setError(null), 4000);
        }
    };

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
                    onClick={loadComplaints}
                    disabled={loading}
                    className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-all duration-300 text-emerald-400 hover:text-emerald-300 group"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-300 text-xs font-semibold backdrop-blur-sm">
                     {error}
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
                    <div className="text-4xl mb-3"></div>
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
                            className="group p-5 bg-slate-950/95 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/40"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <span className="px-3 py-1 bg-slate-800/90 border border-slate-700 text-slate-100 text-[9px] font-black tracking-wider rounded-full uppercase">
                                        {item.subject || 'GENERAL COMPLAINT'}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                        <Crown className="w-3 h-3" />
                                        #{item.id}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-slate-200 leading-relaxed font-medium line-clamp-3">
                                    {item.message}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3 text-[10px] text-slate-400 font-semibold">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                        <User className="w-3 h-3 text-slate-300" />
                                    </div>
                                    <span className="text-slate-300">{item.username || 'Anonymous'}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-slate-400">
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