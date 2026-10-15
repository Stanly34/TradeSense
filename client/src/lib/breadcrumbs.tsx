import { createContext, useContext, useEffect, useState } from 'react'

export interface Crumb {
  label: string
  to?: string
}

interface BreadcrumbState {
  override: Crumb[] | null
  setOverride: (c: Crumb[] | null) => void
}

const BreadcrumbCtx = createContext<BreadcrumbState>({ override: null, setOverride: () => {} })

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<Crumb[] | null>(null)
  return <BreadcrumbCtx.Provider value={{ override, setOverride }}>{children}</BreadcrumbCtx.Provider>
}

export function useBreadcrumbOverride(): Crumb[] | null {
  return useContext(BreadcrumbCtx).override
}

export function useCrumbs(trail: Crumb[] | null) {
  const { setOverride } = useContext(BreadcrumbCtx)
  const key = trail ? JSON.stringify(trail) : null
  useEffect(() => {
    setOverride(trail)
    return () => setOverride(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
