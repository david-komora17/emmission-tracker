// src/components/LoadingSpinner.jsx
import React from 'react';

function LoadingSpinner() {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="relative">
                <div className="w-12 h-12 border-3 border-gray-200 rounded-full animate-spin border-t-green-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
                </div>
            </div>
            <p className="text-sm font-medium text-gray-500 animate-pulse">
                Loading...
            </p>
        </div>
    );
}

export default LoadingSpinner;