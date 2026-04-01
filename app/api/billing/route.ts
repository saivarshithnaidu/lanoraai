import { db } from '@/lib/db'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    // Fetch the most recent billing details for this user to auto-fill
    const { data: billing, error } = await db
      .from('billing_details')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({ billing })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Billing fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string
    const data = await request.json()

    // Validate essential fields
    const requiredFields = ['full_name', 'mobile_number', 'country', 'state', 'district', 'street_address']
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Field ${field} is required` }, { status: 400 })
      }
    }

    // Insert new billing record
    const { data: billing, error } = await db
      .from('billing_details')
      .insert({
        user_id: userId,
        full_name: data.full_name,
        mobile_number: data.mobile_number,
        country: data.country,
        state: data.state,
        district: data.district,
        street_address: data.street_address
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ billingId: billing.id })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Billing save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

