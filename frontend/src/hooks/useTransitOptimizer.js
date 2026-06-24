// src/hooks/useTransitOptimizer.js
import { useState } from 'react';

const BASE_URL = "https://emmission-tracker.onrender.com";
const DJANGO_API_URL = `${BASE_URL}/api/premium/ai-optimizer/`; // Points to your PremiumAIActionView route

export function useTransitOptimizer() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [routeData, setRouteData] = useState(null);

    // Free OpenStreetMap Geocoding Engine (Replaces proprietary Mapbox lookup using maplibre-gl)
    const geocodeLocation = async (query) => {
        if (!query) return null;
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'ClimatiqaEcoTransitEngine/1.0' // Identifies app to prevent rate limits
                    }
                }
            );
            
            if (!response.ok) throw new Error('Geocoding server responded with an error.');
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                return { 
                    name: data[0].display_name, 
                    coordinates: [lat, lon] // Output structure matching [Latitude, Longitude]
                };
            }
            throw new Error(`Could not locate "${query}". Please check spelling.`);
        } catch (err) {
            console.error(`Geocoding error for query "${query}":`, err);
            throw err;
        }
    };

    const optimizeRoute = async ({ origin, destination, vehicleType, vehicleMake }) => {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Resolve geographic points parallelly or sequentially
            const originGeo = await geocodeLocation(origin);
            const destGeo = await geocodeLocation(destination);

            // 2. Dispatch combined inputs directly to your Django backend service
            const response = await fetch(DJANGO_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    origin: originGeo.name,
                    origin_coords: originGeo.coordinates,     // Passes [lat, lon]
                    destination: destGeo.name,
                    destination_coords: destGeo.coordinates,   // Passes [lat, lon]
                    vehicle_type: vehicleType,
                    vehicle_make: vehicleMake
                })
            });

            if (!response.ok) {
                throw new Error('The Django engine encountered an error optimizing this environmental route.');
            }

            const data = await response.json();
            
            // 3. Commit structured layout details straight to frontend state
            setRouteData({
                origin: originGeo,
                destination: destGeo,
                summary: {
                    estimated_distance_km: data.estimated_distance_km,
                    total_carbon_saved_kg: data.total_carbon_saved_kg,
                    narrative: data.narrative
                },
                milestones: data.milestones || [] // Strict array containing steps data
            });

        } catch (err) {
            setError(err.message || 'An unexpected runtime compilation error occurred.');
            setRouteData(null);
        } finally {
            setLoading(false);
        }
    };

    return { optimizeRoute, routeData, loading, error };
}