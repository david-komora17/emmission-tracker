// src/components/ProductScanner.jsx
import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { X, Camera, Loader2, Scan, CheckCircle2, AlertCircle, Search, Upload } from 'lucide-react';

const ProductScanner = ({ onClose, onScanComplete }) => {
    // Camera states
    const [scanning, setScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const readerRef = useRef(null);

    // Manual search states
    const [query, setQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // ========== API CONSUMPTION ENGINE ==========
    const sendPayloadToBackend = async (payloadData, manualName = null) => {
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const bodyPayload = {
                qr_payload: payloadData
            };
            if (manualName) {
                bodyPayload.product_name = manualName;
            }

            const response = await fetch(`${baseUrl}/api/scanner/ingest/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyPayload)
            });
            
            const resultData = await response.json();
            
            if (response.ok) {
                setResult(resultData);
                showToast(resultData);
                if (onScanComplete) {
                    onScanComplete(resultData);
                }
                setQuery('');
            } else {
                setError(resultData.error || 'Failed to process product data.');
            }
        } catch (err) {
            setError('Network error processing product data.');
            console.error('Ingestion error:', err);
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    };

    // ========== QR IMAGE UPLOAD ==========
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('qr_image', file);

        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

            const response = await fetch(`${baseUrl}/api/scanner/ingest/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData
            });

            const resultData = await response.json();

            if (response.ok) {
                setResult(resultData);
                showToast(resultData);
                if (onScanComplete) {
                    onScanComplete(resultData);
                }
            } else {
                setError(resultData.error || 'Failed to process QR image.');
            }
        } catch (err) {
            setError('Network error processing QR image.');
            console.error('QR upload error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ========== CAMERA SCANNING ==========
    const handleScan = async (data) => {
        if (data && !loading && scanning) {
            setLoading(true);
            setScanning(false);
            
            if (readerRef.current) {
                await readerRef.current.reset();
                readerRef.current = null;
            }
            await sendPayloadToBackend(data);
        }
    };

    const startScanning = async () => {
        try {
            setError(null);
            setResult(null);
            setToast(null);
            setScanning(true);
            
            const codeReader = new BrowserMultiFormatReader();
            readerRef.current = codeReader;
            
            const videoInputDevices = await codeReader.listVideoInputDevices();
            
            const device = videoInputDevices.find(
                dev => dev.label.toLowerCase().includes('back') || 
                       dev.label.toLowerCase().includes('environment')
            ) || videoInputDevices[0];
            
            if (!device) {
                throw new Error('No camera found');
            }
            
            await codeReader.decodeFromVideoDevice(
                device.deviceId,
                videoRef.current,
                (resultInstance) => {
                    if (resultInstance) {
                        handleScan(resultInstance.getText());
                    }
                }
            );
        } catch (err) {
            console.error('Scanner error:', err);
            setError('Failed to access camera. Please check permissions.');
            setScanning(false);
        }
    };

    const stopScanning = async () => {
        if (readerRef.current) {
            await readerRef.current.reset();
            readerRef.current = null;
        }
        setScanning(false);
        setToast(null);
        onClose();
    };

    // ========== MANUAL SEARCH ==========
    const handleManualSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setSearchLoading(true);
        setToast(null);
        setError(null);

        // Pass the raw string to both variables so Django falls back correctly
        await sendPayloadToBackend(query.trim(), query.trim());
    };

    // ========== TOAST SYSTEM ==========
    const showToast = (productData) => {
        setToast({
            type: 'success',
            data: productData,
            visible: true
        });

        // Auto-hide after 6 seconds
        setTimeout(() => {
            setToast(null);
        }, 6000);
    };

    const handleAddToHistory = async (productData) => {
        setToast(null);
        console.log('✅ Synchronized history logging for:', productData.product_name);
    };

    const handleCancelToast = () => {
        setToast(null);
    };

    // ========== CLEANUP ==========
    useEffect(() => {
        return () => {
            if (readerRef.current) {
                readerRef.current.reset();
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-xl">
                            <Scan className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Product Scanner</h3>
                            <p className="text-xs text-gray-500">Scan QR code or search product</p>
                        </div>
                    </div>
                    <button
                        onClick={stopScanning}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Manual Search Input */}
                    <form onSubmit={handleManualSearch} className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search product or paste QR data..."
                                className="w-full pl-10 pr-20 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                                disabled={searchLoading || scanning}
                            />
                            <button
                                type="submit"
                                disabled={searchLoading || !query.trim() || scanning}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                {searchLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <hr className="flex-1 border-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">OR</span>
                        <hr className="flex-1 border-gray-200" />
                    </div>

                    {/* Camera Scanner Layout Trigger */}
                    {!scanning && !result && !loading && (
                        <div className="space-y-4">
                            <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-center">
                                <Camera className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Upload QR image or use camera</p>
                                <label className="mt-3 inline-block px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Upload QR Image
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <button
                                onClick={startScanning}
                                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                            >
                                <Camera className="w-4 h-4 inline mr-2" />
                                Start Camera
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <div className="relative">
                            <div className="overflow-hidden rounded-xl bg-black aspect-[4/3]">
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    playsInline
                                />
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-48 border-2 border-green-400 rounded-lg relative">
                                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400" />
                                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400" />
                                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400" />
                                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400" />
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
                                    <p className="text-xs text-white font-medium">Position QR code in frame</p>
                                </div>
                            </div>
                            <button
                                onClick={stopScanning}
                                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="p-8 text-center">
                            <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-600">Processing environmental metrics...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm text-red-600">{error}</p>
                                    <button
                                        onClick={() => setError(null)}
                                        className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========== TOAST NOTIFICATION CARD ========== */}
            {toast && toast.visible && (
                <div 
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[92%] sm:w-full sm:max-w-2xl"
                    style={{
                        position: 'fixed',
                        bottom: '2rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl border border-green-200 p-5">
                        {toast.data ? (
                            <div className="space-y-3">
                                {/* Toast Card Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                {toast.data.product_name || 'Item Analyzed'}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                Carbon Footprint: {toast.data.calculated_footprint_kg} kg CO₂
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCancelToast}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Dynamic Compliance Badge */}
                                <div className={`p-2.5 rounded-xl text-xs font-medium ${
                                    toast.data.advisory_status?.tier === 'GREEN' 
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : toast.data.advisory_status?.tier === 'YELLOW'
                                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                        : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                    {toast.data.advisory_status?.message || 'Product analyzed successfully'}
                                </div>

                                {/* Calculated Cost Metrics */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-gray-50 rounded-xl text-center">
                                        <p className="text-[10px] text-gray-500">Footprint</p>
                                        <p className="text-base font-bold text-gray-900">
                                            {toast.data.calculated_footprint_kg} kg
                                        </p>
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-xl text-center">
                                        <p className="text-[10px] text-gray-500">Offset Cost</p>
                                        <p className="text-base font-bold text-green-600">
                                            KES {toast.data.offset_cost_kes}
                                        </p>
                                    </div>
                                </div>

                                {/* Form Action Buttons */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleAddToHistory(toast.data)}
                                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-medium transition-colors"
                                    >
                                        Add to History
                                    </button>
                                    <button
                                        onClick={handleCancelToast}
                                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {/* Countdown Progress bar */}
                                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-green-500 rounded-full animate-[shrink_6s_linear_forwards]"
                                        style={{ 
                                            transformOrigin: 'left',
                                            width: '100%'
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-600 flex-1">{toast.message || 'Something went wrong'}</p>
                                <button
                                    onClick={handleCancelToast}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductScanner;