// src/hooks/useTransitOptimizer.js
import { useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL || 'http://127.0.0.1:8000'

export function useTransitOptimizer() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [routeData, setRouteData] = useState(null);

    // 1. Nominatim API: Resolves string labels to real geometric GPS pairs
    const geocodeLocation = async (query) => {
        if (!query) return null;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                { headers: { 'User-Agent': 'ClimatiqaEcoTransitEngine/1.0' } }
            );
            if (!response.ok) throw new Error('Geocoding engine offline.');
            const data = await response.json();
            
            if (data && data.length > 0) {
                return {
                    name: data[0].display_name,
                    coordinates: [parseFloat(data[0].lat), parseFloat(data[0].lon)] // [lat, lon]
                };
            }
            throw new Error(`Could not find coordinates for "${query}".`);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    // 2. Main Optimization Engine: Coordinates pipeline execution
    const optimizeRoute = async ({ origin, destination, vehicleType, vehicleMake }) => {
        setLoading(true);
        setError(null);
        try {
            const originGeo = await geocodeLocation(origin);
            const destGeo = await geocodeLocation(destination);

            const response = await fetch(`${BASE_URL}/api/premium/ai-optimizer/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin: originGeo.name,
                    origin_coords: originGeo.coordinates,
                    destination: destGeo.name,
                    destination_coords: destGeo.coordinates,
                    vehicle_type: vehicleType,
                    vehicle_make: vehicleMake
                })
            });

            if (!response.ok) throw new Error('Optimization failed.');
            const data = await response.json();

            setRouteData({
                origin: originGeo,
                destination: destGeo,
                summary: {
                    estimated_distance_km: data.estimated_distance_km,
                    total_carbon_saved_kg: data.total_carbon_saved_kg,
                    narrative: data.narrative
                },
                milestones: data.milestones || []
            });
        } catch (err) {
            setError(err.message);
            setRouteData(null);
        } finally {
            setLoading(false);
        }
    };

    // 3. Process Voice Form Data Streams
    const processVoiceLog = async (audioBlob, vehicleType) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            
            // Match the extension parameter exactly to the stream type
            const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 'ogg';
            
            // Append binary stream with exact 'file' key required by request.FILES['file']
            formData.append('file', audioBlob, `voice_input.${fileExtension}`);

            const token = localStorage.getItem('token');
            
            const response = await fetch(`${BASE_URL}/api/voice/log/`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                    // CRITICAL: DO NOT add 'Content-Type': 'multipart/form-data' here manually.
                    // Leaving it out allows the browser to automatically insert the correct dynamic multi-part boundaries.
                },
                body: formData
            });

            if (!response.ok) {
                // Read backend error payload message context for easier debugging
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Voice recording rejected.");
            }
            
            const data = await response.json();

            if (data.action === "FORWARD_TO_ROUTE_PLANNER" || data.inferred_parameters?.task === "route") {
                const params = data.inferred_parameters;
                if (params.origin && params.destination) {
                    await optimizeRoute({
                        origin: params.origin,
                        destination: params.destination,
                        vehicleType,
                        vehicleMake: params.vehicle_make || 'Standard'
                    });
                }
            } else {
                alert(data.message || "Voice logged successfully.");
                setLoading(false);
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return { optimizeRoute, processVoiceLog, routeData, loading, error };
}