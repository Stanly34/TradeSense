import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const imgs = await p.tradeImage.deleteMany({})
const r = await p.trade.deleteMany({})
console.log('deleted images:', imgs.count, '| trades:', r.count)
await p.$disconnect()
