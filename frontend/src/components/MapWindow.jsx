// src/components/MapWindow.jsx
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';

function MapWindow({ routeData }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);

    const defaultCenter = [36.8219, -1.2921]; // Nairobi [lng, lat]

    useEffect(() => {
        if (mapRef.current) return;

        mapRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: defaultCenter,
            zoom: 11,
            attributionControl: false
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !routeData) return;

        const origin = routeData.origin?.coordinates; 
        const dest = routeData.destination?.coordinates; 

        if (!origin || !dest) return;

        const originLngLat = [origin[1], origin[0]];
        const destLngLat = [dest[1], dest[0]];
        const map = mapRef.current;

        // Fetch street-by-street road paths from OSRM API routing system
        const fetchOSRMRoute = async () => {
            try {
                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${originLngLat.join(',')};${destLngLat.join(',')}?overview=full&geometries=geojson`
                );
                const data = await response.json();

                if (!data.routes || data.routes.length === 0) {
                    throw new Error("No road mapping geometry path returned from OSRM.");
                }

                let routeCoordinates = data.routes[0].geometry.coordinates;

                // Client-side smoothing layer using Turf.js Bezier Splines
                // This converts rough street vectors into flowing eco-curves
                const rawLineFeature = turf.lineString(routeCoordinates);
                const smoothedLineFeature = turf.bezierSpline(rawLineFeature, {
                    resolution: 10000,
                    sharpness: 0.85
                });

                // Clear previous layers
                if (map.getLayer('transit-line')) map.removeLayer('transit-line');
                if (map.getSource('route')) map.removeSource('route');

                // Draw the dynamic smoothed line geometry path onto MapLibre
                map.addSource('route', {
                    type: 'geojson',
                    data: smoothedLineFeature
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
                        'line-color': '#10b981', // Emerald green trace line
                        'line-width': 5,
                        'line-blur': 0.5
                    }
                });

                // Compute bounding box using turf to fit the map view dynamically
                const bbox = turf.bbox(smoothedLineFeature);
                map.fitBounds(bbox, {
                    padding: 60,
                    essential: true,
                    duration: 2000
                });

            } catch (err) {
                console.warn("OSRM routing failed, falling back to clean geodesic line string architecture:", err);
                // Fallback straight vector logic if OSRM is overloaded
                if (map.getLayer('transit-line')) map.removeLayer('transit-line');
                if (map.getSource('route')) map.removeSource('route');

                map.addSource('route', {
                    type: 'geojson',
                    data: turf.lineString([originLngLat, destLngLat])
                });
                map.addLayer({
                    id: 'transit-line',
                    type: 'line',
                    source: 'route',
                    paint: { 'line-color': '#3b82f6', 'line-width': 4 }
                });
            }
        };

        fetchOSRMRoute();
    }, [routeData]);

    return (
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-4 shadow-2xl h-[500px] w-full relative overflow-hidden'>
            <div ref={mapContainerRef} className="w-full h-full rounded-2xl overflow-hidden" />
        </div>
    );
}

export default MapWindow;