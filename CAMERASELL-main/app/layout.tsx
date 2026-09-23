import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-be-vietnam-pro',
})

export const metadata: Metadata = {
  title: 'chupchoet.camera',
  description: 'Mua bán máy ảnh đã chọn lọc',
  generator: 'Tech Viet Quang team dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <body className={`${beVietnamPro.variable} font-be-vietnam-pro`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
