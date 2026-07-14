// src/App.jsx - Updated with Carbon Offsetting Integration
import React, { useState, useEffect } from 'react';
import { 
  Leaf, 
  LogOut, 
  User, 
  Shield, 
  Menu, 
  X, 
  Scan,
  MoreVertical,
  MessageSquare,
  Settings,
  HelpCircle,
  FileText,
  DollarSign
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import MapWindow from './components/MapWindow';
import LoadingSpinner from './components/LoadingSpinner';
import ProductScanner from './components/ProductScanner';
import SearchBar from './components/SearchBar';
import RegisterComponent from './components/Register';
import QuotaPaywallCard from './components/Paywall';
import UserProfile from './components/UserProfile';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDash.jsx';
import Complaints from './components/Complaints';
import CarbonOffsetModal from './components/CarbonOffsetModal'; // New Import
import { useTransitOptimizer } from './hooks/useTransitOptimizer';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [userFirstName, setUserFirstName] = useState('');
    const [showProfileCard, setShowProfileCard] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showOffsetModal, setShowOffsetModal] = useState(false); // Carbon Offset state
    const [paywallMetrics, setPaywallMetrics] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showComplaints, setShowComplaints] = useState(false);
    const [showDropdownMenu, setShowDropdownMenu] = useState(false);

    const { optimizeRoute, processVoiceLog, routeData, loading, error, setError } = useTransitOptimizer();

    useEffect(() => {
        if (isAuthenticated) {
            const rawName = localStorage.getItem('username') || 'Climatiqa User';
            const firstNameToken = rawName.trim().split(' ')[0];
            setUserFirstName(firstNameToken || 'User');
            
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

    useEffect(() => {
        const openPaywallListener = () => setShowPaywall(true);
        window.addEventListener('openPaywall', openPaywallListener);
        return () => window.removeEventListener('openPaywall', openPaywallListener);
    }, []);

    const handleLogOut = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserFirstName('');
        setShowDropdownMenu(false);
    };

    const handleQuotaExceeded = (quotaError) => {
        setPaywallMetrics(quotaError);
        setShowPaywall(true);
        setError(null);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdownMenu && !event.target.closest('.dropdown-menu')) {
                setShowDropdownMenu(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showDropdownMenu]);

    if (!isAuthenticated) {
        return <RegisterComponent onAuthSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen relative">
            {/* Forest Background */}
            <div 
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ 
                    backgroundImage: `url('/src/assets/geranimo-qzgN45hseN0-unsplash.jpg')`,
                    backgroundAttachment: 'fixed'
                }}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16 gap-4">
                            {/* Brand */}
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-700/10 rounded-xl">
                                    <Leaf className="w-6 h-6 text-green-700" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                                        Climatiqa
                                    </h1>
                                    <p className="text-[8px] font-semibold text-gray-500 tracking-[0.2em] uppercase">
                                        Carbon Intelligence
                                    </p>
                                </div>
                                {isAdmin && (
                                    <span className="ml-2 text-[8px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        Admin
                                    </span>
                                )}
                            </div>

                            {/* Desktop Right Section */}
                            <div className="hidden md:flex items-center gap-4">
                                <div className="w-72">
                                    <SearchBar />
                                </div>

                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    <Scan className="w-4 h-4" />
                                    Scan
                                </button>

                                {/* User Widget */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowProfileCard(true)}
                                        className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-all duration-200"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            {userFirstName || 'User'}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                            {userFirstName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    </button>
                                    
                                    {/* Three-Dot Menu */}
                                    <div className="relative dropdown-menu">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDropdownMenu(!showDropdownMenu);
                                            }}
                                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="More options"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>

                                        {showDropdownMenu && (
                                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-fade-in">
                                                <button
                                                    onClick={() => {
                                                        setShowComplaints(true);
                                                        setShowDropdownMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    <span>Feedback & Complaints</span>
                                                </button>

                                                <div className="border-t border-gray-100 my-1"></div>

                                                <button
                                                    onClick={() => {
                                                        setShowProfileCard(true);
                                                        setShowDropdownMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span>My Profile</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setShowOffsetModal(true); // Open carbon offsetting modal
                                                        setShowDropdownMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <DollarSign className="w-4 h-4" />
                                                    <span>Offsetting emissions</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setShowDropdownMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    <span>Terms & Privacy</span>
                                                </button>

                                                <div className="border-t border-gray-100 my-1"></div>

                                                <button
                                                    onClick={handleLogOut}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Sign Out</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>

                        {/* Mobile Menu */}
                        {mobileMenuOpen && (
                            <div className="md:hidden py-4 space-y-4 border-t border-gray-200">
                                <div className="w-full">
                                    <SearchBar />
                                </div>
                                <button
                                    onClick={() => {
                                        setShowScanner(true);
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-all"
                                >
                                    <Scan className="w-4 h-4" />
                                    Scan Product
                                </button>
                                
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setShowComplaints(true);
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Feedback & Complaints
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProfileCard(true);
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        My Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOffsetModal(true);
                                            setMobileMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <Leaf className="w-4 h-4" />
                                        Offsetting emissions
                                    </button>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-full border border-gray-200">
                                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white">
                                            {userFirstName?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{userFirstName || 'User'}</span>
                                    </div>
                                    <button
                                        onClick={handleLogOut}
                                        className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors text-sm font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Content Area */}
                <Toaster position="top-right" reverseOrder={false} />
                <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                    {isAdmin ? (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                            <AdminDashboard />
                        </div>
                    ) : (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            {loading && !routeData ? (
                                <div className="h-[600px] flex flex-col items-center justify-center">
                                    <LoadingSpinner />
                                    <p className="mt-4 text-sm font-medium text-gray-500">
                                        Calculating optimal route...
                                    </p>
                                </div>
                            ) : (
                                <MapWindow routeData={routeData} onQuotaExceeded={handleQuotaExceeded} />
                            )}
                        </div>
                    )}
                </main>

                <Footer />

                {/* Modals */}
                {showPaywall && !isAdmin && (
                    <QuotaPaywallCard 
                        errorDetails={paywallMetrics} 
                        onClose={() => setShowPaywall(false)} 
                        onPaymentSuccess={(payload) => {
                            if (payload?.status === 'completed') {
                                setPaywallMetrics(null);
                            }
                        }}
                    />
                )}
                
                {showProfileCard && (
                    <UserProfile onClose={() => setShowProfileCard(false)} />
                )}

                {showScanner && (
                    <ProductScanner 
                        onClose={() => setShowScanner(false)}
                        onScanComplete={(data) => {
                            console.log('Scanned product:', data);
                        }}
                    />
                )}

                {showComplaints && (
                    <Complaints onClose={() => setShowComplaints(false)} />
                )}

                {/* Carbon Offset Modal */}
                {showOffsetModal && (
                    <CarbonOffsetModal onClose={() => setShowOffsetModal(false)} />
                )}
            </div>
        </div>
    );
}

export default App;