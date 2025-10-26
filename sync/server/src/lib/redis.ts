import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const CLIPBOARD_LIST_KEY = 'clipboard_history';
// Get max items from environment variable or use default
const MAX_ITEMS = process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS 
  ? parseInt(process.env.NEXT_PUBLIC_MAX_HISTORY_ITEMS, 10)
  : 50; // Default to 50 items

interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
}

// Get all clipboard items, most recent first
export async function getClipboardHistory(): Promise<ClipboardItem[]> {
  try {
    const items = await redis.lrange(CLIPBOARD_LIST_KEY, 0, MAX_ITEMS - 1);
    
    if (!Array.isArray(items)) {
      console.error('Unexpected Redis response format - not an array');
      return [];
    }

    const parsedItems = items.map((item, index) => {
      try {
        // If item is already in the correct format
        if (item && typeof item === 'object' && 'content' in item) {
          return item as unknown as ClipboardItem;
        }
        
        // If item is a string, try to parse it
        if (typeof item === 'string') {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object' && 'content' in parsed) {
            return parsed as ClipboardItem;
          }
        }
        
        console.warn('Skipping invalid clipboard item at index', index, ':', item);
        return null;
      } catch (e) {
        console.error('Error processing clipboard item at index', index, ':', e);
        return null;
      }
    }).filter(Boolean) as ClipboardItem[];

    return parsedItems;
  } catch (error) {
    console.error('Error getting clipboard history:', error);
    return [];
  }
}

// Add new clipboard item
export async function addToClipboard(content: string): Promise<void> {
  try {
    const newItem: ClipboardItem = {
      id: Date.now().toString(),
      content: content,
      timestamp: Date.now(),
    };

    // Ensure we're storing a properly stringified JSON object
    const itemString = JSON.stringify(newItem);
    
    // Add to the beginning of the list
    await redis.lpush(CLIPBOARD_LIST_KEY, itemString);
    
    // Trim the list to keep only the latest items
    await redis.ltrim(CLIPBOARD_LIST_KEY, 0, MAX_ITEMS - 1);
  } catch (error) {
    console.error('Error adding to clipboard:', error);
    throw error; // Re-throw to be handled by the API route
  }
}

// Clear all clipboard history
export async function clearClipboardHistory(): Promise<void> {
  await redis.del(CLIPBOARD_LIST_KEY);
}
