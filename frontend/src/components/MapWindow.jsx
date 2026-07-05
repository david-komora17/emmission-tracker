// src/components/MapWindow.jsx
// src/components/MapWindow.jsx
import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { Navigation, Car, AlertCircle, Compass, Loader2, Leaf, Route, TrendingDown, MapPin, Zap, Target, Search } from 'lucide-react';
import { toast } from 'react-hot-toast'; // or use your project's custom toast trigger wrapper
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapWindow({ routeData, onQuotaExceeded }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const routeMarkerRef = useRef([]);

    const [origin, setOrigin] = useState('Runda, Nairobi');
    const [destination, setDestination] = useState('Kileleshwa, Nairobi');
    const [vehicleType, setVehicleType] = useState('SUV');
    const [vehicleMake, setVehicleMake] = useState('Range Rover Velar');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    // Initialize Map Canvas Elements
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
            center: [36.8219, -1.2921],
            zoom: 12,
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const geocodeAddress = async (addressText) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText + ', Kenya')}&limit=1`
        );
        const results = await response.json();
        if (!results || results.length === 0) {
            throw new Error(`Could not locate: "${addressText}"`);
        }
        return [parseFloat(results[0].lon), parseFloat(results[0].lat)];
    };

    const handleRouteOptimization = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Step 1: Client side Geocoding & OSRM Baseline Route Compilation
            const [originCoords, destCoords] = await Promise.all([
                geocodeAddress(origin),
                geocodeAddress(destination)
            ]);

            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.join(',')};${destCoords.join(',')}?overview=full&geometries=geojson`;
            const osrmResponse = await fetch(osrmUrl);
            const osrmData = await osrmResponse.json();

            if (!osrmData.routes || osrmData.routes.length === 0) {
                throw new Error("OSRM failed to calculate base map route routing geometries.");
            }

            const routeGeoJSON = osrmData.routes[0].geometry;

            // Step 2: Handshake payload data exchange with Django APIView Pipeline
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
                    origin: origin,
                    destination: destination,
                    vehicle_type: vehicleType,
                    vehicle_make: vehicleMake
                })
            });

            // Handle Subscription Quota Exceeded (429 Throttled)
            if (aiResponse.status === 429) {
                const throttledPayload = await aiResponse.json();
                const contextualError = throttledPayload.detail?.error || "Usage limit reached.";

                if (onQuotaExceeded) {
                    onQuotaExceeded({ ...throttledPayload, status: 429 });
                } else {
                    toast.custom((t) => (
                        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 border border-amber-100`}>
                            <div className="flex-1 w-0">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl shrink-0">
                                        <span className="text-xl"></span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900">Upgrade Required</p>
                                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{contextualError}</p>
                                        <div className="mt-3 flex items-center justify-between bg-amber-50/50 p-2 rounded-xl border border-amber-100/50">
                                            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Access Price</span>
                                            <span className="text-xs font-black text-amber-900">${throttledPayload.detail?.amount_payable?.toFixed(2) || "5.00"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-gray-100 ml-4 pl-2 items-start">
                                <button onClick={() => toast.dismiss(t.id)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg text-xs">✕</button>
                            </div>
                        </div>
                    ), { duration: 6000 });
                }

                return;
            }

            if (!aiResponse.ok) {
                const faultPayload = await aiResponse.json();
                throw new Error(faultPayload.error || "AI engine processing error.");
            }

            const aiCalculations = await aiResponse.json();
            
            // Set local data engine states
            setAnalytics(aiCalculations);
            renderRouteOnCanvas(routeGeoJSON, originCoords, destCoords);

            // Step 3: Trigger Beautiful Green Success Toast Panel
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 p-4 border border-gray-100`}>
                    <div className="flex-1 w-0">
                        <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl shrink-0">
                                <span className="text-xl"></span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">Optimization done!</p>
                                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{aiCalculations.narrative}</p>
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <div className="bg-gray-50 p-2 rounded-xl text-center">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Net Span</p>
                                        <p className="text-sm font-bold text-gray-800">{aiCalculations.estimated_distance_km} km</p>
                                    </div>
                                    <div className="bg-green-50/50 p-2 rounded-xl text-center border border-green-100/50">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-green-600">Saved CO₂e</p>
                                        <p className="text-sm font-bold text-green-700">-{aiCalculations.total_carbon_saved_kg} kg</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-gray-100 ml-4 pl-2 items-start">
                        <button onClick={() => toast.dismiss(t.id)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg text-xs">✕</button>
                    </div>
                </div>
            ), { duration: 5000 });

        } catch (err) {
            setError(err.message || "Route optimization failed.");
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
                    'line-width': 4,
                    'line-opacity': 0.8,
                }
            });
        }

        const bbox = turf.bbox(geometry);
        map.fitBounds(bbox, { padding: 50, maxZoom: 14 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-[600px] border border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-white">
            {/* Left Control Dashboard */}
            <div className="lg:col-span-2 bg-white p-6 overflow-y-auto flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                        <div className="p-1.5 bg-green-50 rounded-lg">
                            <Compass className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Route Optimizer</h3>
                        <span className="ml-auto text-[8px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase">AI Engine</span>
                    </div>
                    
                    <form onSubmit={handleRouteOptimization} className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Departure</label>
                            <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} required className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5"><Target className="w-3 h-3" /> Destination</label>
                            <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} required className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5"><Car className="w-3 h-3" /> Class</label>
                                <input type="text" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Vehicle Make</label>
                                <input type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} required className="w-full text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full mt-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> <span>Computing...</span></> : <><Route className="w-4 h-4" /> <span>Optimize route</span></>}
                        </button>
                    </form>

                    {error && (
                        <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Metric Summary Visual blocks */}
                {analytics && (
                    <div className="space-y-3 pt-4 border-t border-gray-100 mt-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Distance</p>
                                <p className="text-lg font-black text-gray-800 mt-0.5">{analytics.estimated_distance_km} <span className="text-xs font-normal text-gray-400">km</span></p>
                            </div>
                            <div className="p-3 bg-green-50/50 border border-green-100/30 rounded-xl">
                                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">CO₂ Saved</p>
                                <p className="text-lg font-black text-green-700 mt-0.5">{analytics.total_carbon_saved_kg} <span className="text-xs font-normal text-green-500">kg</span></p>
                            </div>
                        </div>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                            {analytics.milestones?.map((item, idx) => (
                                <div key={idx} className="p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                                    <div className="min-w-0 flex-1 pr-2">
                                        <p className="font-bold text-[10px] text-green-600 uppercase tracking-wide">{item.mode} ({item.distance_km} km)</p>
                                        <p className="text-gray-600 truncate mt-0.5">{item.instruction}</p>
                                    </div>
                                    <span className="font-bold text-red-600 shrink-0 bg-white border border-gray-100 px-2 py-1 rounded-lg">+{item.emissions_kg}kg</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Map Block */}
            <div className="lg:col-span-3 w-full h-full bg-gray-50 relative">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
        </div>
    );
}
