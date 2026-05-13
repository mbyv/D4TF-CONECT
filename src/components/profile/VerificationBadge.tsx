import { VerificationTier, TIER_CONFIG } from '@/lib/types'

interface Props {
  tier: VerificationTier
  size?: 'sm' | 'md'
}

export default function VerificationBadge({ tier, size = 'sm' }: Props) {
  if (tier === 'unverified') return null

  const config = TIER_CONFIG[tier]
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <span className={`badge ${config.bg} ${config.color} ${textSize} font-semibold gap-1`}>
      {config.icon} {config.label}
    </span>
  )
}
