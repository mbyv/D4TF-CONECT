import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'D4TF Connect – Fashion Brands Meet Manufacturers',
  description:
    'The B2B fashion marketplace connecting brands with manufacturers. Pay only for the actions that matter.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
