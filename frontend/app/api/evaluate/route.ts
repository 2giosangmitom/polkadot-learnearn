import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { milestone, answer } = body;

    if (!milestone || !answer) {
      return NextResponse.json(
        { error: 'Milestone and answer are required' },
        { status: 400 }
      );
    }

    // Call the Python backend service
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5402';
    const response = await fetch(`${pythonBackendUrl}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ milestone, answer }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to evaluate answer' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Evaluation proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during evaluation' },
      { status: 500 }
    );
  }
}
