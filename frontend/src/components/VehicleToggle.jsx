// src/components/VehicleToggle.jsx
import React from 'react';
import { Car, Zap } from 'lucide-react';

function VehicleToggle({ vehicleType, onToggle }) {
    return (
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-1 shadow-lg flex items-center space-x-1'>
            <button 
                type="button"
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center space-x-1.5 ${
                    vehicleType === 'GASOLINE' 
                        ? 'bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-200 border border-orange-500/30 shadow-md scale-105' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`} 
                onClick={() => onToggle('GASOLINE')}
            >
                <Car className="w-4 h-4" />
                <span>Gasoline</span>
            </button>
            <button 
                type="button"
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center space-x-1.5 ${
                    vehicleType === 'ELECTRIC' 
                        ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-200 border border-green-500/30 shadow-md scale-105' 
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`} 
                onClick={() => onToggle('ELECTRIC')}
            >
                <Zap className="w-4 h-4" />
                <span>Electric</span>
            </button>
        </div>
    );
}

export default VehicleToggle;