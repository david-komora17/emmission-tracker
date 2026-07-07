// src/components/Complaints.jsx
import React, { useState } from 'react';
import { 
    Send, 
    AlertCircle, 
    CheckCircle, 
    X, 
    MessageSquare,
    Lightbulb 
} from 'lucide-react';
import { createComplaint } from '../services/complaintService';

const Complaints = ({ onClose }) => {
    const [formData, setFormData] = useState({
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [submittedComplaint, setSubmittedComplaint] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate
        if (!formData.subject.trim() || !formData.message.trim()) {
            setError('Please fill in both subject and message fields.');
            setTimeout(() => setError(null), 3000);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        const result = await createComplaint(
            formData.subject.trim(),
            formData.message.trim()
        );

        if (result.success) {
            setSuccess(true);
            setSubmittedComplaint({
                subject: formData.subject.trim(),
                message: formData.message.trim(),
                timestamp: new Date().toLocaleString()
            });
            setFormData({ subject: '', message: '' });
            
            // Auto close after 5 seconds
            setTimeout(() => {
                if (onClose) onClose();
            }, 5000);
        } else {
            setError(result.error || 'Failed to submit complaint. Please try again.');
            setTimeout(() => setError(null), 4000);
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl">
                            <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Submit Feedback</h3>
                            <p className="text-xs text-gray-500">We value your input!</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {/* Success State */}
                    {success && submittedComplaint && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0 mt-0.5">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-green-800">Complaint Submitted!</h4>
                                    <p className="text-sm text-green-700 mt-1">
                                        We've received your feedback and will respond shortly.
                                    </p>
                                    <div className="mt-2 p-3 bg-white/60 rounded-lg text-xs">
                                        <p className="font-medium text-gray-700">{submittedComplaint.subject}</p>
                                        <p className="text-gray-500 mt-0.5 line-clamp-2">{submittedComplaint.message}</p>
                                        <p className="text-gray-400 mt-1">{submittedComplaint.timestamp}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    {!success && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Brief summary of your issue or feedback"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-sm"
                                    disabled={loading}
                                    maxLength="255"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {formData.subject.length}/255 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Please provide details about your issue or suggestion..."
                                    rows="5"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none text-sm"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {/* Quick Tips */}
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-xs text-blue-700 font-medium">
                                    <Lightbulb className="w-4 h-4 inline mr-1" />
                                     Tips for effective feedback:
                                </p>
                                <ul className="text-xs text-blue-600 mt-1 space-y-0.5 list-disc list-inside">
                                    <li>Be specific about the issue you're experiencing</li>
                                    <li>Include steps to reproduce if it's a bug</li>
                                    <li>Suggest improvements if you have ideas</li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Complaint
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Close button when success */}
                    {success && (
                        <button
                            onClick={onClose}
                            className="w-full mt-4 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-all"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Complaints;