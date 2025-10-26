'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ClipboardItem } from '@/types/clipboard';
import { Copy, Trash2, ArrowLeft } from 'lucide-react';

type Toast = {
  id: number;
  message: string;
  isError: boolean;
};

// Dynamically import the ClipboardHistory component with no SSR
const ClipboardHistory = dynamic(
  () => import('@/components/ClipboardHistory'),
  { ssr: false }
);

export default function TokenPage() {
  const router = useRouter();
  const params = useParams();
  const [token, setToken] = useState('');
  
  // Load token from URL params or local storage
  useEffect(() => {
    const urlToken = Array.isArray(params.token) ? params.token[0] : params.token || '';
    
    if (urlToken) {
      // If token is in URL, save it to local storage and state
      localStorage.setItem('clipboardSyncToken', urlToken);
      setToken(urlToken);
    } else {
      // Try to load from local storage if not in URL
      const storedToken = localStorage.getItem('clipboardSyncToken');
      if (storedToken) {
        // If we have a stored token, redirect to the token URL
        router.replace(`/${storedToken}`);
      } else {
        // No token found, redirect to home
        router.replace('/');
      }
    }
  }, [params.token, router]);
  
  const [clipboardContent, setClipboardContent] = useState('');
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show toast message
  const showToast = useCallback((message: string, isError = false) => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { id, message, isError }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  // Clear token from local storage
  const clearToken = useCallback(() => {
    localStorage.removeItem('clipboardSyncToken');
    setToken('');
    router.replace('/');
  }, [router]);

  // Check connection status
  const checkConnection = useCallback(async () => {
    if (!token) return false;
    
    try {
      const response = await fetch(`/api/clipboard/${encodeURIComponent(token)}`, { method: 'HEAD' });
      const isConnected = response.ok;
      setIsOnline(isConnected);
      return isConnected;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, [token]);

  // Fetch clipboard history from server
  const fetchClipboardHistory = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/clipboard/${encodeURIComponent(token)}`);
      
      if (response.ok) {
        const data = await response.json();
        setClipboardHistory(data.items || []);
        setLastSynced(new Date());
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch clipboard history');
      }
    } catch (error) {
      console.error('Error fetching clipboard history:', error);
      showToast(error instanceof Error ? error.message : 'Failed to fetch clipboard history', true);
    } finally {
      setIsLoading(false);
    }
  }, [token, showToast]);

  // Save content to server
  const saveToServer = useCallback(async () => {
    if (!token) {
      showToast('Invalid token', true);
      return;
    }
    
    if (!clipboardContent.trim()) {
      showToast('Please enter some content', true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/clipboard/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: clipboardContent.trim() })
      });

      if (response.ok) {
        await fetchClipboardHistory();
        setClipboardContent('');
        showToast('Content saved successfully');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save content', true);
    } finally {
      setIsSaving(false);
    }
  }, [clipboardContent, fetchClipboardHistory, showToast]);

  // Handle textarea key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlEnter = (e.ctrlKey || (isMac && e.metaKey)) && e.key === 'Enter';
    const isShiftEnter = e.shiftKey && e.key === 'Enter';
    
    if (isCtrlEnter || isShiftEnter) {
      e.preventDefault();
      saveToServer();
    }
  };

  // Handle textarea input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setClipboardContent(e.target.value);
  };

  // Clear all clipboard history
  const clearClipboardHistory = useCallback(async () => {
    if (!token) {
      showToast('Invalid token', true);
      return;
    }
    
    // Confirm before clearing
    if (!confirm('Are you sure you want to clear all clipboard history? This action cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(`/api/clipboard/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'clear' })
      });

      if (response.ok) {
        setClipboardHistory([]);
        showToast('Clipboard history cleared');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing clipboard history:', error);
      showToast(error instanceof Error ? error.message : 'Failed to clear clipboard history', true);
    } finally {
      setIsClearing(false);
    }
  }, [showToast]);

  // Copy content to clipboard
  const copyToClipboard = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => showToast('Copied to clipboard!'))
      .catch(() => showToast('Failed to copy to clipboard', true));
  }, [showToast]);

  // Get configuration from environment variables with defaults
  const POLLING_INTERVAL = process.env.NEXT_PUBLIC_POLLING_INTERVAL 
    ? parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL, 10) 
    : 5000; // Default to 5 seconds
  
  const MAX_HISTORY_ITEMS = process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS 
    ? parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS, 10) 
    : 50; // Default to 50 items

  // Initial load and setup polling
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      if (!isMounted) return;
      
      try {
        const isConnected = await checkConnection();
        if (isConnected) {
          await fetchClipboardHistory();
        }
      } catch (error) {
        console.error('Error during polling:', error);
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(poll, POLLING_INTERVAL);
        }
      }
    };

    // Initial fetch
    poll();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkConnection, fetchClipboardHistory]);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Invalid Token</h1>
          <p className="mb-6">The provided token is invalid or missing.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <ArrowLeft className="inline mr-2" size={16} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className={`p-4 rounded-md shadow-lg ${
              toast.isError 
                ? 'bg-red-100 border-l-4 border-red-500 text-red-700' 
                : 'bg-green-100 border-l-4 border-green-500 text-green-700'
            }`}
          >
            <p className="text-sm">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto lg:px-8 2xl:px-12 w-full">
        <header className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full max-w-[1800px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Clipboard Sync
                    <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {isOnline ? 'Connected' : 'Offline'}
                    </span>
                  </h1>
                  {lastSynced && (
                    <p className="mt-1 text-sm text-gray-500">
                      Last synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ArrowLeft size={14} className="mr-1.5" />
                    Back to home
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-blue-700">
                  Your clipboard token
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white rounded-md shadow-sm px-3 py-1.5 border border-gray-300">
                  <span className="font-mono text-sm text-gray-800 truncate max-w-[120px] sm:max-w-xs">
                    {token}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(token);
                      showToast('Token copied to clipboard!');
                    }}
                    className="ml-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Copy token"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="bg-white shadow-sm sm:shadow-md rounded-lg border border-slate-200 overflow-hidden w-full">
          <div className="p-3 sm:p-4">
            <div className="mb-4">
              <label htmlFor="clipboard-content" className="block text-sm font-medium text-gray-700 mb-1">
                New Clipboard Item
              </label>
              <textarea
                id="clipboard-content"
                ref={textareaRef}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type something to copy... (Ctrl/Cmd+Enter or Shift+Enter to save)"
                value={clipboardContent}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={saveToServer}
                  disabled={!clipboardContent.trim() || isSaving}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save to Clipboard'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 w-full">
          <div className="w-full px-2 py-2 sm:px-4 sm:py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearClipboardHistory();
                }}
                disabled={isClearing || clipboardHistory.length === 0}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 mr-4"
              >
                {isClearing ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All</span>
                  </>
                )}
              </button>
            </div>
            
            <h2 className="text-lg font-medium text-gray-900">Clipboard History</h2>
            
            <button
              onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
              className="text-gray-500 hover:text-gray-700"
              aria-label={isHistoryCollapsed ? 'Expand history' : 'Collapse history'}
            >
              {isHistoryCollapsed ? (
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {!isHistoryCollapsed && (
            <div className="px-3 py-2 sm:px-4 sm:py-3 bg-gradient-to-b from-white to-slate-50">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading clipboard history...</p>
                </div>
              ) : clipboardHistory.length > 0 ? (
                <div className="mt-2">
                  <ClipboardHistory 
                    items={clipboardHistory} 
                    onCopy={copyToClipboard}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No clipboard history yet. Start by adding some content above.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}