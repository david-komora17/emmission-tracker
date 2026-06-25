// src/components/SearchBar.jsx
import React, { useState } from 'react';
import { MapPin, Navigation, Car, Compass, Search } from 'lucide-react';

function SearchBar({ onOptimize, loading }) {
    const [origin, setOrigin] = useState('Runda, Nairobi');
    const [destination, setDestination] = useState('Kileleshwa, Nairobi');
    const [vehicleType, setVehicleType] = useState('SUV');
    const [vehicleMake, setVehicleMake] = useState('Range Rover Velar');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (origin.trim() && destination.trim() && vehicleType.trim() && vehicleMake.trim()) {
            onOptimize({ 
                origin: origin.trim(), 
                destination: destination.trim(), 
                vehicleType: vehicleType.trim(), 
                vehicleMake: vehicleMake.trim() 
            });
        }
    };

    return (
        <div className='w-full max-w-7xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl mb-6'>
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
    );
}

export default SearchBar;