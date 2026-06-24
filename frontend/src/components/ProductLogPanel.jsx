// src/components/ProductLogPanel.jsx
import React, { useState } from 'react';
import { ShoppingBag, Sparkles, X, Leaf, CheckCircle } from 'lucide-react';

function ProductLogPanel() {
    const [category, setCategory] = useState('diet');
    const [activityType, setActivityType] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [logging, setLogging] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [aiToastData, setAiToastData] = useState(null);

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setLogging(true);
        setErrorMessage('');
        setAiToastData(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:8000/api/premium/ai-optimizer/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    task: 'product',
                    category: category,
                    activity_type: activityType,
                    quantity: quantity
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze product footprint metrics.');
            }

            // Bind backend standard JSON schemas matching route shapes directly to local view hooks
            setAiToastData(data);
            setActivityType('');
            setQuantity(1);
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setLogging(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-400">
                        <ShoppingBag className="w-5 h-5" />
                        <h3 className="font-bold text-lg text-white">Product Entries</h3>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                        Track commodities, sustainable asset installations, food options, or energy alterations instantly below.
                    </p>
                </div>

                <form onSubmit={handleProductSubmit} className="md:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch w-full">
                    <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="p-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm font-semibold"
                    >
                        <option value="diet">Consumables</option>
                        <option value="home_energy">Home Utilities / Energy</option>
                        <option value="transportation">Logistical Supply</option>
                    </select>

                    <input 
                        type="text"
                        required
                        placeholder="Item details (e.g., Plant-Based Meal, LED Bulb)..."
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="flex-1 p-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm"
                    />

                    <input 
                        type="number" 
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-20 p-4 bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-400/30 text-sm font-bold"
                    />

                    <button 
                        type="submit"
                        disabled={logging}
                        className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl transition-all duration-300 text-sm shrink-0 flex items-center justify-center space-x-2 border border-emerald-400/20"
                    >
                        {logging ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                <span>Log Item</span>
                            </>
                        )}
                    </button>
                </form>

                {errorMessage && (
                    <div className="col-span-1 md:col-span-3 text-center text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-2">
                        ⚠️ {errorMessage}
                    </div>
                )}
            </div>

            {/* AI Injectable Feedback Toast Overlay Panel */}
            {aiToastData && (
                <div className="w-full bg-zinc-950/90 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl relative animate-fade-in text-white space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400">
                                <Leaf className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400">AI Environmental Footprint Ledger</h4>
                                <p className="text-[10px] text-white/40">Processed via Groq Unified Optimization Node</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setAiToastData(null)}
                            className="p-1 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors"
                            aria-label="Close message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-xs text-white/90 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed italic">
                        "{aiToastData.narrative}"
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="block text-[10px] uppercase font-bold tracking-widest text-white/40">Total Carbon Saved</span>
                            <span className="text-lg font-black text-emerald-300">{aiToastData.total_carbon_saved_kg} KG CO₂</span>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="block text-[10px] uppercase font-bold tracking-widest text-white/40">Calculated Intensity Range</span>
                            <span className="text-lg font-black text-teal-300">{aiToastData.estimated_distance_km} Index</span>
                        </div>
                    </div>

                    {aiToastData.milestones && aiToastData.milestones.length > 0 && (
                        <div className="space-y-2 border-t border-white/5 pt-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Footprint Breakdown Matrix</span>
                            <div className="space-y-1.5">
                                {aiToastData.milestones.map((stage, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-black/40 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="text-white/80 font-medium">{stage.instruction}</span>
                                        </div>
                                        <span className="text-red-400/90 font-mono font-bold shrink-0">+{stage.emissions_kg} kg</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ProductLogPanel;