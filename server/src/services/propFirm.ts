import { prisma } from '../lib/prisma.js'

export type PropFirmInput = {
  name?: string
  slug?: string
  websiteUrl?: string
  description?: string | null
  rating?: number
  country?: string
  instruments?: string
  profitSplit?: number
  payoutSpeed?: string
  logoColor?: string
  accountPrices?: unknown
  discountPercent?: number
  promoCode?: string | null
  dailyPayouts?: boolean
  noActivationFee?: boolean
  oneTimeFee?: boolean
  instantFunding?: boolean
  isFeatured?: boolean
  isActive?: boolean
  promoSourceUrl?: string | null
  lastCodeCheckAt?: Date | null
  codeStatus?: string
  dealEndsAt?: Date | null
}

export async function listAllPropFirms() {
  return prisma.propFirm.findMany({ orderBy: { name: 'asc' } })
}

export async function createPropFirm(data: PropFirmInput) {
  if (!data.name || !data.slug) throw new Error('Firm name and slug are required')
  const existing = await prisma.propFirm.findUnique({ where: { slug: data.slug } })
  if (existing) throw new Error('A firm with slug "' + data.slug + '" already exists')

  return prisma.propFirm.create({
    data: {
      name: data.name,
      slug: data.slug,
      websiteUrl: data.websiteUrl ?? '',
      description: data.description ?? null,
      rating: data.rating ?? 0,
      country: data.country ?? 'US',
      instruments: data.instruments ?? 'FUTURES',
      profitSplit: data.profitSplit ?? 80,
      payoutSpeed: data.payoutSpeed ?? 'Bi-Weekly',
      logoColor: data.logoColor ?? '#7C3AED',
      accountPrices: data.accountPrices ?? undefined,
      discountPercent: data.discountPercent ?? 0,
      promoCode: data.promoCode ?? null,
      dailyPayouts: data.dailyPayouts ?? false,
      noActivationFee: data.noActivationFee ?? false,
      oneTimeFee: data.oneTimeFee ?? false,
      instantFunding: data.instantFunding ?? false,
      isFeatured: data.isFeatured ?? false,
      isActive: data.isActive ?? true,
      promoSourceUrl: data.promoSourceUrl ?? undefined,
      lastCodeCheckAt: data.lastCodeCheckAt ?? undefined,
      codeStatus: data.codeStatus ?? 'MANUAL',
    },
  })
}

export async function updatePropFirm(id: string, data: PropFirmInput) {
  const firm = await prisma.propFirm.findUnique({ where: { id } })
  if (!firm) throw new Error('Prop firm not found')

  if (data.slug && data.slug !== firm.slug) {
    const existing = await prisma.propFirm.findUnique({ where: { slug: data.slug } })
    if (existing) throw new Error('A firm with slug "' + data.slug + '" already exists')
  }

  const { accountPrices, dealEndsAt, ...rest } = data
  const updateData: Record<string, unknown> = { ...rest }
  if (dealEndsAt !== undefined) {
    updateData.dealEndsAt = dealEndsAt === null ? null : new Date(dealEndsAt)
  }
  if (accountPrices !== undefined) {
    updateData.accountPrices = accountPrices as object
  }

  return prisma.propFirm.update({ where: { id }, data: updateData as never })
}

export async function deletePropFirm(id: string) {
  const firm = await prisma.propFirm.findUnique({ where: { id } })
  if (!firm) throw new Error('Prop firm not found')

  return prisma.propFirm.delete({ where: { id } })
}

export async function applyScanResult(
  id: string,
  result: { code?: string | null; percent?: number | null; dealEndsAt?: Date | null; status: string; checkedAt: Date }
) {
  const data: Record<string, unknown> = {
    lastCodeCheckAt: result.checkedAt,
    codeStatus: result.status,
  }
  if (result.code !== undefined) data.promoCode = result.code
  if (result.dealEndsAt !== undefined) data.dealEndsAt = result.dealEndsAt
  if (result.percent !== undefined && result.percent !== null) {
    data.discountPercent = result.percent
    const firm = await prisma.propFirm.findUnique({ where: { id } })
    const plans = (firm?.accountPrices ?? []) as Array<{ plan: string; sizes: Array<{ size: string; price: number; discounted: number }> }>
    data.accountPrices = plans.map((p) => ({
      ...p,
      sizes: p.sizes.map((s) => ({ ...s, discounted: Math.round(s.price * (1 - result.percent! / 100)) })),
    }))
  }
  return prisma.propFirm.update({ where: { id }, data: data as never })
}

export async function listScanTargets() {
  return prisma.propFirm.findMany({
    where: { isActive: true, codeStatus: { not: 'MANUAL' } },
    orderBy: { name: 'asc' },
  })
}

export interface RuleRow {
  label: string
  value: string
}

export function normSize(size: string): string {
  const digits = size.replace(/[^0-9]/g, '')
  const n = parseInt(digits, 10)
  if (!n || !digits.length) return size.toLowerCase()
  const k = n / 1000
  return k >= 1 && Number.isInteger(k) ? `${k}k` : `${n}`
}

export async function applyRulesResult(
  id: string,
  result: { sizes: Array<{ size: string; evalRules?: RuleRow[]; fundedRules?: RuleRow[] }> },
  checkedAt: Date
) {
  const firm = await prisma.propFirm.findUnique({ where: { id } })
  if (!firm) return
  const bySize = new Map<string, { evalRules?: RuleRow[]; fundedRules?: RuleRow[] }>()
  for (const row of result.sizes) bySize.set(normSize(row.size), row)

  const plans = (firm.accountPrices ?? []) as unknown as Array<{
    sizes: Array<{ size: string; price: number; discounted: number; evalRules?: RuleRow[]; fundedRules?: RuleRow[] }>
  }>
  const touched = new Set<string>()
  return prisma.propFirm.update({
    where: { id },
    data: {
      accountPrices: plans.map((p) => ({
        ...p,
        sizes: p.sizes.map((s) => {
          const match = bySize.get(normSize(s.size))
          if (!match) return s
          const key = normSize(s.size)
          if (touched.has(key)) return s
          touched.add(key)
          return {
            ...s,
            evalRules: match.evalRules ?? s.evalRules,
            fundedRules: match.fundedRules ?? s.fundedRules,
          }
        }),
      })),
      lastRulesCheckAt: checkedAt,
      rulesStatus: 'OK',
    } as never,
  })
}

export async function applyRulesStatus(id: string, status: string, checkedAt: Date) {
  return prisma.propFirm.update({
    where: { id },
    data: { rulesStatus: status, lastRulesCheckAt: checkedAt } as never,
  })
}

export async function listRulesTargets() {
  return prisma.propFirm.findMany({
    where: { isActive: true, rulesStatus: { not: 'MANUAL' } },
    orderBy: { name: 'asc' },
  })
}