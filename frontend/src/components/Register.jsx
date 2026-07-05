// src/components/Register.jsx
import React, { useState } from 'react';
import { Leaf, Eye, EyeOff } from 'lucide-react';


const RegisterComponent = ({ onAuthSuccess }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone_number: '',
        signup_secret: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const endpoint = isLoginMode ? '/api/auth/login/' : '/api/auth/register/';
        
        const payload = isLoginMode 
            ? { username: formData.username, password: formData.password }
            : formData;

        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.access || data.access_token);
                if (data.refresh || data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh || data.refresh_token);
                }
                
                const assignedRole = data.role || 'USER';
                localStorage.setItem('user_role', assignedRole);
                localStorage.setItem('username', formData.username);

                if (onAuthSuccess) {
                    onAuthSuccess();
                }
            } else {
                const errorMsg = typeof data === 'object' ? JSON.stringify(data) : data.error;
                setError(errorMsg || "Authentication failed.");
            }
        } catch (error) {
            console.error("Connection error:", error);
            setError("Could not reach backend server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Forest Background */}
            <div 
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ 
                    backgroundImage: `url('/src/assets/geranimo-qzgN45hseN0-unsplash.jpg')`,
                    backgroundAttachment: 'fixed'
                }}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            </div>

            {/* Auth Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Brand */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="p-2 bg-green-100 rounded-xl">
                                <Leaf className="w-6 h-6 text-green-700" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">CLIMATIQA</h1>
                        </div>
                        <p className="text-sm text-gray-500">
                            {isLoginMode ? 'Welcome back' : 'Create your account'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                {isLoginMode ? 'Username' : 'Full Name'}
                            </label>
                            <input 
                                type="text" 
                                required
                                placeholder={isLoginMode ? "Enter username" : "First and Last Name"} 
                                value={formData.username}
                                onChange={e => setFormData({...formData, username: e.target.value})} 
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                            />
                        </div>

                        {!isLoginMode && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="name@domain.com" 
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone Number</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="2547XXXXXXXX" 
                                        value={formData.phone_number}
                                        onChange={e => setFormData({...formData, phone_number: e.target.value})} 
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                                    />
                                </div>
                            </>
                        )}

                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                required
                                placeholder="••••••••" 
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                className="w-full pr-12 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        {!isLoginMode && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Any additional information (Optional)</label>
                                <input 
                                    type="text"
                                    placeholder="Enter any additional information" 
                                    value={formData.signup_secret}
                                    onChange={e => setFormData({...formData, signup_secret: e.target.value})} 
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-900 text-sm transition-all"
                                />
                            </div>
                        )}
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            {loading ? 'Processing...' : (isLoginMode ? 'Log In' : 'Create Account')}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setIsLoginMode(!isLoginMode)}
                                className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                            >
                                {isLoginMode ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterComponent;