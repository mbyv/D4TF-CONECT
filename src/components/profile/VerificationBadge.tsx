import { VerificationTier, TIER_CONFIG } from '@/lib/types'

interface Props {
  tier: VerificationTier
  size?: 'sm' | 'md'
  showUnverified?: boolean
}

export default function VerificationBadge({ tier, size = 'sm', showUnverified = false }: Props) {
  if (tier === 'unverified' && !showUnverified) return null

  const config = TIER_CONFIG[tier]
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <span className={`badge ${config.bg} ${config.color} ${textSize} font-semibold gap-1`}>
      {config.icon} {config.label}
    </span>
  )
}
