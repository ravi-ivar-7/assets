import { NextResponse } from 'next/server';
import { getClipboardHistory, addToClipboard, clearClipboardHistory } from '../../../lib/redis';

export async function GET() {
  try {
    const items = await getClipboardHistory();
    // Return items in the format expected by the frontend
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching clipboard history:', error);
    // Return empty items array on error in the expected format
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { content, action } = await request.json();
    
    if (action === 'clear') {
      await clearClipboardHistory();
      return NextResponse.json({ items: [] });
    }
    
    if (typeof content === 'string' && content.trim()) {
      await addToClipboard(content);
      const items = await getClipboardHistory();
      return NextResponse.json({ items });
    }
    
    return NextResponse.json(
      { error: 'Invalid content or action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating clipboard:', error);
    return NextResponse.json(
      { error: 'Failed to update clipboard' },
      { status: 500 }
    );
  }
}

// Ensure dynamic route handling
export const dynamic = 'force-dynamic';
