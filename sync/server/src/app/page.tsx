'use client';

import { useState, useEffect } from 'react';
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

export default function Home() {
  const [token, setToken] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Color theme - Neon/Teal
  const theme = {
    primary: 'from-teal-400 to-cyan-500',
    secondary: 'from-emerald-400 to-teal-500',
    accent: 'from-cyan-300 to-sky-500',
    success: 'from-green-400 to-emerald-500',
    warning: 'from-yellow-300 to-amber-500',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 ">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero Section */}
        <div className="text-center py-12 md:py-16">
          <div className="flex items-center justify-center gap-4 mb-4 md:mb-6">
            <img 
              src="/window.svg" 
              alt="Clipboard Sync Logo" 
              className="w-12 h-12 md:w-16 md:h-16"
            />
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.primary}`}>
              Clipboard Sync
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Seamlessly sync your clipboard across all your devices
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 mb-12 border border-gray-100 transform transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${theme.primary} text-black">
              Access Your Clipboard
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setIsCopied(false);
                  }}
                  placeholder="Enter or generate a token"
                  className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
                  required
                />
                {token && (
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="px-4 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center space-x-2"
                  >
                    {isCopied ? (
                      <>
                        <Check size={18} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={generateNewToken}
                  className="px-4 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw size={18} />
                  <span>New</span>
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Save this token to access your clipboard from other devices
              </p>
            </div>

            <button
              type="submit"
              disabled={!token.trim()}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center space-x-2"
            >
              <Zap size={18} />
              <span>Access My Clipboard</span>
            </button>
          </form>
        </div>

        {/* Features */}
        <div className="w-full grid md:grid-cols-3 gap-6 mb-12">
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
        <div className="w-full bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-100">
          <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">How It Works</h2>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
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