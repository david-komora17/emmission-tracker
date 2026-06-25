// src/components/Footer.jsx
import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full border-t border-white/5 mt-16 pt-6 pb-2 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-white/40 text-[11px] font-semibold tracking-wide uppercase select-none">
            <div className="flex items-center space-x-1">
                <span>© {new Date().getFullYear()} Climatiqa</span>
                <span className="text-emerald-500/60 font-black">·</span>
            </div>
            
        </footer>
    );
};

export default Footer;