import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { GradientText } from '../hub/Hub'
import { fadeUp } from '../../lib/motion'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <motion.div variants={fadeUp} className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          <GradientText animated>{title}</GradientText>
        </h1>
        {subtitle && (
          <p className="text-text-secondary mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  )
}
