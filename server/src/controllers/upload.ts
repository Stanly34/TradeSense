import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import * as uploadService from '../services/upload.js'
import { getUserPlan } from '../services/subscription.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function uploadTradeImage(req: Request, res: Response) {
  try {
    if (!req.file) return sendError(res, 'No file provided', 400)

    const { tradeId, category, description, tradeTimestamp } = req.body

    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId: req.user!.userId, isDeleted: false },
    })
    if (!trade) {
      return sendError(res, 'Trade not found', 404)
    }

    const plan = await getUserPlan(req.user!.userId)
    if (plan.plan.imageLimit !== null) {
      const existingCount = await prisma.tradeImage.count({ where: { tradeId } })
      if (existingCount >= plan.plan.imageLimit) {
        return sendError(res, `Free plan allows ${plan.plan.imageLimit} image per trade. Upgrade to Pro for unlimited.`, 403)
      }
    }

    const { url, publicId, width, height } = await uploadService.uploadImage(req.file.path)

    const image = await prisma.tradeImage.create({
      data: {
        tradeId,
        imageUrl: url,
        cloudinaryId: publicId,
        width,
        height,
        category: category || 'ANALYSIS',
        description: description || null,
        tradeTimestamp: tradeTimestamp ? new Date(tradeTimestamp) : null,
      },
    })

    return sendSuccess(res, image, 'Image uploaded', 201)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to upload image', 500)
  }
}

export async function deleteTradeImage(req: Request, res: Response) {
  try {
    const image = await prisma.tradeImage.findFirst({
      where: { id: req.params.id, trade: { userId: req.user!.userId } },
    })
    if (!image) return sendError(res, 'Image not found', 404)

    if (image.cloudinaryId) {
      await uploadService.deleteImage(image.cloudinaryId)
    }

    await prisma.tradeImage.delete({ where: { id: image.id } })
    return sendSuccess(res, null, 'Image deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete image', 500)
  }
}
