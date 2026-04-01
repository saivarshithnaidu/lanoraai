import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const session = await getSession()
        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createAdminClient()
        const { error } = await supabase
            .from('profiles')
            .update({ is_adult_verified: true })
            .eq('id', session.userId)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

