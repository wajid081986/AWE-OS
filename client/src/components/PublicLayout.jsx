import Header from './Header'
import Footer from './Footer'

export default function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
