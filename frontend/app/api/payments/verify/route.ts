import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionHash, courseId } = body;

    return NextResponse.json({ 
      success: true,
      verified: false
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
