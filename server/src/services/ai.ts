import OpenAI from 'openai'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'

const openai = env.openai.apiKey ? new OpenAI({ apiKey: env.openai.apiKey }) : null

const REVIEW_PROMPT = `You are an expert trading analyst reviewing a trade journal entry. Analyze the trade and provide:
1. A score from 1-100
2. A brief overall review
3. Key strengths (as an array of strings)
4. Areas for improvement (as an array of strings)
5. Specific suggestions for future trades (as an array of strings)

Format your response as JSON with keys: score, review, strengths, weaknesses, suggestions`

export async function generateReview(tradeId: string, userId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
    include: { images: true, tags: { include: { tag: true } } },
  })
  if (!trade) throw new Error('Trade not found')

  if (!openai) {
    const review = await prisma.aIReview.create({
      data: {
        tradeId,
        userId,
        score: 75,
        review: 'AI review is unavailable. Please configure an OpenAI API key.',
        suggestions: [],
        strengths: ['Trade was logged properly'],
        weaknesses: ['Enable AI features by setting OPENAI_API_KEY'],
        model: 'unavailable',
        version: 1,
      },
    })
    return review
  }

  const tradeData = {
    instrument: trade.instrument,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    quantity: trade.quantity,
    fees: trade.fees,
    session: trade.session,
    marketBias: trade.marketBias,
    result: trade.result,
    riskReward: trade.riskReward,
    notes: trade.notes,
    tags: trade.tags.map((t) => t.tag.name),
  }

  const startTime = Date.now()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: REVIEW_PROMPT },
      { role: 'user', content: JSON.stringify(tradeData) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const latency = Date.now() - startTime
  const content = completion.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(content) as {
    score: number
    review: string
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
  }

  const review = await prisma.aIReview.create({
    data: {
      tradeId,
      userId,
      score: Math.min(100, Math.max(0, parsed.score)),
      review: parsed.review?.slice(0, 2000) || '',
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      suggestions: parsed.suggestions || [],
      model: completion.model,
      promptVersion: '1.0',
      tokenUsage: completion.usage?.total_tokens || 0,
      latency,
      version: 1,
    },
  })

  return review
}

export async function getReviewForTrade(tradeId: string, userId: string) {
  return prisma.aIReview.findFirst({
    where: { tradeId, userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createChat(userId: string, title?: string) {
  return prisma.aIChat.create({
    data: { userId, title },
    include: { messages: true },
  })
}

export async function listChats(userId: string) {
  return prisma.aIChat.findMany({
    where: { userId, isArchived: false },
    include: { _count: { select: { messages: true } } },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
  })
}

export async function getChat(chatId: string, userId: string) {
  const chat = await prisma.aIChat.findFirst({
    where: { id: chatId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!chat) throw new Error('Chat not found')
  return chat
}

export async function sendMessage(chatId: string, userId: string, content: string) {
  const chat = await prisma.aIChat.findFirst({
    where: { id: chatId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!chat) throw new Error('Chat not found')

  await prisma.aIMessage.create({
    data: { chatId, role: 'user', content },
  })

  if (!openai) {
    const reply = await prisma.aIMessage.create({
      data: {
        chatId,
        role: 'assistant',
        content: 'AI chat is unavailable. Please configure an OPENAI_API_KEY in your environment variables.',
      },
    })
    await prisma.aIChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })

    if (!chat.title) {
      await prisma.aIChat.update({
        where: { id: chatId },
        data: { title: content.slice(0, 100) },
      })
    }

    return { userMessage: null, assistantMessage: reply }
  }

  const messages = [
    { role: 'system' as const, content: 'You are a knowledgeable trading coach. Help the user improve their trading skills by analyzing their questions and providing actionable advice. Be concise and practical.' },
    ...chat.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content },
  ]

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  })

  const replyContent = completion.choices[0]?.message?.content || 'No response generated.'

  const assistantMessage = await prisma.aIMessage.create({
    data: { chatId, role: 'assistant', content: replyContent },
  })

  await prisma.aIChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } })

  if (!chat.title) {
    await prisma.aIChat.update({
      where: { id: chatId },
      data: { title: content.slice(0, 100) },
    })
  }

  return { assistantMessage }
}

export async function deleteChat(chatId: string, userId: string) {
  const chat = await prisma.aIChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new Error('Chat not found')

  await prisma.aIMessage.deleteMany({ where: { chatId } })
  await prisma.aIChat.delete({ where: { id: chatId } })
}

export async function togglePinChat(chatId: string, userId: string) {
  const chat = await prisma.aIChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new Error('Chat not found')

  return prisma.aIChat.update({
    where: { id: chatId },
    data: { isPinned: !chat.isPinned },
  })
}

export async function archiveChat(chatId: string, userId: string) {
  const chat = await prisma.aIChat.findFirst({ where: { id: chatId, userId } })
  if (!chat) throw new Error('Chat not found')

  return prisma.aIChat.update({
    where: { id: chatId },
    data: { isArchived: true },
  })
}
