export type Role = 'brand' | 'manufacturer'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type ActionType =
  | 'brand_send_request'
  | 'manufacturer_send_offer'
  | 'manufacturer_accept_offer'
export type LinkType = 'instagram' | 'website' | 'whatsapp' | 'email'
export type VerificationTier = 'unverified' | 'basic' | 'verified' | 'trusted'

export interface Profile {
  id: string
  role: Role
  name: string
  bio: string | null
  city: string | null
  country: string | null
  profile_image_url: string | null
  verified: boolean
  // Verification fields
  phone: string | null
  phone_verified: boolean
  companies_house_number: string | null
  companies_house_name: string | null
  companies_house_verified: boolean
  verification_tier: VerificationTier
  created_at: string
}

export interface ProductionRequest {
  id: string
  brand_id: string
  title: string
  description: string
  quantity: number
  budget: number
  deadline: string
  created_at: string
  brand?: Profile
}

export interface Offer {
  id: string
  request_id: string
  manufacturer_id: string
  price: number
  message: string
  created_at: string
  manufacturer?: Profile
}

export interface PortfolioItem {
  id: string
  profile_id: string
  image_url: string
  caption: string | null
  created_at: string
}

export interface ProfileLink {
  id: string
  profile_id: string
  type: LinkType
  url: string
  created_at: string
}

export interface ActionPayment {
  id: string
  action_type: ActionType
  actor_profile_id: string
  related_request_id: string | null
  related_offer_id: string | null
  amount_gbp: number
  currency: string
  payment_provider: string
  payment_status: PaymentStatus
  payment_link_url: string | null
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  pending_offer_data: {
    request_id: string
    price: number
    message: string
  } | null
  created_at: string
}

// Verification tier metadata
export const TIER_CONFIG: Record<VerificationTier, {
  label: string
  color: string
  bg: string
  icon: string
  description: string
}> = {
  unverified: {
    label: 'Unverified',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    icon: '○',
    description: 'Profile not yet verified',
  },
  basic: {
    label: 'Basic',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: '🔵',
    description: 'Phone number verified',
  },
  verified: {
    label: 'Verified',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: '🟡',
    description: 'Identity and profile verified',
  },
  trusted: {
    label: 'Trusted',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: '🟢',
    description: 'Fully verified UK business',
  },
}
