// src/components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { X, Award, Mail, ShieldCheck, Zap, Leaf, Calendar, Crown, Loader2, Phone } from 'lucide-react';
import CarbonHistory from './CarbonHistory';

export default function UserProfile({ onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    
    // M-Pesa Processing States
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState(null);
    const [customPhone, setCustomPhone] = useState('');
    const [showPhonePrompt, setShowPhonePrompt] = useState(false);

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No authentication token found. Please log in again.');
            
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            const response = await fetch(`${baseUrl}/api/user/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error('Session expired. Please log in again.');
                throw new Error(`Profile fetch failed: Status ${response.status}`);
            }

            const result = await response.json();
            if (!result || !result.profile) throw new Error('Invalid profile data received');
            
            setData(result);
            setError(null);
        } catch (err) {
            console.error('Profile fetch error:', err);
            setError(err.message || "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleMpesaUpgrade = async (e) => {
        if (e) e.preventDefault();
        setIsProcessingPayment(true);
        setPaymentMessage({ type: 'info', text: 'Initiating M-Pesa STK Push...' });

        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            // Determine handset asset priority: 1. Inline Override, 2. Profile Cached
            const phoneNumberToSend = customPhone.strip?.() || customPhone || data?.profile?.phone_number;

            const response = await fetch(`${baseUrl}/api/payments/checkout/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone_number: phoneNumberToSend || null,
                    payment_type: 'subscription'
                })
            });

            const resData = await response.json();

            if (!response.ok) {
                if (resData.code === 'PHONE_REQUIRED' || response.status === 400) {
                    setShowPhonePrompt(true);
                    throw new Error(resData.error || 'Valid Kenyan phone number asset required.');
                }
                throw new Error(resData.error || 'Transaction initiation failed.');
            }

            setPaymentMessage({ 
                type: 'success', 
                text: 'STK Push sent successfully! Enter your PIN on your mobile phone to complete subscription.' 
            });
            setShowPhonePrompt(false);
            
            // Poll for account updates after a brief delay
            setTimeout(() => { fetchProfileData(); }, 12000);

        } catch (err) {
            setPaymentMessage({ type: 'error', text: err.message });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    {/* Card Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">My Account</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        {error ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                                <p className="text-sm text-red-600">{error}</p>
                                <button onClick={fetchProfileData} className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                                    Retry
                                </button>
                            </div>
                        ) : data ? (
                            <>
                                {/* Profile Summary */}
                                <div className="flex items-center gap-4 pb-3 border-b border-gray-200">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-xl font-bold text-white shadow-md">
                                        {data.profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate">
                                            {data.profile?.username || 'User'}
                                        </h3>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                                            data.profile?.account_tier === 'Premium' 
                                                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                                : 'bg-green-50 text-green-700 border-green-200'
                                        }`}>
                                            <Award className="w-3 h-3 mr-1" />
                                            {data.profile?.account_tier || 'Free'}
                                        </span>
                                    </div>
                                </div>

                                {/* Dynamic System Messages */}
                                {paymentMessage && (
                                    <div className={`p-3 rounded-xl text-xs font-medium border text-center ${
                                        paymentMessage.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
                                        paymentMessage.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' :
                                        'bg-blue-50 text-blue-800 border-blue-200'
                                    }`}>
                                        {paymentMessage.text}
                                    </div>
                                )}

                                {/* Phone Registration Prompt if Missing */}
                                {showPhonePrompt && (
                                    <form onSubmit={handleMpesaUpgrade} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                        <p className="text-xs text-amber-800 font-medium flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> Setup Phone (2547XXXXXXXX)
                                        </p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                placeholder="254712345678"
                                                value={customPhone}
                                                onChange={(e) => setCustomPhone(e.target.value)}
                                                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                required
                                            />
                                            <button type="submit" disabled={isProcessingPayment} className="bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50">
                                                Push
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Metadata Details */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p>
                                            <p className="text-sm font-medium text-gray-700 truncate">{data.profile?.email || 'Not Provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <Zap className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Phone Asset</p>
                                            <p className="text-sm font-medium text-gray-700 truncate">{data.profile?.phone_number || 'Not Linked'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <Leaf className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Allocated AI Balance</p>
                                            <p className="text-sm font-medium text-gray-700">
                                                {data.profile?.ai_query_count || 0} / 5 Evaluation Queries Used
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Matrix */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-gray-700 font-medium text-sm"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        History
                                    </button>
                                    
                                    <button
                                        onClick={data.profile?.account_tier === 'Premium' ? undefined : () => handleMpesaUpgrade()}
                                        disabled={isProcessingPayment}
                                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                                            data.profile?.account_tier === 'Premium'
                                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                                : 'bg-amber-100 hover:bg-amber-200 text-amber-700 shadow-sm'
                                        }`}
                                    >
                                        {isProcessingPayment ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Crown className="w-4 h-4" />
                                        )}
                                        {data.profile?.account_tier === 'Premium' ? 'Premium' : 'Upgrade'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <p>No profile data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showHistory && data && (
                <CarbonHistory 
                    onClose={() => setShowHistory(false)} 
                    logs={data.historical_activity_logs} 
                    balance={data.lifetime_footprint_balance}
                />
            )}
        </>
    );
}