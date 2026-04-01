import { db } from '@/lib/db'
import { validateApiKey } from '@/lib/api-keys'
import { getNextApiKey, incrementKeyUsage, logToDB, logUsage, markKeyAsFailed, logChat, logError } from '@/lib/api-pool'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: Request) {
  try {
    // 1. Validate API Key from Authorization Header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const apiKey = authHeader.split(' ')[1]
    const userId = await validateApiKey(apiKey)

    if (!userId) {
      return NextResponse.json({ error: 'Invalid or inactive API Key' }, { status: 401 })
    }

    // 2. Fetch User Profile and check credits
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (profile.credits <= 0 && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    // 3. Parse Request Body
    const body = await req.json()
    const { messages, model: requestedModel, stream = false } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const userMessage = messages[messages.length - 1].content

    // 4. AI Engine Logic (Reuse from main chat)
    const systemPrompt = `You are Lanora, a caring human companion. Tone: Friendly, warm, and authentic. 
    CRITICAL: Reply in 1-3 short sentences. Match the user's language.`

    let aiResponse = null
    let attempts = 0
    let lastError = null
    const MAX_ATTEMPTS = 2

    while (attempts < MAX_ATTEMPTS) {
      const providerKey = await getNextApiKey()

      if (!providerKey) {
        lastError = 'No active AI providers'
        break
      }

      try {
        const client = new OpenAI({
          apiKey: providerKey.api_key,
          baseURL: providerKey.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : (providerKey.provider === 'openai' ? undefined : 'https://api.groq.com/openai/v1'),
        })

        const model = providerKey.provider === 'openrouter' ? 'openai/gpt-4o-mini' : (providerKey.provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini')

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
        })

        aiResponse = completion.choices[0].message.content
        const tokens = completion.usage?.total_tokens || 0

        // Success logging
        await incrementKeyUsage(providerKey.id)
        await logUsage(userId, tokens, providerKey.provider, model)
        await logToDB(userId, 'api', 'API Request Successful', { model })
        break

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        attempts++
        lastError = errorMessage
        // Check for OpenAI API error structure
        if (typeof error === 'object' && error !== null && 'status' in error) {
            const status = (error as { status: number }).status
            if (status === 401 || status === 429) {
                await markKeyAsFailed(providerKey.id)
            }
        }
      }
    }

    if (!aiResponse) {
      return NextResponse.json({ error: lastError || 'AI Service unavailable' }, { status: 503 })
    }

    // 5. Deduct Credit
    if (profile.role !== 'admin') {
      await db
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', userId)
    }

    // 6. Log Chat
    await logChat(userId, userMessage, aiResponse)

    // 7. UniversalAI Compatibility (OpenAI Format)
    return NextResponse.json({
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: requestedModel || 'lanora-ai-v1',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: aiResponse,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 0, // Simplified
        completion_tokens: 0,
        total_tokens: 0,
      },
      credits_remaining: profile.role === 'admin' ? 99999 : profile.credits - 1
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
console.error('API V1 Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}




