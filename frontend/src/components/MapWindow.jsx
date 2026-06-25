// src/components/MapWindow.jsx
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapWindow({ routeData }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const routeMarkersRef = useRef([]);

    // Initialize Map Instance Base Canvas
    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [36.8219, -1.2921], // Nairobi Default Datums
            zoom: 12,
            pitch: 20
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Watcher: Re-renders polylines and camera vectors reactively when state coordinates change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !routeData) return;

        // Ensure we execute structural pathing adjustments only after map styles finish compiling
        if (!map.isStyleLoaded()) {
            map.once('load', () => drawReactiveRoute(routeData));
        } else {
            drawReactiveRoute(routeData);
        }
    }, [routeData]);

    const drawReactiveRoute = async (data) => {
        const map = mapRef.current;
        if (!map) return;

        try {
            // Helper conversion task matching Nominatim addresses to map geometry points
            const geocode = async (addr) => {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr + ', Kenya')}&limit=1`);
                const items = await res.json();
                if (!items || items.length === 0) throw new Error("Trace node missing mapping references.");
                return [parseFloat(items[0].lon), parseFloat(items[0].lat)];
            };

            const [startCoords, endCoords] = await Promise.all([
                geocode(data.origin || "Runda, Nairobi"),
                geocode(data.destination || "Kileleshwa, Nairobi")
            ]);

            // Clear legacy viewport pointer coordinates
            routeMarkersRef.current.forEach(m => m.remove());
            routeMarkersRef.current = [];

            // Anchor clear indicators mapping source and target locations
            const startMarker = new maplibregl.Marker({ color: '#10b981' }).setLngLat(startCoords).addTo(map);
            const endMarker = new maplibregl.Marker({ color: '#ef4444' }).setLngLat(endCoords).addTo(map);
            routeMarkersRef.current = [startMarker, endMarker];

            // Request routing geometries from OSRM
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.join(',')};${endCoords.join(',')}?overview=full&geometries=geojson`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();

            if (osrmData.routes && osrmData.routes.length > 0) {
                const geometry = osrmData.routes[0].geometry;

                // Mutate lines or construct a clean source container layout frame dynamically
                if (map.getSource('optimized-route')) {
                    map.getSource('optimized-route').setData(geometry);
                } else {
                    map.addSource('optimized-route', { type: 'geojson', data: geometry });
                    map.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'optimized-route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#10b981', 'line-width': 5, 'line-opacity': 0.85 }
                    });
                }

                // Smoothly focus viewport onto the active vector tracking span via Turf.js
                const bbox = turf.bbox(geometry);
                map.fitBounds(bbox, { padding: 40, maxZoom: 14, duration: 1000 });
            }
        } catch (err) {
            console.error("Spatial routing renderer tracking error:", err);
        }
    };

    return (
        <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md pointer-events-none select-none text-[9px] font-black tracking-widest uppercase text-white/50 z-10 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OSRM + MapLibre Live Matrix
            </div>
        </div>
    );
}