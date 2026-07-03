// src/hooks/useTransitOptimizer.js
import { useState } from 'react';

export const useTransitOptimizer = () => {
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const optimizeRoute = async (params) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const response = await fetch(`${baseUrl}/api/premium/ai-optimizer/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw errorData;
            }

            const data = await response.json();
            setRouteData(data);
            return data;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const processVoiceLog = async (audioFile) => {
        // Voice log implementation
    };

    return {
        optimizeRoute,
        processVoiceLog,
        routeData,
        loading,
        error,
        setError
    };
};