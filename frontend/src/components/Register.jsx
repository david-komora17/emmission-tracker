// React Frontend: Register.jsx snippet
import React, { useState } from 'react';

const RegisterComponent = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'USER', // Default to normal user tracking role
        phone_number: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const response = await fetch('http://127.0.0.1:8000/api/auth/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            alert(`Logged in successfully as ${data.role}`);
            // Redirect to dashboard layout based on data.role
        } else {
            alert(data.error || "Registration failed");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white max-w-sm mx-auto space-y-4 shadow rounded-xl">
            <h2 className="text-xl font-bold">Create EcoTrack Account</h2>
            <input type="text" placeholder="Username" onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-2 border rounded"/>
            <input type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded"/>
            
            {/* Direct RBAC Privilege Dropdown Allocation */}
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded bg-slate-50 font-medium text-slate-700">
                <option value="USER">Standard Application User Role</option>
                <option value="ADMIN">System Platform Administrator Role</option>
            </select>
            
            <button type="submit" className="w-full bg-emerald-600 text-white p-2 rounded font-bold">Sign Up</button>
        </form>
    );
};