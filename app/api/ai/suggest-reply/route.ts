import { db } from '@/lib/db'
import { getNextApiKey, incrementKeyUsage, logToDB, logUsage } from '@/lib/api-pool'
import { getSession } from '@/lib/jwt'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    const session = await getSession()

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    // 1. Check credits (AI assist costs 1 credit)
    const { data: profile } = await db
      .from('profiles')
      .select('credits, role')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const isAdmin = profile?.role === 'admin'
    if (!isAdmin && (profile?.credits || 0) <= 0) {
      return NextResponse.json({ error: 'Insufficient credits', needsPayment: true }, { status: 402 })
    }

    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    // 2. Get API Key
    const apiKey = await getNextApiKey('openrouter') // Prefer OpenRouter for variety
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
    }

    const client = new OpenAI({
      apiKey: apiKey.api_key,
      baseURL: apiKey.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : (apiKey.provider === 'openai' ? undefined : 'https://api.groq.com/openai/v1'),
    })

    const systemPrompt = `You are a conversation assistant for a social app. 
    Analyze the recent messages and suggest 3 short, natural-sounding replies to keep the conversation going.
    Format your response as a JSON array of 3 strings:
    [
      "Option 1: Friendly/Casual tone",
      "Option 2: Romantic/Sweet tone",
      "Option 3: Flirty/Playful tone"
    ]
    IMPORTANT: Return ONLY the raw JSON array. Keep replies human-like and relevant to the context. 
    NO robotic language. Use 1-2 short sentences max per suggestion.`

    const completion = await client.chat.completions.create({
      model: apiKey.provider === 'openrouter' ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-5) // Send last 5 messages for context
      ],
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0].message.content
    let suggestions = []
    try {
        const parsed = JSON.parse(content || '[]')
        // Handle if it's wrapped in an object or just an array
        suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || Object.values(parsed)[0])
    } catch (e) {
        // Fallback for non-json
        suggestions = (content || '').split('\n').filter(s => s.trim().length > 0).slice(0, 3)
    }

    // 3. Post-processing
    if (!isAdmin) {
      await db.from('profiles').update({ credits: profile.credits - 1 }).eq('id', userId)
      await incrementKeyUsage(apiKey.id)
      await logUsage(userId, completion.usage?.total_tokens || 0, apiKey.provider, 'suggest-reply')
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) })

  } catch (error: any) {
    console.error('AI suggest error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
