export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const reportId = searchParams.get('reportId');
    const status = searchParams.get('status');

    if (!reportId || !status) {
      return new NextResponse(
        buildHtmlPage('Missing Parameters', 'Please provide both reportId and status.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (status !== 'sold' && status !== 'active') {
      return new NextResponse(
        buildHtmlPage('Invalid Status', 'Status must be either "sold" or "active".'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const supabase = createServiceClient();

    const updateData: Record<string, string> = {
      sold_status: status,
    };

    if (status === 'sold') {
      updateData.sold_date = new Date().toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId);

    if (error) {
      console.error('Failed to update sold status:', error);
      return new NextResponse(
        buildHtmlPage('Update Failed', 'We could not update your status. Please try again later.'),
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new NextResponse(
      buildHtmlPage(
        'Status Updated',
        'Thank you! We\'ve updated your status.'
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Sold status update error:', error);
    return new NextResponse(
      buildHtmlPage('Error', 'An unexpected error occurred. Please try again later.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ListAI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #1e293b;
    }
    .container {
      text-align: center;
      padding: 3rem 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 480px;
      width: 90%;
    }
    .logo {
      font-size: 1.75rem;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 1.5rem;
    }
    .logo span { color: #1e293b; }
    h1 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }
    p {
      color: #64748b;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">List<span>AI</span></div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
