// src/App.jsx
import React, { useState } from 'react';
import { Leaf } from 'lucide-react';
import SearchBar from './components/SearchBar';
import VehicleToggle from './components/VehicleToggle';
import MapWindow from './components/MapWindow';
import LoadingSpinner from './components/LoadingSpinner';
import MilestonesPanel from './components/MilestonesPanel';
import { useTransitOptimizer } from './hooks/useTransitOptimizer';

function App() {
    const [vehicleType, setVehicleType] = useState('GASOLINE');
    const { optimizeRoute, routeData, loading, error } = useTransitOptimizer();

    // Callback when the main search bar form executes
    const handleRouteRequest = ({ origin, destination }) => {
        optimizeRoute({
            origin,
            destination,
            vehicleType,
            vehicleMake: vehicleType === 'GASOLINE' ? 'Standard ICE' : 'Standard EV'
        });
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-zinc-950 text-white font-sans antialiased selection:bg-green-500/30 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Block Section */}
                <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/20">
                            <Leaf className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white">
                                CLIMATIQA
                            </h1>
                            <p className="text-xs font-semibold text-green-400/80 tracking-wider uppercase">
                                Optimizing green living!
                            </p>
                        </div>
                    </div>
                    
                    {/* Vehicle Profile Selection Controls */}
                    <VehicleToggle vehicleType={vehicleType} onToggle={setVehicleType} />
                </header>

                {/* Core Search Dashboard Block */}
                <section>
                    <SearchBar onOptimize={handleRouteRequest} loading={loading} />
                </section>

                {/* Errors Banner Feedback if network or mapping processes fail */}
                {error && (
                    <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-300 text-sm font-medium text-center shadow-lg backdrop-blur-md">
                        ⚠️ {error}
                    </div>
                )}

                {/* Main Dynamic Workspace Area */}
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    
                    {/* Left & Center Viewports: Map Component (Takes 2 columns on wide screens) */}
                    <div className="lg:col-span-2 w-full">
                        {loading && !routeData ? (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-24 shadow-2xl flex items-center justify-center">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <MapWindow routeData={routeData} />
                        )}
                    </div>

                    {/* Right Viewport: AI Journey Timeline Milestones (Takes 1 column) */}
                    <div className="lg:col-span-1 w-full">
                        <MilestonesPanel routeData={routeData} />
                    </div>

                </main>
            </div>
        </div>
    );
}

export default App;