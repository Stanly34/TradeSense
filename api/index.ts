let handler: any

export default async function(req: any, res: any) {
  if (!handler) {
    try {
      const mod = await import('../server/src/app.js')
      handler = mod.default
    } catch (e: any) {
      res.status(500).json({ error: e?.message || String(e), stack: e?.stack?.split('\n').slice(0, 10).join('\n') })
      return
    }
  }
  handler(req, res)
}
