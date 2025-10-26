'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, RefreshCw, Zap, Lock, Share2, Smartphone, Check, Clipboard } from 'lucide-react';

const FeatureCard = ({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  };

  const bgClass = colorMap[color] || colorMap['indigo'];
  
  return (
    <div className={`p-6 rounded-2xl bg-white/90 backdrop-blur-sm border ${bgClass.split(' ')[2]} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className={`w-12 h-12 rounded-xl ${bgClass.split(' ')[0]} flex items-center justify-center ${bgClass.split(' ')[1]} mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

const Step = ({ number, title, color }: { number: number; title: string; color: string }) => {
  const colorMap: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
    violet: 'text-violet-600 bg-violet-50',
    cyan: 'text-cyan-600 bg-cyan-50',
  };

  const colorClass = colorMap[color] || colorMap['indigo'];
  
  return (
    <div className="flex items-center space-x-4">
      <div className={`w-8 h-8 rounded-full ${colorClass.split(' ')[1]} flex-shrink-0 flex items-center justify-center ${colorClass.split(' ')[0]} font-medium`}>
        {number}
      </div>
      <span className="text-gray-700">{title}</span>
    </div>
  );
};

function HomeContent() {
  const [token, setToken] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Color theme - Subtle and Professional
  const theme = {
    primary: 'from-indigo-500 to-blue-600',
    secondary: 'from-slate-600 to-slate-700',
    accent: 'from-blue-400 to-indigo-500',
    success: 'from-emerald-400 to-teal-500',
    warning: 'from-amber-400 to-orange-400',
  };

    // Check for token in URL or local storage on component mount
    useEffect(() => {
        // Check for token in URL first (for backward compatibility)
        const urlToken = searchParams?.get('token');

        // Then check local storage
        const storedToken = localStorage.getItem('clipboardSyncToken');

        if (urlToken) {
            // If token is in URL, save it to local storage and redirect
            localStorage.setItem('clipboardSyncToken', urlToken);
            router.replace(`/${urlToken}`);
        } else if (storedToken) {
            // If token is in local storage, pre-fill the input
            setToken(storedToken);
        }
    }, [searchParams, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (token.trim()) {
            router.push(`/${token}`);
        }
    };

  const generateNewToken = () => {
    const newToken = `token_${Math.random().toString(36).substr(2, 9)}`;
    setToken(newToken);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3">
      <div className="w-full max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center py-4 sm:py-8 md:py-12">
          <div className="flex items-center justify-center gap-4 mb-4 md:mb-6">
            <img 
              src="/window.svg" 
              alt="Clipboard Sync Logo" 
              className="w-12 h-12 md:w-16 md:h-16"
            />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900">
              Clipboard Sync
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Seamlessly sync your clipboard across all your devices
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full bg-gradient-to-br from-indigo-50 to-blue-50 p-6 sm:p-8 mb-6 sm:mb-12 rounded-xl border-2 border-blue-100 shadow-lg">
          <div className="text-center space-y-1 mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Access Your Clipboard
            </h2>
            <p className="text-gray-500 text-sm">
              Enter or generate a token to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="relative">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value);
                      setIsCopied(false);
                    }}
                    placeholder="Enter or generate a token"
                    className="w-full px-4 sm:px-5 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-150 text-sm sm:text-base bg-white/80 hover:bg-white"
                    required
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {token && (
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-0 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} className="flex-shrink-0" />
                          <span className="whitespace-nowrap">Copied!</span>
                        </>
                      ) : (
                        <Copy size={16} className="flex-shrink-0" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={generateNewToken}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-3 sm:py-0 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <RefreshCw size={16} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">New</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Save this token to access your clipboard from other devices
              </p>
            </div>

            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-all duration-200 flex items-center justify-center space-x-2 hover:shadow-md"
            >
              <Zap size={18} />
              <span>Access My Clipboard</span>
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <FeatureCard
            icon={<Share2 className="w-6 h-6" />}
            title="Easy Sharing"
            description="Quickly share clipboard content between devices"
            color="violet"
          />
          <FeatureCard
            icon={<RefreshCw className="w-6 h-6" />}
            title="Sync in Real-Time"
            description="See updates instantly across all connected devices"
            color="indigo"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Lightning Fast"
            description="Minimal delay between copying and pasting"
            color="cyan"
          />
        </div>

        {/* How It Works */}
        <div className="w-full bg-white/80 backdrop-blur-sm p-4 sm:p-6 border-t border-gray-100">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">How It Works</h2>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
              <Step number={1} title="Generate a unique token" color="indigo" />
              <div className="h-1 w-8 bg-indigo-200 rounded-full hidden md:block"></div>
              <Step number={2} title="Use it on all your devices" color="emerald" />
              <div className="h-1 w-8 bg-emerald-200 rounded-full hidden md:block"></div>
              <Step number={3} title="Your clipboard syncs automatically" color="amber" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Clipboard Sync. All rights reserved.</p>
      </footer>
    </div>
  );
}


export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}