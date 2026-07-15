// src/components/CarbonOffsetModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Trees, Smartphone, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

function CarbonOffsetModal({ onClose }) {
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('150'); // Amount in KES
    const [carbonCredits, setCarbonCredits] = useState(10); // Equivalent CO2 offset in kg
    const [loading, setLoading] = useState(false);
    const [checkoutId, setCheckoutId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | processing | completed | failed
    const [localError, setLocalError] = useState(null);

    // Use a ref to track the polling interval across renders and unmounts safely
    const intervalRef = useRef(null);

    // Calculate dynamic carbon credit equivalent (KES 15 = 1kg CO2)
    useEffect(() => {
        const numericAmount = parseFloat(amount) || 0;
        setCarbonCredits((numericAmount / 15).toFixed(2));
    }, [amount]);

    // Clear any active polling interval on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const handleInitiateOffset = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!phone.match(/^(254|\+254|0)?(7|1)\d{8}$/)) {
            toast.error("Please enter a valid Safaricom phone number.");
            return;
        }

        // Standardize phone format for M-Pesa (254XXXXXXXXX)
        let formattedPhone = phone.trim().replace('+', '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
            formattedPhone = '254' + formattedPhone;
        }

        setLoading(true);
        setPaymentStatus('processing');

        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const response = await fetch(`${baseUrl}/api/payments/checkout/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone_number: formattedPhone,
                    amount: parseFloat(amount),
                    payment_type: 'carbon_offset' // Matches backend subscription schema
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Correctly match backend CheckoutRequestID mapping
                const reqId = data.CheckoutRequestID || data.checkout_id;
                if (!reqId) {
                    throw new Error("Invalid backend checkout receipt received.");
                }
                
                setCheckoutId(reqId);
                localStorage.setItem('mpesa_checkout_id', reqId);
                toast.success('M-Pesa STK push sent successfully!');
                
                // Start polling status
                startPolling(reqId);
            } else {
                throw new Error(data.error || data.detail || 'Failed to initialize checkout');
            }
        } catch (err) {
            toast.error(err.message || 'Something went wrong');
            setLocalError(err.message || 'Something went wrong');
            setPaymentStatus('failed');
            setLoading(false);
        }
    };

    const startPolling = (targetCheckoutId) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        let attempts = 0;
        const maxAttempts = 20; // 60 seconds total polling timeframe

        const checkStatus = async () => {
            try {
                attempts += 1;
                const token = localStorage.getItem('token');
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

                const response = await fetch(`${baseUrl}/api/payments/status/${targetCheckoutId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (response.ok) {
                    if (data.status === 'completed') {
                        clearInterval(intervalRef.current);
                        setPaymentStatus('completed');
                        setLoading(false);
                        toast.success(`Successfully offset ${carbonCredits}kg of CO2!`);
                        return;
                    }

                    if (data.status === 'failed') {
                        clearInterval(intervalRef.current);
                        setPaymentStatus('failed');
                        setLoading(false);
                        toast.error('Transaction failed or cancelled.');
                        return;
                    }
                }

                if (attempts >= maxAttempts) {
                    clearInterval(intervalRef.current);
                    setPaymentStatus('failed');
                    setLoading(false);
                    toast.error('Payment timed out. Please check your handset or try again.');
                }
            } catch (error) {
                console.error('Error polling payment status:', error);
                if (attempts >= maxAttempts) {
                    clearInterval(intervalRef.current);
                    setPaymentStatus('failed');
                    setLoading(false);
                }
            }
        };

        intervalRef.current = setInterval(checkStatus, 3000);
        checkStatus();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    disabled={paymentStatus === 'processing'}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Modal Content */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Trees className="w-6 h-6 text-green-600 animate-bounce" />
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Offset Carbon Footprint</h2>
                            <p className="text-xs text-gray-500">Retire your carbon credits instantly</p>
                        </div>
                    </div>

                    {paymentStatus === 'completed' ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Transaction Complete!</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    You have successfully offset <span className="font-semibold text-green-700">{carbonCredits} kg</span> of carbon emissions.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl text-sm transition-all hover:bg-green-700 shadow-sm"
                            >
                                Back to Map
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleInitiateOffset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 tracking-wider mb-1">
                                    Offset Value (KES)
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="10"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all text-sm font-medium"
                                    placeholder="Amount in Ksh"
                                    disabled={loading}
                                />
                            </div>

                            {/* Impact Estimate */}
                            <div className="bg-green-50/50 border border-green-100 rounded-xl p-3.5 text-center">
                                <p className="text-xs text-gray-500">Estimated Carbon Offset Impact</p>
                                <p className="text-2xl font-black text-green-700 mt-1">
                                    ~ {carbonCredits} <span className="text-base font-bold">kg CO₂e</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 tracking-wider mb-1">
                                    Mobile Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none transition-all text-sm font-medium"
                                        placeholder="07XXXXXXXX or 254..."
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {localError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{localError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Awaiting STK Push Pin...</span>
                                    </>
                                ) : (
                                    <span>Initiate M-Pesa Offset</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CarbonOffsetModal;
