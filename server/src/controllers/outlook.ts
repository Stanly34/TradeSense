import type { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { prisma } from '../lib/prisma.js'
import * as outlookService from '../services/outlook.js'
import { sendSuccess, sendError } from '../utils/response.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function deleteImageFile(imageUrl: string | null | undefined) {
  if (!imageUrl) return
  const filename = path.basename(imageUrl)
  const filepath = path.join(__dirname, '..', '..', 'uploads', filename)
  fs.unlink(filepath, () => {})
}

export async function listOutlooks(req: Request, res: Response) {
  try {
    const entries = await outlookService.listOutlooks(req.user!.userId)
    return sendSuccess(res, entries)
  } catch {
    return sendError(res, 'Failed to list outlooks', 500)
  }
}

export async function getOutlook(req: Request, res: Response) {
  try {
    const weekStart = req.query.week as string
    const instrument = req.query.instrument as string
    if (!weekStart || !instrument) return sendError(res, 'Week start and instrument are required', 400)
    const date = new Date(weekStart + 'T00:00:00Z')
    if (isNaN(date.getTime())) return sendError(res, 'Invalid date', 400)
    const entry = await outlookService.getByWeek(req.user!.userId, date, instrument)
    return sendSuccess(res, entry || { beforeImage: null, afterImage: null, notes: null })
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get outlook', 500)
  }
}

export async function saveOutlook(req: Request, res: Response) {
  try {
    const id = req.body.id as string | undefined
    const weekStart = req.body.week as string
    const instrument = req.body.instrument as string
    if (!weekStart || !instrument) return sendError(res, 'Week start and instrument are required', 400)
    const date = new Date(weekStart + 'T00:00:00Z')
    if (isNaN(date.getTime())) return sendError(res, 'Invalid date', 400)

    let existing = null
    if (id) {
      existing = await prisma.weeklyOutlook.findFirst({
        where: { id, userId: req.user!.userId },
      })
      if (!existing) return sendError(res, 'Outlook not found', 404)
    } else {
      existing = await outlookService.getByWeek(req.user!.userId, date, instrument)
    }

    const data: { direction?: string | null; beforeImage?: string | null; afterImage?: string | null; notes?: string | null } = {}
    if (req.body.direction !== undefined) data.direction = req.body.direction
    if (req.body.notes !== undefined) data.notes = req.body.notes

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    if (files?.beforeImage?.[0]) {
      data.beforeImage = `/uploads/${files.beforeImage[0].filename}`
      deleteImageFile(existing?.beforeImage)
    } else if (req.body.clearBeforeImage === 'true') {
      data.beforeImage = null
      deleteImageFile(existing?.beforeImage)
    }

    if (files?.afterImage?.[0]) {
      data.afterImage = `/uploads/${files.afterImage[0].filename}`
      deleteImageFile(existing?.afterImage)
    } else if (req.body.clearAfterImage === 'true') {
      data.afterImage = null
      deleteImageFile(existing?.afterImage)
    }

    let entry
    if (id && existing) {
      entry = await prisma.weeklyOutlook.update({
        where: { id },
        data,
      })
    } else {
      entry = await outlookService.upsert(req.user!.userId, date, instrument, data)
    }
    return sendSuccess(res, entry, 'Outlook saved')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to save outlook', 500)
  }
}

export async function deleteOutlook(req: Request, res: Response) {
  try {
    const { id } = req.params
    const entry = await prisma.weeklyOutlook.findFirst({
      where: { id, userId: req.user!.userId },
    })
    if (!entry) return sendError(res, 'Outlook not found', 404)
    deleteImageFile(entry.beforeImage)
    deleteImageFile(entry.afterImage)
    await prisma.weeklyOutlook.delete({ where: { id } })
    return sendSuccess(res, null, 'Outlook deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete outlook', 500)
  }
}

export async function batchDeleteOutlooks(req: Request, res: Response) {
  try {
    const { ids } = req.body as { ids: string[] }
    const entries = await prisma.weeklyOutlook.findMany({
      where: { id: { in: ids }, userId: req.user!.userId },
      select: { id: true, beforeImage: true, afterImage: true },
    })
    if (entries.length !== ids.length) return sendError(res, 'Some outlooks not found', 404)
    for (const entry of entries) {
      deleteImageFile(entry.beforeImage)
      deleteImageFile(entry.afterImage)
    }
    await prisma.weeklyOutlook.deleteMany({
      where: { id: { in: ids }, userId: req.user!.userId },
    })
    return sendSuccess(res, null, `${ids.length} outlooks deleted`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete outlooks', 400)
  }
}
