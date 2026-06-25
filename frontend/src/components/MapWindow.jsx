// src/components/MapWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { 
    Navigation, Car, AlertCircle, Compass, Loader2, 
    Leaf, Route, TrendingDown, MapPin, Zap, Target 
} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapWindow() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const routeMarkerRef = useRef([]);

    // Form inputs state
    const [origin, setOrigin] = useState('Runda, Nairobi');
    const [destination, setDestination] = useState('Kileleshwa, Nairobi');
    const [vehicleType, setVehicleType] = useState('SUV');
    const [vehicleMake, setVehicleMake] = useState('Range Rover Velar');

    // Optimization response storage
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    // Initialize MapLibre Engine
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [36.8219, -1.2921],
            zoom: 12,
            pitch: 30
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Helper: Address to Geolocation conversion
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

    // Main Execution Pipeline Trigger
    const handleRouteOptimization = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const [originCoords, destCoords] = await Promise.all([
                geocodeAddress(origin),
                geocodeAddress(destination)
            ]);

            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.join(',')};${destCoords.join(',')}?overview=full&geometries=geojson`;
            const osrmResponse = await fetch(osrmUrl);
            const osrmData = await osrmResponse.json();

            if (!osrmData.routes || osrmData.routes.length === 0) {
                throw new Error("OSRM failed to calculate route paths between points.");
            }

            const routeGeoJSON = osrmData.routes[0].geometry;

            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
            
            const aiResponse = await fetch(`${baseUrl}/api/premium/ai-optimizer/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: "route",
                    origin,
                    destination,
                    vehicle_type: vehicleType,
                    vehicle_make: vehicleMake
                })
            });

            // Handle 429 gracefully for non-admin users
            if (aiResponse.status === 429) {
                const errorData = await aiResponse.json();
                throw { 
                    status: 429, 
                    ...errorData,
                    message: errorData.error || "Free tier limit reached. Upgrade to continue."
                };
            }

            if (!aiResponse.ok) {
                const faultPayload = await aiResponse.json();
                throw new Error(faultPayload.error || "AI optimization view returned a bad status code.");
            }

            const aiCalculations = await aiResponse.json();
            setAnalytics(aiCalculations);
            renderRouteOnCanvas(routeGeoJSON, originCoords, destCoords);

        } catch (err) {
            setError(err.message || "An unhandled execution trace failed your request routing.");
        } finally {
            setLoading(false);
        }
    };

    const renderRouteOnCanvas = (geometry, start, end) => {
        const map = mapRef.current;
        if (!map) return;

        routeMarkerRef.current.forEach(marker => marker.remove());
        routeMarkerRef.current = [];

        const originMarker = new maplibregl.Marker({ color: '#10b981' }).setLngLat(start).addTo(map);
        const destMarker = new maplibregl.Marker({ color: '#ef4444' }).setLngLat(end).addTo(map);
        routeMarkerRef.current = [originMarker, destMarker];

        if (map.getSource('optimized-route')) {
            map.getSource('optimized-route').setData(geometry);
        } else {
            map.addSource('optimized-route', {
                type: 'geojson',
                data: geometry
            });

            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'optimized-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#10b981',
                    'line-width': 6,
                    'line-opacity': 0.9,
                    'line-glow-width': 12,
                    'line-glow-opacity': 0.3
                }
            });
        }

        const bbox = turf.bbox(geometry);
        map.fitBounds(bbox, { padding: 50, maxZoom: 14 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-8rem)] w-full text-white">
            
            {/* Control Panel - Enhanced with Emerald Theme */}
            <div className="lg:col-span-2 space-y-4 flex flex-col h-full overflow-y-auto bg-gradient-to-br from-slate-900/80 via-emerald-950/30 to-slate-900/80 p-5 border border-emerald-500/10 rounded-2xl backdrop-blur-xl shadow-xl shadow-emerald-500/5">
                
                <form onSubmit={handleRouteOptimization} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Compass className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-[11px] font-black tracking-widest uppercase text-emerald-400">
                            Route Optimizer
                        </h3>
                        <span className="ml-auto text-[8px] font-black text-emerald-400/30 uppercase tracking-widest border border-emerald-500/10 px-2 py-0.5 rounded-full">
                            AI Powered
                        </span>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-emerald-400/60 tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            Departure Point
                        </label>
                        <input 
                            type="text" 
                            value={origin} 
                            onChange={(e) => setOrigin(e.target.value)} 
                            required 
                            className="w-full text-xs p-3 bg-slate-950/60 border border-emerald-500/10 rounded-xl focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all text-white/90 placeholder-emerald-400/20"
                            placeholder="Enter starting location..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-bold text-emerald-400/60 tracking-wider flex items-center gap-1.5">
                            <Target className="w-3 h-3" />
                            Target Destination
                        </label>
                        <input 
                            type="text" 
                            value={destination} 
                            onChange={(e) => setDestination(e.target.value)} 
                            required 
                            className="w-full text-xs p-3 bg-slate-950/60 border border-emerald-500/10 rounded-xl focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all text-white/90 placeholder-emerald-400/20"
                            placeholder="Enter destination..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-emerald-400/60 tracking-wider flex items-center gap-1.5">
                                <Car className="w-3 h-3" />
                                Vehicle Type
                            </label>
                            <input 
                                type="text" 
                                value={vehicleType} 
                                onChange={(e) => setVehicleType(e.target.value)} 
                                required 
                                className="w-full text-xs p-3 bg-slate-950/60 border border-emerald-500/10 rounded-xl focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all text-white/90"
                                placeholder="e.g., SUV"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-emerald-400/60 tracking-wider flex items-center gap-1.5">
                                <Zap className="w-3 h-3" />
                                Model
                            </label>
                            <input 
                                type="text" 
                                value={vehicleMake} 
                                onChange={(e) => setVehicleMake(e.target.value)} 
                                required 
                                className="w-full text-xs p-3 bg-slate-950/60 border border-emerald-500/10 rounded-xl focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all text-white/90"
                                placeholder="e.g., Velar"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 disabled:from-slate-600 disabled:to-slate-500 font-black text-xs uppercase tracking-widest text-white rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:shadow-none cursor-pointer group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Calculating...</span>
                            </>
                        ) : (
                            <>
                                <Route className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                <span>Optimize Route</span>
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Error</p>
                                <p className="text-red-300/80 text-xs font-medium mt-0.5 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Enhanced AI Results Card - Elegant Emerald Design */}
                {analytics && (
                    <div className="space-y-4 flex-1 overflow-y-auto pt-4 border-t border-emerald-500/10">
                        {/* Metrics Cards - Glassmorphism */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative overflow-hidden p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-xl border border-emerald-500/20 group hover:border-emerald-500/40 transition-all duration-300">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                                <p className="text-[9px] uppercase font-bold text-emerald-400/50 tracking-wider flex items-center gap-1.5">
                                    <Route className="w-3 h-3" />
                                    Distance
                                </p>
                                <p className="text-2xl font-black text-white mt-1">
                                    {analytics.estimated_distance_km}
                                    <span className="text-xs font-normal text-emerald-400/60 ml-1">km</span>
                                </p>
                            </div>
                            <div className="relative overflow-hidden p-4 bg-gradient-to-br from-green-500/5 to-emerald-500/10 rounded-xl border border-emerald-500/20 group hover:border-emerald-500/40 transition-all duration-300">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                                <p className="text-[9px] uppercase font-bold text-emerald-400/50 tracking-wider flex items-center gap-1.5">
                                    <Leaf className="w-3 h-3" />
                                    Carbon Saved
                                </p>
                                <p className="text-2xl font-black text-emerald-400 mt-1">
                                    {analytics.total_carbon_saved_kg}
                                    <span className="text-xs font-normal text-emerald-400/60 ml-1">kg</span>
                                </p>
                            </div>
                        </div>

                        {/* Narrative Card - Elegant Quote Style */}
                        <div className="relative p-4 bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] rounded-xl border border-emerald-500/10">
                            <div className="absolute top-2 right-3 text-emerald-400/10 text-4xl font-serif">"</div>
                            <p className="text-sm text-emerald-300/80 leading-relaxed font-light italic pl-2 pr-4">
                                {analytics.narrative || "Optimized route calculated successfully."}
                            </p>
                        </div>

                        {/* Milestones - Enhanced Cards */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] uppercase font-black text-emerald-400/60 tracking-wider flex items-center gap-1.5">
                                    <TrendingDown className="w-3 h-3" />
                                    Navigation Checkpoints
                                </p>
                                <span className="text-[8px] font-bold text-emerald-400/30">
                                    {analytics.milestones?.length || 0} steps
                                </span>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {analytics.milestones?.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className="group p-3 bg-slate-950/40 border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl transition-all duration-300 hover:bg-emerald-500/5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-emerald-400/40">
                                                        #{index + 1}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-wider">
                                                        {item.mode}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-white/80 truncate mt-0.5">
                                                    {item.instruction}
                                                </p>
                                                <p className="text-[10px] text-emerald-400/30 mt-0.5">
                                                    {item.distance_km} km
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <p className="text-xs font-bold text-red-400">
                                                    +{item.emissions_kg} kg
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Map Canvas */}
            <div className="lg:col-span-3 w-full h-full rounded-2xl overflow-hidden border border-emerald-500/10 relative shadow-inner">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
                
                {/* Floating HUD Elements */}
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-emerald-500/20 px-3 py-1.5 rounded-lg pointer-events-none select-none z-10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black tracking-widest uppercase text-emerald-400/60">
                        Live Map
                    </span>
                </div>
                
                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-emerald-500/20 px-3 py-1.5 rounded-lg pointer-events-none select-none z-10">
                    <span className="text-[8px] font-bold tracking-widest uppercase text-emerald-400/30">
                        OSRM • MapLibre
                    </span>
                </div>
            </div>
        </div>
    );
}