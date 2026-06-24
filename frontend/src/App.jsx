// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Leaf, Navigation2, ShoppingBag, Mic, Radio, Square, ShieldAlert, LogOut } from 'lucide-react';
import SearchBar from './components/SearchBar';
import MapWindow from './components/MapWindow';
import LoadingSpinner from './components/LoadingSpinner';
import MilestonesPanel from './components/MilestonesPanel';
import ProductLogPanel from './components/ProductLogPanel';
import RegisterComponent from './components/Register';
import AdminDashboard from './components/AdminDash';
import QuotaPaywallCard from './components/Paywall'; 
import Footer from './components/Footer';                    
import { useTransitOptimizer } from './hooks/useTransitOptimizer';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
    const [activeTab, setActiveTab] = useState('transit');
    const [isRecording, setIsRecording] = useState(false);
    const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || 'USER');
    const [userFirstName, setUserFirstName] = useState('');
    
    // Quota tracking block for paywall interception 
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallMetrics, setPaywallMetrics] = useState(null);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const { optimizeRoute, processVoiceLog, routeData, loading, error, setError } = useTransitOptimizer();

    // Parse the system owner's first name token for the Chrome-style avatar circle
    useEffect(() => {
        if (isAuthenticated) {
            const rawName = localStorage.getItem('username') || 'Climatiqa User';
            const firstNameToken = rawName.trim().split(' ')[0];
            setUserFirstName(firstNameToken);
            setUserRole(localStorage.getItem('user_role') || 'USER');
        }
    }, [isAuthenticated]);

    // Global intercept watcher targeting 429 structured validation payload attributes
    useEffect(() => {
        if (error && typeof error === 'object' && (error.code === 'TRIAL_EXPIRED' || error.status === 429)) {
            setPaywallMetrics(error);
            setShowPaywall(true);
            setError(null); 
        } else if (error && typeof error === 'string' && error.includes('429')) {
            setPaywallMetrics({ error: "Your application query instance limits have expired.", current_usage: 5, amount_payable: 5.00 });
            setShowPaywall(true);
            setError(null);
        }
    }, [error, setError]);

    const handleLogOut = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setActiveTab('transit');
    };

    const handleRouteRequest = ({ origin, destination }) => {
        // Fallback or default vehicle options passed directly down to the optimizer hook safely
        optimizeRoute({
            origin,
            destination,
            vehicleType: 'GASOLINE',
            vehicleMake: 'Standard Fleet Profile'
        });
    };

    const startRecordingVoice = async () => {
        audioChunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : { mimeType: 'audio/ogg' };
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const recordedType = mediaRecorderRef.current.mimeType;
                const audioBlob = new Blob(audioChunksRef.current, { type: recordedType });
                stream.getTracks().forEach(track => track.stop());
                await processVoiceLog(audioBlob, 'GASOLINE');
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            alert("Microphone permission denied.");
            console.error(err);
        }
    };
    
    const stopRecordingVoice = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Unauthenticated Session Gateway Block
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-zinc-950 text-white font-sans antialiased flex items-center justify-center py-16 px-4">
                <RegisterComponent onAuthSuccess={() => setIsAuthenticated(true)} />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-emerald-950 to-zinc-950 text-white font-sans antialiased selection:bg-green-500/30 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
            
            {/* Paywall Overlay Interceptor Layout */}
            {showPaywall && (
                <QuotaPaywallCard 
                    errorDetails={paywallMetrics} 
                    onClose={() => setShowPaywall(false)}
                    onPaymentSuccess={() => console.log('M-Pesa Webhook polling synchronized.')}
                />
            )}

            <div className="max-w-7xl mx-auto space-y-8 w-full mb-auto">
                
                {/* Navigation Header Panel */}
                <header className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/20">
                            <Leaf className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white">CLIMATIQA</h1>
                        </div>
                    </div>

                    {/* Tabs Engine */}
                    <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('transit')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                activeTab === 'transit' ? 'bg-emerald-500 text-white shadow-md' : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <Navigation2 className="w-3.5 h-3.5" />
                            <span>Transit Paths</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('product')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                activeTab === 'product' ? 'bg-emerald-500 text-white shadow-md' : 'text-white/60 hover:text-white'
                            }`}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Product Log</span>
                        </button>

                        {userRole === 'ADMIN' && (
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                    activeTab === 'admin' ? 'bg-red-500 text-white shadow-md' : 'text-red-400/70 hover:text-red-400'
                                }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Admin Panel</span>
                            </button>
                        )}
                    </div>
                    
                    {/* Identity Widget Deck */}
                    <div className="flex items-center space-x-2 bg-white/5 pl-3 pr-1.5 py-1 rounded-full border border-white/10">
                        <span className="text-xs font-bold tracking-wide text-white/80">{userFirstName}</span>
                        <div 
                            title={`Logged in as ${userFirstName}`}
                            className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-xs font-black text-white uppercase shadow-md select-none"
                        >
                            {userFirstName.charAt(0) || 'C'}
                        </div>
                        <button 
                            onClick={handleLogOut}
                            title="Log out of application session"
                            className="p-1.5 text-white/40 hover:text-red-400 transition-colors rounded-full"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </header>

                {/* Conditional Segment Switch Router */}
                {activeTab === 'admin' ? (
                    <AdminDashboard />
                ) : (
                    <>
                        {/* Audio Streaming Input Dock */}
                        <div className="w-full max-w-4xl mx-auto flex items-center justify-between p-4 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl shadow-md">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-xl transition-colors ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                                    {isRecording ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                </div>
                                <span className="text-xs font-semibold tracking-wide text-white/70">
                                    {isRecording ? "Listening to voice input parameters..." : "Tap to issue environmental voice tracking directions directly via Whisper"}
                                </span>
                            </div>
                            <button 
                                onClick={isRecording ? stopRecordingVoice : startRecordingVoice}
                                className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center space-x-2 border ${
                                    isRecording 
                                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-400/30' 
                                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                                }`}
                            >
                                <span>{isRecording ? "Stop Capture" : "Voice Stream"}</span>
                            </button>
                        </div>

                        <section>
                            {activeTab === 'transit' ? (
                                <SearchBar onOptimize={handleRouteRequest} loading={loading} />
                            ) : (
                                <ProductLogPanel />
                            )}
                        </section>

                        {error && typeof error === 'string' && (
                            <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-300 text-sm font-medium text-center shadow-lg">
                                ⚠️ {error}
                            </div>
                        )}

                        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            <div className="lg:col-span-2 w-full">
                                {loading && !routeData ? (
                                    <div className="bg-white/10 border border-white/20 rounded-3xl p-24 flex items-center justify-center">
                                        <LoadingSpinner />
                                    </div>
                                ) : (
                                    <MapWindow routeData={routeData} />
                                )}
                            </div>
                            <div className="lg:col-span-1 w-full">
                                <MilestonesPanel routeData={routeData} />
                            </div>
                        </main>
                    </>
                )}
            </div>

            {/* Layout Consolidated Footer */}
            <div className="max-w-7xl mx-auto w-full">
                <Footer />
            </div>
        </div>
    );
}

export default App;