import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

/** Price in pence (GBP) for each action type */
export const ACTION_PRICES: Record<string, number> = {
  manufacturer_send_offer: parseInt(
    process.env.SEND_OFFER_PRICE_PENCE ?? '300',
    10
  ),
  brand_send_request: parseInt(
    process.env.POST_REQUEST_PRICE_PENCE ?? '0',
    10
  ),
}

export const ACTION_LABELS: Record<string, string> = {
  manufacturer_send_offer: 'Send Offer – D4TF Connect',
  brand_send_request: 'Post Production Request – D4TF Connect',
  manufacturer_accept_offer: 'Accept Offer – D4TF Connect',
}

export function formatGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}
