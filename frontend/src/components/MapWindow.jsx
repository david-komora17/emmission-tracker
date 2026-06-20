// src/components/MapWindow.jsx
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function MapWindow({ routeData }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);

    // Default focus: Nairobi coordinates
    const defaultCenter = [36.8219, -1.2921]; // MapLibre uses [lng, lat]

    useEffect(() => {
        if (mapRef.current) return; // Prevent map from re-initializing twice

        // Initialize MapLibre GL Canvas
        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            // Premium keyless dark vector style from CartoDB
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: defaultCenter,
            zoom: 11,
            attributionControl: false
        });

        // Add standard navigation controls (zoom/rotate buttons)
        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Dynamically update and draw trajectories when routeData updates
    useEffect(() => {
        if (!mapRef.current || !routeData) return;

        const origin = routeData.origin?.coordinates; // Expected [lat, lng]
        const dest = routeData.destination?.coordinates; // Expected [lat, lng]

        if (!origin || !dest) return;

        // MapLibre expects coordinates in [lng, lat] structure
        const originLngLat = [origin[1], origin[0]];
        const destLngLat = [dest[1], dest[0]];

        const map = mapRef.current;

        // Fly smoothly to focus on the origin of the journey
        map.flyTo({
            center: originLngLat,
            zoom: 6,
            essential: true
        });

        // Remove old route layer if it exists to clean up the canvas
        if (map.getLayer('transit-line')) map.removeLayer('transit-line');
        if (map.getSource('route')) map.removeSource('route');

        // Draw the route trajectory line onto the vector framework
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [originLngLat, destLngLat]
                }
            }
        });

        map.addLayer({
            id: 'transit-line',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3b82f6', // Premium blue line
                'line-width': 4,
                'line-dasharray': [2, 2] // Dashed transit layout
            }
        });

    }, [routeData]);

    return (
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl h-[500px] w-full relative overflow-hidden'>
            <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden" />
        </div>
    );
}

export default MapWindow;