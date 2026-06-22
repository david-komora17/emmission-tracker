// src/components/MilestonesPanel.jsx
import React from 'react';
import { Leaf, ArrowRight, ShieldCheck } from 'lucide-react';
import * as lucideIcons from 'lucide-react';
import { getTransitIcon, formatDistance, formatCarbon } from '../utils/transitUtils';

function MilestonesPanel({ routeData }) {
    // Fallback placeholder template if no active analysis has run yet
    if (!routeData) {
        return (
            <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center text-white/70'>
                <Leaf className="w-12 h-12 mx-auto mb-4 text-green-300 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Eco-Transit Optimizer</h3>
                <p className="text-sm font-medium">Enter an origin and destination above to calculate environmental footprint trajectories and alternative transit milestones.</p>
            </div>
        );
    }

    const { summary, milestones } = routeData;

    return (
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl'>
            
            {/* Header: Inherits structural styling from 5 Day Forecast Header */}
            <div className='flex items-center space-x-3 mb-6'>
                <div className='p-2 bg-green-500/20 rounded-full border border-green-400/30'>
                    <Leaf className='w-6 h-6 text-green-300' />
                </div>
                <h2 className='text-2xl font-bold text-white'>AI Route Milestones</h2>
            </div>

            {/* Environmental Savings Summary Banner */}
            <div className='mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/10 backdrop-blur-sm rounded-2xl border border-green-400/20'>
                <div className='flex items-center space-x-2 text-green-300 text-xs font-bold uppercase tracking-wider mb-1'>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Carbon Saved Metric</span>
                </div>
                <div className='text-white font-extrabold text-2xl tracking-tight'>
                    {formatCarbon(summary.total_carbon_saved_kg)}
                </div>
                <p className='text-white/80 text-xs mt-2 italic leading-relaxed'>
                    "{summary.narrative}"
                </p>
            </div>

            {/* Dynamic Milestone Timeline List */}
            <div className='space-y-4 relative before:absolute before:left-9 before:top-6 before:bottom-6 before:w-0.5 before:bg-white/10'>
                {milestones.map((milestone, index) => {
                    // Match the dynamic transit string to a clean Lucide Icon reference
                    const iconName = getTransitIcon(milestone.mode);
                    const IconComponent = lucideIcons[iconName] || lucideIcons.Milestone;

                    return (
                        <div 
                            key={index} 
                            className='flex items-center justify-between p-5 bg-white/5 backdrop-blur-sm rounded-2xl 
                            hover:bg-white/10 transition-all duration-300 group border border-white/10 relative z-10'
                        >
                            {/* Left Content Side: Icon & Directions */}
                            <div className='flex items-center space-x-5 flex-1'>
                                <div className='p-3 bg-white/10 rounded-xl text-white/90 group-hover:text-white transition-all transform group-hover:scale-110 duration-300'>
                                    <IconComponent size={24} />
                                </div>
                                <div className='flex-1'>
                                    <div className='text-white font-semibold text-base flex items-center space-x-1'>
                                        <span className="capitalize">{milestone.mode.toLowerCase()}</span>
                                        <ArrowRight className="w-3 h-3 text-white/40" />
                                        <span className="text-white/80 font-normal truncate max-w-[150px] lg:max-w-[200px]">
                                            {milestone.instruction}
                                        </span>
                                    </div>
                                    <div className='text-white/60 text-xs mt-0.5 font-medium'>
                                        Distance Segment: {formatDistance(milestone.distance_km)}
                                    </div>
                                </div>
                            </div>

                            {/* Right Content Side: Segment Emissions Footprint */}
                            <div className='text-right ml-4'>
                                <div className='text-white font-bold text-base'>
                                    {milestone.emissions_kg === 0 ? (
                                        <span className="text-green-300 font-semibold text-sm">Carbon Free</span>
                                    ) : (
                                        `${milestone.emissions_kg.toFixed(1)} kg`
                                    )}
                                </div>
                                <div className='text-white/40 text-xs font-medium uppercase tracking-wider'>
                                    CO₂e Est.
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default MilestonesPanel;