// src/components/Footer.jsx
import React from 'react';
import { Leaf } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-8 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-green-600" />
                        <span>© {new Date().getFullYear()} Climatiqa</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-400">Carbon Intelligence Platform</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-400">Carbon Neutral</span>
                        <span className="text-gray-300">|</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;