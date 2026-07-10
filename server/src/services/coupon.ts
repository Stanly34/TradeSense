import { prisma } from '../lib/prisma.js'

export async function listCoupons() {
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createCoupon(data: {
  code: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  maxUsage?: number | null
  expiresAt?: string | null
}) {
  const existing = await prisma.coupon.findUnique({ where: { code: data.code } })
  if (existing) throw new Error('Coupon code already exists')

  return prisma.coupon.create({
    data: {
      code: data.code,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      maxUsage: data.maxUsage ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  })
}

export async function updateCoupon(
  id: string,
  data: {
    description?: string
    discountType?: 'PERCENTAGE' | 'FIXED'
    discountValue?: number
    maxUsage?: number | null
    expiresAt?: string | null
    isActive?: boolean
  }
) {
  const coupon = await prisma.coupon.findUnique({ where: { id } })
  if (!coupon) throw new Error('Coupon not found')

  return prisma.coupon.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description }),
      ...(data.discountType !== undefined && { discountType: data.discountType }),
      ...(data.discountValue !== undefined && { discountValue: data.discountValue }),
      ...(data.maxUsage !== undefined && { maxUsage: data.maxUsage }),
      ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  })
}

export async function deleteCoupon(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id } })
  if (!coupon) throw new Error('Coupon not found')

  return prisma.coupon.update({ where: { id }, data: { isActive: false } })
}
