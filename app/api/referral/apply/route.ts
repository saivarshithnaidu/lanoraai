import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { referralCode } = await req.json()
        if (!referralCode) {
            return NextResponse.json({ error: 'Referral code required' }, { status: 400 })
        }

        const supabase = await createAdminClient()

        // Use the RPC function we defined to safely apply reward
        const { data: success, error } = await supabase.rpc('apply_referral_reward', {
            p_referral_code: referralCode,
            p_referred_user_id: session.userId
        })

        if (error) {
            console.error('Referral apply error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!success) {
            return NextResponse.json({ error: 'Invalid or already used referral code' }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: 'Referral applied! +10 Credits received.' })
    } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

