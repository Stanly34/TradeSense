export function parseTagContent(content: string | null | undefined): string[] {
  if (!content) return []
  if (content.startsWith('[')) {
    try {
      const parsed = JSON.parse(content)
      return parsed.map((item: unknown) => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item && 'name' in item) return (item as { name: string }).name
        return ''
      }).filter(Boolean)
    } catch {}
  }
  return content.split('\n').filter(Boolean).map((line) => line.trim())
}
