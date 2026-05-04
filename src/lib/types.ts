export type Role = 'brand' | 'manufacturer'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type ActionType =
  | 'brand_send_request'
  | 'manufacturer_send_offer'
  | 'manufacturer_accept_offer'
export type LinkType = 'instagram' | 'website' | 'whatsapp' | 'email'

export interface Profile {
  id: string
  role: Role
  name: string
  bio: string | null
  city: string | null
  country: string | null
  profile_image_url: string | null
  verified: boolean
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
