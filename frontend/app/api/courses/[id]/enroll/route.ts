import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// smol402 backend server URL
const SMOL402_SERVER = process.env.SMOL402_SERVER_URL || 'http://localhost:5402';

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

    // Lấy thông tin khóa học
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

    // Kiểm tra xem đã enroll chưa
    const { data: existingEnrollment } = await supabase
      .from('enrollment')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_wallet', walletAddress)
      .single();

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'Already enrolled',
        courseId,
      });
    }

    // Nếu có payment proof, verify với smol402 server
    if (paymentProof?.transactionHash || paymentProof?.blockHash) {
      try {
        // Gọi smol402 server để verify payment (support both transactionHash and blockHash)
        const verifyRes = await fetch(`${SMOL402_SERVER}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionHash: paymentProof.transactionHash,
            blockHash: paymentProof.blockHash,
            recipient: course.wallet_address,
            amount: Math.floor((course.cost || 0) * 1e10), // Convert to planck (10 decimals for PAS)
          }),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          
          if (verifyData.verified) {
            // Lưu enrollment vào database
            const { error: enrollError } = await supabase
              .from('enrollment')
              .insert({
                course_id: courseId,
                student_wallet: walletAddress,
                tx_hash: paymentProof.transactionHash || paymentProof.blockHash,
                amount_paid: course.cost,
              });

            if (enrollError) {
              console.error('Failed to save enrollment:', enrollError);
            }

            return NextResponse.json({
              success: true,
              message: 'Payment verified, enrolled successfully',
              courseId,
            });
          }
        }
      } catch (verifyError) {
        console.error('Payment verification failed:', verifyError);
      }
    }

    // Chưa có payment hoặc payment không hợp lệ -> trả về 402
    const tuitionPlanck = Math.floor((course.cost || 0) * 1e10); // 10 decimals for PAS on Paseo
    const recipientWallet = course.wallet_address || process.env.DEFAULT_RECIPIENT_WALLET;

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
