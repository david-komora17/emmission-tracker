// src/components/SearchBar.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { Search, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

// 1. Pass down updateDashboardState as a prop from your parent layout component
const SearchBar = ({ updateDashboardState }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        const token = localStorage.getItem('token');
        
        if (!token) {
            setToast({
                type: 'error',
                message: 'Session expired. Please log in again.',
                visible: true
            });
            return;
        }

        setLoading(true);
        setToast(null);

        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

            const response = await fetch(`${baseUrl}/api/scanner/ingest/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_name: query.trim(),
                    qr_payload: query.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setToast({
                    type: 'success',
                    data: data,
                    visible: true
                });

                setTimeout(() => setToast(null), 6000);
                setQuery('');
            } else {
                console.error("View Ingestion Error Details:", data);

                setToast({
                    type: 'error',
                    message: data.error || data.detail || 'Failed to analyze product',
                    visible: true
                });
                setTimeout(() => setToast(null), 6000);
            }
        } catch (err) {
            console.error('Search error:', err);
            setToast({
                type: 'error',
                message: 'Network error. Please try again.',
                visible: true
            });
            setTimeout(() => setToast(null), 6000);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddToHistory = async (scannedProduct) => {
        // 1. Check if the click event is even firing
        console.log("➔ Add to History clicked! Payload received:", scannedProduct);

        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

        if (!token) {
            console.error("Missing token inside handleAddToHistory scope.");
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/api/user/profile/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: 'diet', 
                    activity_type: scannedProduct?.product_name || 'Unknown Product',
                    input_value: scannedProduct?.weight || 1.0,
                    unit: scannedProduct?.unit || 'pcs',
                    co2e_kg: scannedProduct?.calculated_footprint_kg ?? 0.0
                })
            });

            console.log("Response status code received:", response.status);

            if (response.ok) {
                const updatedDashboardData = await response.json();
                console.log("Successfully retrieved updated dashboard payload:", updatedDashboardData);
                
                // 2. CRITICAL: Avoid a ReferenceError crash if this isn't defined in your props
                if (typeof updateDashboardState === 'function') {
                    updateDashboardState(updatedDashboardData); 
                } else {
                    console.warn("updateDashboardState is not defined or passed as a prop to SearchBar.");
                }
                
                setToast(null);
            } else {
                const errData = await response.json();
                console.error("Backend validation failed:", errData);
            }
        } catch (error) {
            console.error("Failed to commit item to activity ledger:", error);
        }
    };      
    
    const handleCancel = () => {
        setToast(null);
    };

    return (
        <div className="relative w-full">
            <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search product name or paste QR code..."
                        className="w-full pl-11 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                        disabled={loading}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {loading && (
                        <div className="absolute right-20 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                >
                    Search
                </button>
            </form>

            {toast && toast.visible && createPortal(
                <>
                    <style>{`
                        @keyframes shrink {
                            from { transform: scaleX(1); }
                            to { transform: scaleX(0); }
                        }
                    `}</style>
                    <div 
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[92%] sm:w-full sm:max-w-xl px-4"
                        role="alert"
                    >
                        <div className={`rounded-2xl shadow-2xl border p-5 backdrop-blur-md ${
                            toast.type === 'success' ? 'bg-white/95 border-green-200 shadow-green-900/5' : 'bg-red-50/95 border-red-200'
                        }`}>
                            {toast.type === 'success' && toast.data ? (
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 rounded-xl shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                                                    {toast.data.product_name || 'Product Scanned'}
                                                </h4>
                                                <p className="text-xs text-gray-500">
                                                    Carbon Footprint: {toast.data.calculated_footprint_kg} kg CO₂
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCancel}
                                            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className={`p-3 rounded-xl text-xs font-medium ${
                                        toast.data.advisory_status?.tier === 'GREEN' 
                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                            : toast.data.advisory_status?.tier === 'YELLOW'
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                            : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                        {toast.data.advisory_status?.message || 'Product analyzed successfully'}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50/80 rounded-xl text-center">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Footprint</p>
                                            <p className="text-base font-bold text-gray-900 mt-0.5">
                                                {toast.data.calculated_footprint_kg} kg
                                            </p>
                                        </div>
                                        <div className="p-3 bg-gray-50/80 rounded-xl text-center">
                                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Offset Cost</p>
                                            <p className="text-base font-bold text-green-600 mt-0.5">
                                                KES {toast.data.offset_cost_kes}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleAddToHistory(toast.data)}
                                            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-green-600/10 transition-colors"
                                        >
                                            Add to History
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ 
                                                animation: 'shrink 6s linear forwards',
                                                transformOrigin: 'left',
                                                width: '100%'
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-sm font-medium text-red-600 truncate">{toast.message}</p>
                                    </div>
                                    <button
                                        onClick={handleCancel}
                                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default SearchBar;