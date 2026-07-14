// src/components/TermsModal.jsx
import React from 'react';
import { X, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';

function TermsModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6" />    
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Terms & Conditions</h2>
                            <p className="text-xs text-gray-500">• Quick Read</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto text-sm text-gray-600 leading-relaxed">
                    <p className="font-semibold text-gray-900">
                        Welcome to Climatiqa! Please review our terms for this academic prototype.
                    </p>

                    <div className="space-y-3">
                        <div className="flex gap-2.5 items-start">
                            <span className="font-bold text-green-700 text-xs mt-1 bg-green-50 px-1.5 py-0.5 rounded">1</span>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs">Academic & Testing Scope</h4>
                                <p className="text-xs">Climatiqa is a developer demo prototype. Route calculations, carbon footprint approximations, and transit parameters are calculated using open data and should not be relied upon for critical operations.</p>
                            </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                            <span className="font-bold text-green-700 text-xs mt-1 bg-green-50 px-1.5 py-0.5 rounded">2</span>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs">Payment Processing (M-Pesa)</h4>
                                <p className="text-xs">Any payments initiated for "Carbon Offsets" trigger live Safaricom M-Pesa STK prompts. Please ensure you are authorized to trigger these payloads, and do not process real high-value funds on sandbox integrations.</p>
                            </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                            <span className="font-bold text-green-700 text-xs mt-1 bg-green-50 px-1.5 py-0.5 rounded">3</span>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs">Data & Privacy</h4>
                                <p className="text-xs">We respect your privacy. No personal data, location telemetry, or scanning metrics are resold. Any gathered voice logs or diagnostic logs are processed for experimental AI classification only.</p>
                            </div>
                        </div>

                        <div className="flex gap-2.5 items-start">
                            <span className="font-bold text-green-700 text-xs mt-1 bg-green-50 px-1.5 py-0.5 rounded">4</span>
                            <div>
                                <h4 className="font-semibold text-gray-900 text-xs">Limitation of Liability</h4>
                                <p className="text-xs">This service is provided "as-is". The developers assume no responsibility for physical routing delays, hardware malfunctions, or unexpected payment gateway timing anomalies.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800">
                            By interacting with our features, you acknowledge that you understand this application is part of an ongoing project implementation.
                        </p>
                    </div>
                </div>

                {/* Footer Button */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl text-xs transition-all shadow-sm"
                    >
                        I Understand & Accept
                    </button>
                </div>
            </div>
        </div>
    );
}

export default TermsModal;