import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function listPropFirms(req: Request, res: Response) {
  try {
    const userId = req.user?.userId
    const firms = await prisma.propFirm.findMany({
      where: {
        isActive: true,
        OR: [
          { createdByUserId: null },
          ...(userId ? [{ createdByUserId: userId }] : []),
        ],
      },
      orderBy: [{ isFeatured: 'desc' }, { rating: 'desc' }],
    })
    return sendSuccess(res, firms)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list prop firms', 400)
  }
}

export async function getPropFirm(req: Request, res: Response) {
  try {
    const firm = await prisma.propFirm.findUnique({ where: { slug: req.params.slug } })
    if (!firm || !firm.isActive) {
      return sendError(res, 'Prop firm not found', 404)
    }
    return sendSuccess(res, firm)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get prop firm', 400)
  }
}

export async function createCustomPropFirm(req: Request, res: Response) {
  try {
    const userId = req.user!.userId
    const name = String(req.body?.name || '').trim()
    const market = String(req.body?.market || '').toUpperCase() === 'FOREX' ? 'FOREX' : 'FUTURES'
    const websiteUrl = String(req.body?.websiteUrl || '').trim()

    if (!name) return sendError(res, 'Firm name is required', 400)
    if (name.length > 60) return sendError(res, 'Firm name is too long', 400)

    const existing = await prisma.propFirm.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existing && !existing.createdByUserId) {
      return sendError(res, `"${name}" already exists in the catalog`, 409)
    }

    let slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-u${userId.slice(0, 8)}`
    const clash = await prisma.propFirm.findUnique({ where: { slug } })
    if (clash) slug = `${slug}-${Date.now().toString(36)}`

    const firm = await prisma.propFirm.create({
      data: {
        name,
        slug,
        websiteUrl: websiteUrl || '',
        instruments: market,
        description: null,
        accountPrices: [],
        isActive: true,
        isFeatured: false,
        codeStatus: 'MANUAL',
        rulesStatus: 'MANUAL',
        createdByUserId: userId,
      },
    })
    return sendSuccess(res, firm)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create prop firm', 400)
  }
}
