import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Paper CC',
  description: 'Track research papers from top AI/ML conferences, journals and arXiv',
}

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="logo">
          Paper CC<span className="logo-dot"></span>
        </Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/conferences">Venues</Link>
          <Link href="/reading-list">Reading List</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>© 2024 Paper CC. Powered by <a href="https://arxiv.org" target="_blank" rel="noopener">arXiv</a> & <a href="https://openreview.net" target="_blank" rel="noopener">OpenReview</a></p>
        <p>Daily auto-update via GitHub Actions</p>
      </div>
    </footer>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}