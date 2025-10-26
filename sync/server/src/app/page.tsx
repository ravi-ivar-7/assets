'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ClipboardItem } from '@/types/clipboard';
import { Copy, Trash2 } from 'lucide-react';

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

export default function Home() {
  const [clipboardContent, setClipboardContent] = useState('');
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardItem[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  // Check connection status
  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/clipboard', { method: 'HEAD' });
      const isConnected = response.ok;
      setIsOnline(isConnected);
      return isConnected;
    } catch (error) {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Fetch clipboard history from server
  const fetchClipboardHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/clipboard');
      if (response.ok) {
        const data = await response.json();
        setClipboardHistory(data.items || []);
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error('Error fetching clipboard history:', error);
      showToast('Failed to fetch clipboard history', true);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Save content to server
  const saveToServer = useCallback(async () => {
    if (!clipboardContent.trim()) {
      showToast('Please enter some content', true);
      return;
    }

    try {
      const response = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error('Failed to save content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      showToast('Failed to save content', true);
    }
  }, [clipboardContent, fetchClipboardHistory, showToast]);

  // Handle textarea key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
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
    try {
      const response = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' })
      });

      if (response.ok) {
        setClipboardHistory([]);
        showToast('Clipboard history cleared');
      } else {
        throw new Error('Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing clipboard history:', error);
      showToast('Failed to clear clipboard history', true);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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

      <div className="max-w-4xl mx-auto py-4 px-3 sm:px-4 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Debug info - can be removed in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mb-2">
            Polling: {POLLING_INTERVAL}ms | Max Items: {MAX_HISTORY_ITEMS}
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Clipboard Sync</h1>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {isOnline ? 'Connected' : 'Offline'}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-4 border border-slate-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Content</h2>
          <div className="space-y-4">
            <div>
              <textarea
                ref={textareaRef}
                id="content"
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                placeholder="Type something to copy... (Shift+Enter to save)"
                value={clipboardContent}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                rows={5}
                style={{ minHeight: '100px' }}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveToServer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!clipboardContent.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg border border-slate-200 overflow-hidden">
          <div className="w-full px-4 py-3 flex items-center bg-slate-50 border-b border-slate-200">
            {/* Clear All on the left */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearClipboardHistory();
              }}
              className="text-sm text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 mr-4"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </button>
            
            {/* Title in the center */}
            <h2 className="text-lg font-medium text-gray-900 mx-auto">Clipboard History</h2>
            
            {/* Last synced on the right */}
            <div className="flex items-center">
              {lastSynced && (
                <span className="text-sm text-gray-500 mr-4">
                  Last synced: {lastSynced.toLocaleTimeString()}
                </span>
              )}
            </div>
            {isHistoryCollapsed ? (
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                onClick={() => setIsHistoryCollapsed(false)}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg 
                className="h-5 w-5 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                onClick={() => setIsHistoryCollapsed(true)}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </div>
          
          {!isHistoryCollapsed && (
            <div className="px-4 py-3 bg-gradient-to-b from-white to-slate-50">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading clipboard history...</p>
                </div>
              ) : (
                <div className="mt-2">
                  <ClipboardHistory 
                    items={clipboardHistory} 
                    onCopy={copyToClipboard}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}