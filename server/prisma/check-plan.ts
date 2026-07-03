import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
p.plan.findMany({ where: { name: 'BASIC' } }).then(r => {
  console.log(JSON.stringify(r, null, 2))
  p.$disconnect()
})
