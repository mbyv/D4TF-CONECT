import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'D4TF Connect – Fashion Brands Meet Manufacturers',
  description:
    'The UK B2B fashion marketplace connecting brands with manufacturers. Pay only for the actions that matter.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://d4-tf-conect.vercel.app'),
  themeColor: '#c026d3',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
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
