// src/components/LoadingSpinner.jsx
import React from 'react';

function LoadingSpinner() {
    return (
        <div className='flex flex-col items-center justify-center p-12 space-y-4'>
            <div className='relative'>
                {/* Outer Glassy Spin Ring */}
                <div className='w-20 h-20 border-4 border-white/20 rounded-full animate-spin border-t-green-400/80 shadow-lg '></div>
                
                {/* Inner Counter-Rotating Accent Ring */}
                <div className='absolute inset-2 w-12 h-12 border-3 border-blue-200/30 rounded-full animate-spin border-t-blue-400/80 animation-delay-150 [animation-direction:reverse]'></div>
                
                {/* Pulsating Center Core */}
                <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='w-3 h-3 bg-white/60 rounded-full animate-pulse'></div>
                </div>
            </div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest animate-pulse">
                Retrieving Data...
            </p>
        </div>
    );
}

export default LoadingSpinner;