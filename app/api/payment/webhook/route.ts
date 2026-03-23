import { db } from '@/lib/db'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
    }

    // 1. Verify Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('[Webhook Error]: Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)

    // 2. Handle relevant events
    if (event.event === 'payment.captured') {
      const paymentPayload = event.payload.payment.entity
      const orderId = paymentPayload.order_id

      // Find the transaction record
      const { data: transaction } = await db
        .from('transactions')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (transaction && transaction.status !== 'success') {
        const userId = transaction.user_id

        // Update transaction status
        await db
          .from('transactions')
          .update({
            status: 'success',
            payment_id: paymentPayload.id
          })
          .eq('order_id', orderId)

        // Give credits to user
        const { data: profile } = await db
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        const newCredits = (profile?.credits || 0) + transaction.credits_added
        await db
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', userId)

        console.log(`[Webhook]: Successfully processed payment for user ${userId}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('[Webhook Error]:', error.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
