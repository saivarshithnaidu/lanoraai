import { createClient } from '@/lib/supabase/server'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, credits } = await req.json()

    // Razorpay amount is in paise (₹1 = 100 paise)
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      notes: {
        userId: user.id,
        credits: credits,
      },
    })

    // Store in transactions table as 'pending'
    await supabase.from('transactions').insert({
      user_id: user.id,
      order_id: order.id,
      status: 'pending',
      amount: amount,
      credits_added: credits,
    })

    return NextResponse.json({ orderId: order.id })
  } catch (error: any) {
    console.error('Payment order creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
