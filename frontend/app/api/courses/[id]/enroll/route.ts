import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CoursePurchaseStatus } from '@/types/course';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// smol402 backend server URL
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:5402';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  try {
    const body = await request.json();
    const { walletAddress, paymentProof } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('course')
      .select('id, title, description, cost, wallet_address')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get or create user from wallet address
    let { data: user, error: userError } = await supabase
      .from('user')
      .select('id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to get user', details: userError.message },
        { status: 500 }
      );
    }

    // If user doesn't exist, create them as a student (role = 1)
    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('user')
        .insert({ wallet_address: walletAddress, role: 1 })
        .select('id')
        .single();

      if (createError) {
        return NextResponse.json(
          { error: 'Failed to create user', details: createError.message },
          { status: 500 }
        );
      }
      user = newUser;
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('course_purchase')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', CoursePurchaseStatus.COMPLETED)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        courseId,
      });
    }

    // If payment proof provided, verify it
    if (paymentProof?.transactionHash || paymentProof?.blockHash) {
      try {
        const verifyRes = await fetch(`${PYTHON_BACKEND_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionHash: paymentProof.transactionHash,
            blockHash: paymentProof.blockHash,
            recipient: course.wallet_address,
            amount: Math.floor((course.cost || 0) * 1e10), // Convert to planck (10 decimals for PAS)
          }),
        });

        if (!verifyRes.ok) {
          return NextResponse.json(
            { 
              error: 'Payment verification failed', 
              message: 'Unable to verify payment with backend server',
              details: 'Please try again or contact support'
            },
            { status: 400 }
          );
        }

        const verifyData = await verifyRes.json();
        
        if (!verifyData.verified) {
          return NextResponse.json(
            { 
              error: 'Payment not verified', 
              message: 'Payment could not be verified on blockchain',
              details: verifyData.error || 'Transaction not found or invalid amount'
            },
            { status: 400 }
          );
        }

        // Payment verified! Create purchase record
        const { error: purchaseError } = await supabase
          .from('course_purchase')
          .insert({
            user_id: user.id,
            course_id: courseId,
            price_paid: course.cost,
            status: CoursePurchaseStatus.COMPLETED,
          });

        if (purchaseError) {
          console.error('Failed to save purchase:', purchaseError);
          return NextResponse.json(
            { 
              error: 'Enrollment failed', 
              message: 'Payment verified but failed to save purchase',
              details: purchaseError.message
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Payment verified, enrolled successfully',
          courseId,
        });

      } catch (verifyError) {
        console.error('Payment verification error:', verifyError);
        return NextResponse.json(
          { 
            error: 'Verification error', 
            message: 'An error occurred while verifying payment',
            details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // No payment proof provided - return 402 Payment Required
    const tuitionPlanck = Math.floor((course.cost || 0) * 1e10); // 10 decimals for PAS on Paseo
    const recipientWallet = course.wallet_address || process.env.DEFAULT_RECIPIENT_WALLET;
    // const recipientWallet = "1RPK4brFegTGGKHFpjZ7jxZ3jiwCMyihhMFQomyzHAJfcUV";

    return new NextResponse(
      JSON.stringify({
        error: 'Payment Required',
        message: 'Please complete payment to enroll in this course',
        payment: {
          network: 'paseo',
          recipient: recipientWallet,
          amount: tuitionPlanck,
          amountHuman: course.cost,
          currency: 'PAS',
          courseId: courseId,
          courseTitle: course.title,
          instructions: 'Sign and submit transfer to recipient, then retry with paymentProof.transactionHash',
        },
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Required': `recipient=${recipientWallet};amount=${tuitionPlanck};currency=PAS`,
          'X-Payment-Network': 'paseo',
          'X-Payment-Recipient': recipientWallet || '',
          'X-Payment-Amount': tuitionPlanck.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
