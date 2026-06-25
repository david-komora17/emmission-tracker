// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Leaf, LogOut, User, Shield, Menu, X } from 'lucide-react';
import MapWindow from './components/MapWindow';
import LoadingSpinner from './components/LoadingSpinner';
import ProductScanner from './components/ProductScanner';
import RegisterComponent from './components/Register';
import QuotaPaywallCard from './components/Paywall'; 
import UserProfile from './components/UserProfile';
import Footer from './components/Footer';                    
import AdminDashboard from './components/AdminDash';
import { useTransitOptimizer } from './hooks/useTransitOptimizer';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [userFirstName, setUserFirstName] = useState('');
    const [showProfileCard, setShowProfileCard] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallMetrics, setPaywallMetrics] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { optimizeRoute, processVoiceLog, routeData, loading, error, setError } = useTransitOptimizer();

    useEffect(() => {
        if (isAuthenticated) {
            const rawName = localStorage.getItem('username') || 'Climatiqa User';
            const firstNameToken = rawName.trim().split(' ')[0];
            setUserFirstName(firstNameToken);
            
            const role = localStorage.getItem('user_role');
            setIsAdmin(role === 'ADMIN');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (error && typeof error === 'object' && error.status === 429 && !isAdmin) {
            setPaywallMetrics(error);
            setShowPaywall(true);
            setError(null); 
        }
    }, [error, setError, isAdmin]);

    const handleLogOut = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setIsAdmin(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0f0e] via-[#0d1a15] to-[#0a0f0e] text-white flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />
                <RegisterComponent onAuthSuccess={() => setIsAuthenticated(true)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#0a0f0e] text-white font-sans antialiased">
            {/* Ambient Glow Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl" />
            </div>

            {/* Paywall Overlay */}
            {showPaywall && !isAdmin && (
                <QuotaPaywallCard 
                    errorDetails={paywallMetrics} 
                    onClose={() => setShowPaywall(false)} 
                />
            )}
            
            {/* Profile Modal */}
            {showProfileCard && <UserProfile onClose={() => setShowProfileCard(false)} />}

            {/* Main Content Container */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col min-h-screen">
                
                {/* ===== HEADER ===== */}
                <header className="flex items-center justify-between gap-4 py-4 border-b border-emerald-500/10">
                    {/* Brand */}
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl" />
                            <div className="relative p-2.5 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                                <Leaf className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">
                                <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                                    CLIMATIQA
                                </span>
                            </h1>
                            <p className="text-[9px] font-bold text-emerald-400/40 tracking-[0.2em] uppercase">
                                Carbon Intelligence
                            </p>
                        </div>
                        {isAdmin && (
                            <span className="ml-2 text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Admin
                            </span>
                        )}
                    </div>

                    {/* Desktop Right Section */}
                    <div className="hidden md:flex items-center gap-4">
                        {/* Scanner - Elegant compact version */}
                        <div className="w-64">
                            <ProductScanner />
                        </div>

                        {/* User Widget */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowProfileCard(true)}
                                className="flex items-center gap-3 px-3 py-1.5 bg-white/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-full transition-all duration-300 group"
                            >
                                <span className="text-xs font-semibold text-emerald-400/80 group-hover:text-emerald-300 transition-colors">
                                    {userFirstName}
                                </span>
                                <div className="relative">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-emerald-500/20">
                                        {userFirstName.charAt(0) || 'C'}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0a0f0e] flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </button>
                            
                            <button
                                onClick={handleLogOut}
                                className="p-2 text-emerald-400/30 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 group"
                                title="Sign Out"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-emerald-400/60 hover:text-emerald-400 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </header>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-4 border-b border-emerald-500/10">
                        <div className="w-full">
                            <ProductScanner />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10">
                            <button
                                onClick={() => {
                                    setShowProfileCard(true);
                                    setMobileMenuOpen(false);
                                }}
                                className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-full border border-emerald-500/10"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-xs font-black text-white">
                                    {userFirstName.charAt(0) || 'C'}
                                </div>
                                <span className="text-sm font-semibold text-white/80">{userFirstName}</span>
                            </button>
                            <button
                                onClick={handleLogOut}
                                className="flex items-center gap-2 px-4 py-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors text-sm font-medium"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== MAIN CONTENT ===== */}
                <main className="flex-1 py-6">
                    {isAdmin ? (
                        // Admin View
                        <div className="bg-white/[0.02] backdrop-blur-sm rounded-3xl border border-emerald-500/10 p-6">
                            <AdminDashboard />
                        </div>
                    ) : (
                        // User View - MapWindow handles everything including search
                        <div className="bg-white/[0.02] backdrop-blur-sm rounded-3xl border border-emerald-500/10 overflow-hidden">
                            {loading && !routeData ? (
                                <div className="h-[600px] flex flex-col items-center justify-center">
                                    <LoadingSpinner />
                                    <p className="mt-4 text-[10px] font-bold text-emerald-400/50 tracking-[0.2em] uppercase animate-pulse">
                                        Calculating optimal route...
                                    </p>
                                </div>
                            ) : (
                                <MapWindow routeData={routeData} />
                            )}
                        </div>
                    )}
                </main>

                {/* ===== FOOTER ===== */}
                <Footer />
            </div>
        </div>
    );
}

export default App;