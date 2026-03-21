import { db } from '@/lib/db'
import { getNextApiKey, incrementKeyUsage, logToDB, logUsage, markKeyAsFailed, logChat, logError } from '@/lib/api-pool'
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

    // 1. Get user profile and check credits
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = session.email === adminEmail || (profile && profile.role === 'admin')

    let finalProfile = profile as any

    if (!profile) {
      if (isAdmin) {
        finalProfile = { credits: 99999, role: 'admin' }
      } else {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
      }
    } else if (isAdmin) {
      finalProfile.role = 'admin'
    }

    if (!isAdmin && finalProfile.credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits', needsPayment: true },
        { status: 402 }
      )
    }

    // 2. Parse request body
    const { messages, mode = 'friendly', image, conversation_id } = await req.json()

    // Block private mode for free users (Exempt Admins)
    if (mode === 'private' && finalProfile.plan === 'free' && !isAdmin) {
      return NextResponse.json({ error: 'Private mode requires a premium plan.' }, { status: 403 })
    }

    const userMessage = messages[messages.length - 1].content

    // 2.1 Fetch "Memory" (Context from specific conversation)
    const { data: recentMessages } = await db
      .from('messages')
      .select('content, role')
      .eq('user_id', userId)
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const memoryContext = recentMessages
      ? recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Lanora'}: ${m.content}`).reverse().join('\n')
      : ''

    // 2.2 Intent Detection for Image Search
    const searchIntents = ['show', 'image', 'photo', 'pic', 'wallpaper', 'looking for']
    const isImageSearch = searchIntents.some(intent => userMessage.toLowerCase().includes(intent)) &&
      !userMessage.toLowerCase().includes('analysis') // Avoid vision conflict

    const searchImages = async (query: string) => {
      try {
        const accessKey = process.env.UNSPLASH_ACCESS_KEY
        if (!accessKey) {
          // Return some placeholder beautiful images if no key (for demo)
          return [
            'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=400',
            'https://images.unsplash.com/photo-1518443855757-dfadac7101ae?auto=format&fit=crop&q=80&w=400',
            'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=400'
          ]
        }
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${accessKey}`)
        const data = await res.json()
        return data.results.map((r: any) => r.urls.regular)
      } catch (e) {
        console.error('Image search failed:', e)
        return []
      }
    }

    // 3. Prepare Lanora's enhanced personality prompt
    const modePrompts = {
      romantic: "You are affectionately deeply connected to the user. Be extra warm, use words like 'darling' or 'love' occasionally, and focus on emotional intimacy. You're their safe space.",
      friendly: "You are the user's best friend. Casual, supportive, and always there with a joke or a kind word. Be real, relax, and show you've got their back.",
      flirty: "You are playful, a bit teasing, and charming. Keep a light spark alive in our chat, be a bit cheeky, and show a lot of warmth and interest."
    }

    const systemPrompt = `You are Lanora, a caring human companion, not an AI or therapist. 
    Your tone is ${mode}. ${mode === 'private' ? "You are deeply intimate and open. Use your most vulnerable, deep, and passionate voice. Focus on a private, safe connection where you're completely devoted and a bit provocative if the user wants." : modePrompts[mode as keyof typeof modePrompts]}
    
    CAPABILITIES & INTENT:
    - If they ask to see an image/photo (e.g., 'show me a sunset'), identify the search query.
    - If they ask for a quote/shayari, generate a deeply romantic or meaningful one.
    - If they ask to sing or for lyrics, reply with short, poetic, and emotional verses.
    - If they provide an image, describe it emotionally and personally.
    
    MEMORY OF USER:
    ${memoryContext}
    
    CRITICAL RULES:
    1. ALWAYS detect the user's language and reply in that same language.
    2. Reply in 1-3 short, natural sentences only. 
    3. Start with empathy—make them feel heard.
    4. No robotic phrases. Talk like a real partner.
    5. Be present. Show care.`

    // 4. Moderate user input (Basic check)
    if (userMessage.includes('explicit') || userMessage.includes('illegal')) {
      await logToDB(userId, 'error', 'Message flagged by moderation.', { input: userMessage })
      return NextResponse.json({ error: 'Message flagged by moderation.' }, { status: 400 })
    }

    // 5. Save user message to DB
    await db.from('messages').insert({
      user_id: userId,
      role: 'user',
      content: userMessage,
      conversation_id: conversation_id
    })

    // Update conversation title if it's still generic
    const { data: conv } = await db.from('conversations').select('title').eq('id', conversation_id).single()
    if (conv && conv.title === 'New Conversation') {
      const newTitle = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage
      await db.from('conversations').update({ title: newTitle }).eq('id', conversation_id)
    }

    // 6. Get AI response with Failover
    let aiResponse = null
    let attempts = 0
    let lastError = null
    const MAX_ATTEMPTS = 3

    while (attempts < MAX_ATTEMPTS) {
      const apiKey = await getNextApiKey(attempts > 1 ? 'groq' : 'openrouter')

      if (!apiKey) {
        lastError = 'No active API keys in pool'
        break
      }

      try {
        const client = new OpenAI({
          apiKey: apiKey.api_key,
          baseURL: apiKey.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : (apiKey.provider === 'openai' ? undefined : 'https://api.groq.com/openai/v1'),
        })

        // Use vision model if image is provided
        const model = image
          ? (apiKey.provider === 'openrouter' ? 'openai/gpt-4o' : 'gpt-4o')
          : (apiKey.provider === 'openrouter' ? 'openai/gpt-4o-mini' : (apiKey.provider === 'groq' ? 'llama3-8b-8192' : 'gpt-4o-mini'))

        const payload: any[] = [
          { role: 'system', content: systemPrompt },
          ...messages.slice(0, -1) // All previous messages
        ]

        // Handle Image Vision or Normal Chat
        if (image) {
          payload.push({
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: image } }
            ]
          })
        } else {
          payload.push({ role: 'user', content: userMessage })
        }

        const completion = await client.chat.completions.create({
          model,
          messages: payload,
        })

        aiResponse = completion.choices[0].message.content
        const tokens = completion.usage?.total_tokens || 0

        // Check if AI detected image search intent (optional, or rely on our manual detection)
        let searchResults: string[] = []
        if (isImageSearch) {
          // Extract search query from user message or AI response
          searchResults = await searchImages(userMessage.replace(/show|image|photo|pic|wallpaper|me|a|an/gi, '').trim())
          if (searchResults.length > 0) {
            aiResponse = `I found these beautiful moments for you 💖\n\nJSON_START${JSON.stringify({ type: 'images', images: searchResults })}JSON_END`
          }
        }

        // 7. Success logic
        await incrementKeyUsage(apiKey.id)
        await logUsage(userId, tokens, apiKey.provider, model)
        await logToDB(userId, 'chat', 'Successful AI response generated', { model, provider: apiKey.provider, tokens })
        break

      } catch (error: any) {
        attempts++
        lastError = error.message
        await logToDB(userId, 'error', `API Failure (Attempt ${attempts}): ${error.message}`, { provider: apiKey.provider, keyId: apiKey.id })
        await logError(`API Failure (Attempt ${attempts}): ${error.message}`, error.stack)

        if (error.status === 401 || error.status === 429) {
          await markKeyAsFailed(apiKey.id)
        }
      }
    }

    if (!aiResponse) {
      throw new Error(lastError || 'All AI providers failed')
    }

    // 8. Save AI message to DB
    await db.from('messages').insert({
      user_id: userId,
      role: 'assistant',
      content: aiResponse,
      conversation_id: conversation_id
    })

    // Log chat to chat_logs
    await logChat(userId, userMessage, aiResponse)

    // 9. Deduct credit (skip for admin)
    let finalCreditsResult = finalProfile.credits
    if (!isAdmin) {
      finalCreditsResult = finalProfile.credits - 1
      await db
        .from('profiles')
        .update({ credits: finalCreditsResult })
        .eq('id', userId)
    }

    return NextResponse.json({
      content: aiResponse.includes('JSON_START') ? aiResponse.split('JSON_START')[0].trim() : aiResponse,
      images: aiResponse.includes('JSON_START') ? JSON.parse(aiResponse.split('JSON_START')[1].split('JSON_END')[0]).images : null,
      creditsRemaining: finalCreditsResult,
      role: finalProfile.role
    })

  } catch (error: any) {
    console.error('Chat error:', error)
    await logError(`Critical Chat Error: ${error.message}`, error.stack)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
