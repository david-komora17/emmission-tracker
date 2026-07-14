// src/components/CarbonOffsetModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Trees, Smartphone, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

function CarbonOffsetModal({ onClose }) {
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('150'); // Amount in KES
    const [carbonCredits, setCarbonCredits] = useState(10); // Equivalent CO2 offset in kg
    const [loading, setLoading] = useState(false);
    const [checkoutId, setCheckoutId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | processing | completed | failed

    // Calculate dynamic carbon credit equivalent
    useEffect(() => {
        const numericAmount = parseFloat(amount) || 0;
        // Calculation base: 1 kg CO2 e.g. costs KES 15
        setCarbonCredits((numericAmount / 15).toFixed(2));
    }, [amount]);

    const handleInitiateOffset = async (e) => {
        e.preventDefault();
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
            const response = await fetch('/api/payments/checkout/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone_number: formattedPhone,
                    amount: parseFloat(amount),
                    purpose: 'carbon_offset'
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to initialize checkout');
            }

            setCheckoutId(data.checkout_id);
            toast.success('M-Pesa STK push sent successfully!');
            
            // Start polling for checkout status verification
            startPolling(data.checkout_id);
        } catch (err) {
            toast.error(err.message || 'Something went wrong');
            setPaymentStatus('failed');
            setLoading(false);
        }
    };

    const startPolling = (id) => {
        let attempts = 0;
        const maxAttempts = 24; // Poll for 2 minutes (every 5 seconds)
        
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                setPaymentStatus('failed');
                setLoading(false);
                toast.error('Payment verification timed out. Please check your transaction receipts.');
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/payments/status/${id}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();

                if (response.ok && data.status === 'completed') {
                    clearInterval(interval);
                    setPaymentStatus('completed');
                    setLoading(false);
                    toast.success(`Successfully offset ${carbonCredits}kg of CO2!`);
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    setPaymentStatus('failed');
                    setLoading(false);
                    toast.error('Transaction failed or was cancelled.');
                }
            } catch (err) {
                console.error('Error polling payment status:', err);
            }
        }, 5000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Modal Content */}
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-green-100 rounded-xl">
                            <Leaf className="w-6 h-6 text-green-700" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Offset Carbon Footprint</h2>
                            <p className="text-xs text-gray-500">Fund ecological preservation instantly</p>
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
                                className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl text-sm transition-all hover:bg-green-700"
                            >
                                Back to Map
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleInitiateOffset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
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
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                                    Safaricom Phone Number
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        <span>Awaiting STK Authorization...</span>
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