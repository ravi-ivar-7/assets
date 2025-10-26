import { NextRequest, NextResponse } from 'next/server';
import { getClipboardHistory, addToClipboard, clearClipboardHistory } from '../../../../lib/redis';

type Context = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(
  request: NextRequest, 
  context: Context
) {
  const { token } = await context.params;
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    const items = await getClipboardHistory(token);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching clipboard history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch clipboard history' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest, 
  context: Context
) {
  const { token } = await context.params;
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    );
  }

  try {
    const { content, action } = await request.json();
    
    if (action === 'clear') {
      await clearClipboardHistory(token);
      return NextResponse.json({ items: [] });
    }
    
    if (typeof content === 'string' && content.trim()) {
      await addToClipboard(token, content);
      const items = await getClipboardHistory(token);
      return NextResponse.json({ items });
    }
    
    return NextResponse.json(
      { error: 'Invalid content or action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating clipboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update clipboard' },
      { status: 500 }
    );
  }
}

// Ensure dynamic route handling
export const dynamic = 'force-dynamic';
