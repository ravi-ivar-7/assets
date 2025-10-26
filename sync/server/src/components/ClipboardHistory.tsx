'use client';

import { useState } from 'react';
import type { ClipboardItem } from "@/types/clipboard";
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';

interface ClipboardItemProps {
  item: ClipboardItem;
  onCopy: (content: string) => void;
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const ClipboardItem = ({ item, onCopy }: ClipboardItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentPreview = item.content.length > 100 
    ? `${item.content.substring(0, 100)}...` 
    : item.content;
    
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 border border-slate-100 hover:border-teal-200 group">
      <div 
        className="p-3 cursor-pointer flex justify-between items-start hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-teal-500 group-hover:text-teal-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-teal-500 group-hover:text-teal-600" />
            )}
            <div className="px-3 py-1 text-xs font-medium text-teal-700 bg-teal-100/70 rounded-full">
              {formatDate(item.timestamp)}
            </div>
          </div>
          {!isExpanded && (
            <p className="mt-1 text-sm text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-slate-900">
              {contentPreview}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(item.content);
            }}
            className="p-1.5 rounded-full text-slate-400 hover:bg-teal-100 hover:text-teal-600 transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 -mt-2">
          <div className="bg-gray-50 p-3 rounded-md">
            <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 font-sans">
              {item.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

interface ClipboardHistoryProps {
  items: ClipboardItem[];
  onCopy: (content: string) => void;
}

export default function ClipboardHistory({ items, onCopy }: ClipboardHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No clipboard history yet. Copy something to get started!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {items.map((item) => (
          <ClipboardItem 
            key={item.id} 
            item={item} 
            onCopy={onCopy} 
          />
        ))}
      </div>
    </div>
  );
}
