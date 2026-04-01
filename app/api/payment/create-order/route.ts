import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string
    const { amount, credits, billingId } = await req.json()

    // Razorpay amount is in paise (₹1 = 100 paise)
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      notes: {
        userId,
        credits,
        billingId
      },
    })

    // Store in transactions table as 'pending'
    await db.from('transactions').insert({
      user_id: userId,
      order_id: order.id,
      status: 'pending',
      amount: amount,
      credits_added: credits,
      billing_id: billingId
    })

    return NextResponse.json({ orderId: order.id })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('Payment order creation error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}



