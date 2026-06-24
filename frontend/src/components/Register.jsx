// src/components/Register.jsx
import React, { useState } from 'react';

const RegisterComponent = ({ onAuthSuccess }) => {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [formData, setFormData] = useState({
        username: '', // Expected as First & Last Name for registration
        email: '',
        password: '',
        phone_number: '',
        signup_secret: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(false);
        
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
        const endpoint = isLoginMode ? '/api/auth/login/' : '/api/auth/register/';
        
        // Login payload only needs username and password
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
                // Store structural session identity details safely
                localStorage.setItem('token', data.access || data.access_token);
                if (data.refresh || data.refresh_token) {
                    localStorage.setItem('refresh_token', data.refresh || data.refresh_token);
                }
                
                // Track demographic role profiling and names natively
                const assignedRole = data.role || 'USER';
                localStorage.setItem('user_role', assignedRole);
                localStorage.setItem('username', formData.username);

                alert(`Authenticated successfully as ${assignedRole}`);
                
                if (onAuthSuccess) {
                    onAuthSuccess();
                }
            } else {
                const errorMsg = typeof data === 'object' ? JSON.stringify(data) : data.error;
                alert(errorMsg || "Authentication process failed.");
            }
        } catch (error) {
            console.error("Connection error:", error);
            alert("Could not reach backend server.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-4 w-full">
            <form 
                onSubmit={handleSubmit} 
                className="w-full max-w-md p-6 bg-zinc-950/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl space-y-4 text-white"
            >
                <div className="space-y-1">
                    <h2 className="text-xl font-black tracking-tight text-white uppercase">
                        {isLoginMode ? 'Climatiqa Login' : 'Create Climatiqa Account'}
                    </h2>
                    <p className="text-xs font-semibold text-green-400/80 tracking-wider uppercase">
                        {isLoginMode ? 'Access Carbon Optimization Panel' : 'Setup Environmental Identity Profile'}
                    </p>
                </div>
                
                <hr className="border-white/5" />

                <div>
                    <label className="block text-xs font-bold text-white/60 uppercase mb-1">
                        {isLoginMode ? 'Username' : 'Username (First & Last Name)'}
                    </label>
                    <input 
                        type="text" 
                        required
                        placeholder="e.g. David Komora" 
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})} 
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-sm"
                    />
                </div>

                {!isLoginMode && (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-white/60 uppercase mb-1">Email Address</label>
                            <input 
                                type="email" 
                                required
                                placeholder="name@domain.com" 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-white/60 uppercase mb-1">Phone Number</label>
                            <input 
                                type="text" 
                                required
                                placeholder="e.g. 2547XXXXXXXX" 
                                value={formData.phone_number}
                                onChange={e => setFormData({...formData, phone_number: e.target.value})} 
                                className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-sm"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-xs font-bold text-white/60 uppercase mb-1">Password</label>
                    <input 
                        type="password" 
                        required
                        placeholder="••••••••" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-sm"
                    />
                </div>
                
                {!isLoginMode && (
                    <div>
                        <label className="block text-xs font-bold text-white/60 uppercase mb-1">Any additional information (optional)</label>
                        <textarea 
                            rows="2"
                            placeholder="Notes, references, or organization structural remarks..." 
                            value={formData.signup_secret}
                            onChange={e => setFormData({...formData, signup_secret: e.target.value})} 
                            className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-sm resize-none"
                        />
                    </div>
                )}
                
                <button 
                    type="submit" 
                    className="w-full mt-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-3 rounded-xl font-bold tracking-wide transition-all duration-300 text-sm uppercase"
                >
                    {isLoginMode ? 'Log In & Verify' : 'Sign Up & Initialize'}
                </button>

                <div className="text-center mt-4">
                    <button
                        type="button"
                        onClick={() => setIsLoginMode(!isLoginMode)}
                        className="text-xs font-bold text-green-400 hover:text-green-300 uppercase tracking-wider underline transition-colors"
                    >
                        {isLoginMode ? "Don't have an account? Sign Up" : 'Already configured? Log In'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterComponent;