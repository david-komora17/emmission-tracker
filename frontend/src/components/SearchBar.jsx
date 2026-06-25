// src/components/SearchBar.jsx
import React, { useState } from 'react';
import { MapPin, Navigation, Car, Compass, Search, AlertCircle } from 'lucide-react';
import * as turf from '@turf/turf';

function SearchBar({ onOptimize, renderRouteOnCanvas }) {
    // Form inputs state
    const [origin, setOrigin] = useState('Runda, Nairobi');
    const [destination, setDestination] = useState('Kileleshwa, Nairobi');
    const [vehicleType, setVehicleType] = useState('SUV');
    const [vehicleMake, setVehicleMake] = useState('Range Rover Velar');

    // UI Feedback Processing States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Helper: Address to Geolocation conversion via OpenStreetMap Nominatim API
    const geocodeAddress = async (addressText) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText + ', Kenya')}&limit=1`
        );
        const results = await response.json();
        if (!results || results.length === 0) {
            throw new Error(`Could not pinpoint coordinate matrix for location: "${addressText}"`);
        }
        return [parseFloat(results[0].lon), parseFloat(results[0].lat)];
    };

    // Main Execution Pipeline Trigger (Imported from MapWindow side-panel logic)
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(false); // Reset tracking pipeline
        setError(null);

        if (!origin.trim() || !destination.trim() || !vehicleType.trim() || !vehicleMake.trim()) return;

        setLoading(true);

        try {
            // 1. Concurrent Geocoding resolution via Nominatim
            const [originCoords, destCoords] = await Promise.all([
                geocodeAddress(origin.trim()),
                geocodeAddress(destination.trim())
            ]);

            // 2. Fetch High-Fidelity Geometry via OSRM Demo Server Router
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.join(',')};${destCoords.join(',')}?overview=full&geometries=geojson`;
            const osrmResponse = await fetch(osrmUrl);
            const osrmData = await osrmResponse.json();

            if (!osrmData.routes || osrmData.routes.length === 0) {
                throw new Error("OSRM failed to calculate route paths between points.");
            }

            const routeGeoJSON = osrmData.routes[0].geometry;

            // 3. Sync and fetch metrics from your Django AI Optimization Endpoint
            const token = localStorage.getItem('token');
            const aiResponse = await fetch('http://127.0.0.1:8000/api/premium/ai-optimizer/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: "route",
                    origin: origin.trim(),
                    destination: destination.trim(),
                    vehicle_type: vehicleType.trim(),
                    vehicle_make: vehicleMake.trim().toLowerCase()
                })
            });

            if (!aiResponse.ok) {
                const faultPayload = await aiResponse.json();
                throw new Error(faultPayload.error || "AI optimization view returned a bad status code.");
            }

            const aiCalculations = await aiResponse.json();
            
            // 4. Pass execution payload up to parent node handlers
            if (onOptimize) {
                onOptimize(aiCalculations);
            }

            // 5. Fire canvas mapping coordinates safely back down to map bounds if callback exists
            if (renderRouteOnCanvas) {
                renderRouteOnCanvas(routeGeoJSON, originCoords, destCoords);
            }

        } catch (err) {
            setError(err.message || "An unhandled execution trace failed your request routing.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='w-full max-w-7xl mx-auto mb-6 space-y-4'>
            <div className='w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl'>
                <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                    
                    {/* Origin Input */}
                    <div className='relative flex-1 group'>
                        <MapPin className='absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-focus-within:text-green-300 transition-all' />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all duration-300 text-sm" 
                            disabled={loading}
                            placeholder="Starting location..."
                            onChange={(e) => setOrigin(e.target.value)}
                            value={origin}
                            required
                        />
                    </div>

                    {/* Destination Input */}
                    <div className='relative flex-1 group'>
                        <Navigation className='absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-focus-within:text-green-300 transition-all' />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all duration-300 text-sm" 
                            disabled={loading}
                            placeholder="Ending destination..."
                            onChange={(e) => setDestination(e.target.value)}
                            value={destination}
                            required
                        />
                    </div>

                    {/* Vehicle Profile Type */}
                    <div className='relative flex-1 group lg:max-w-[200px]'>
                        <Car className='absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-focus-within:text-green-300 transition-all' />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all duration-300 text-sm" 
                            disabled={loading}
                            placeholder="Vehicle Type (e.g., SUV)"
                            onChange={(e) => setVehicleType(e.target.value)}
                            value={vehicleType}
                            required
                        />
                    </div>

                    {/* Model Variant Specification */}
                    <div className='relative flex-1 group lg:max-w-[220px]'>
                        <Compass className='absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 group-focus-within:text-green-300 transition-all' />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all duration-300 text-sm" 
                            disabled={loading}
                            placeholder="Variant (e.g., Velar)"
                            onChange={(e) => setVehicleMake(e.target.value)}
                            value={vehicleMake}
                            required
                        />
                    </div>

                    {/* Optimization Button */}
                    <button 
                        type="submit" 
                        disabled={loading || !origin || !destination || !vehicleType || !vehicleMake}
                        className='px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 shrink-0 border border-green-400/20 group'
                    >
                        {loading ? (
                            <div className='animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white'></div>
                        ) : (
                            <>
                                <Search className='w-5 h-5 group-hover:scale-110 transition-transform' />
                                <span>Optimize Route</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Error Overlay Notice Banner Component */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-medium flex items-start gap-2 max-w-7xl mx-auto backdrop-blur-md">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

export default SearchBar;