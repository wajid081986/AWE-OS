import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-paper text-ink font-body">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  )
}
