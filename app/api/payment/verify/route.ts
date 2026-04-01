import { db } from '@/lib/db'
import { logToDB } from '@/lib/api-pool'
import { getSession } from '@/lib/jwt'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string
    const { orderId, paymentId, signature } = await req.json()

    // 1. Verify Razorpay signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    hmac.update(orderId + '|' + paymentId)
    const generatedSignature = hmac.digest('hex')

    if (generatedSignature !== signature) {
      await logToDB(userId, 'error', 'Payment verification failed: invalid signature', { orderId, paymentId })
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // 2. Find and update the transaction in DB
    const { data: transaction, error: fetchError } = await db
      .from('transactions')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ error: 'Transaction record not found' }, { status: 404 })
    }

    if (transaction.status === 'success') {
      return NextResponse.json({ message: 'Payment already processed' })
    }

    // 3. Update transaction status
    await db
      .from('transactions')
      .update({
        status: 'success',
        payment_id: paymentId,
      })
      .eq('order_id', orderId)

    // 4. Update user profile credits
    const { data: profile } = await db
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    const newCredits = (profile?.credits || 0) + transaction.credits_added
    await db
      .from('profiles')
      .update({
        credits: newCredits,
      })
      .eq('id', userId)

    // 5. Log success
    await logToDB(userId, 'payment', `Successful payment of ₹${transaction.amount}`, { 
        orderId, 
        paymentId, 
        creditsAdded: transaction.credits_added,
        totalCredits: newCredits
    })

    return NextResponse.json({ success: true, newCredits })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Payment verification error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



