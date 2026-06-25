import { useState, useCallback } from 'react';

export function useTransitOptimizer() {
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const optimizeRoute = useCallback(async ({ origin, destination, vehicleType, vehicleMake }) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/premium/ai-optimizer/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ origin, destination, vehicleType, vehicleMake }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw { status: response.status, ...errData };
            }

            const data = await response.json();
            setRouteData(data);
        } catch (err) {
            setError(err.message || err);
        } finally {
            setLoading(false);
        }
    }, []);

    const processVoiceLog = useCallback(async (audioBlob, defaultVehicleType = 'GASOLINE') => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            
            // 1. Build MultiPart form data payload
            const formData = new FormData();
            // Appending with an explicit file extension matches what standard audio recorders output
            formData.append('file', audioBlob, 'voicelog.webm'); 

            // 2. Dispatch to your newly registered route
            const response = await fetch('http://127.0.0.1:8000/api/voice/log/', {
                method: 'POST',
                headers: {
                    // Note: Leave Content-Type blank so the browser handles boundary partitions automatically!
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw { status: response.status, ...errData };
            }

            const data = await response.json();

            // 3. Handle Voice Navigation Command Interception
            if (data.action === 'FORWARD_TO_ROUTE_PLANNER') {
                const { origin, destination, vehicle_type, vehicle_make } = data.inferred_parameters;
                
                // Chain directly back into your route rendering pipe
                await optimizeRoute({
                    origin,
                    destination,
                    vehicleType: vehicle_type,
                    vehicleMake: vehicle_make
                });
                
                return { type: 'ROUTE_UPDATED', transcript: data.transcript_captured };
            }

            // 4. Handle Standard Activity Logging Response
            return { type: 'LOG_COMMITTED', details: data.activity_logged, transcript: data.raw_transcript };

        } catch (err) {
            setError(err.message || err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [optimizeRoute]);

    return {
        optimizeRoute,
        processVoiceLog,
        routeData,
        loading,
        error,
        setError
    };
}