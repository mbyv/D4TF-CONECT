export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatQuantity(qty: number): string {
  if (qty >= 1000) return `${(qty / 1000).toFixed(1)}k units`
  return `${qty} units`
}

export const LINK_ICONS: Record<string, string> = {
  instagram: '📸',
  website: '🌐',
  whatsapp: '💬',
  email: '✉️',
}

export const LINK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  website: 'Website',
  whatsapp: 'WhatsApp',
  email: 'Email',
}

export function getLinkHref(type: string, url: string): string {
  if (type === 'whatsapp') {
    const num = url.replace(/\D/g, '')
    return `https://wa.me/${num}`
  }
  if (type === 'email' && !url.startsWith('mailto:')) {
    return `mailto:${url}`
  }
  if ((type === 'website' || type === 'instagram') && !url.startsWith('http')) {
    return `https://${url}`
  }
  return url
}
