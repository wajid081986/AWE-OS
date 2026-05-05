import { Link } from 'react-router-dom'

const COLS = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home',      to: '/'          },
      { label: 'All Tools', to: '/tools'     },
      { label: 'Blog',      to: '/blog'      },
      { label: 'About Us',  to: '/about'     },
    ],
  },
  {
    title: 'Categories',
    links: [
      { label: 'AI Tools',     to: '/tools?cat=ai_tools'    },
      { label: 'Converters',   to: '/tools?cat=converters'  },
      { label: 'Calculators',  to: '/calculators'           },
      { label: 'Products',     to: '/tools?cat=products'    },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact Us',      to: '/contact' },
      { label: 'Privacy Policy',  to: '/privacy' },
      { label: 'Terms of Use',    to: '/terms'   },
      { label: 'About AWE-OS',    to: '/about'   },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤖</span>
              <span className="text-white font-bold text-xl">AWE-OS</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Free AI-powered tools for everyone — fast, smart, and easy to use.
            </p>
            {/* Social icons */}
            <div className="flex gap-3">
              {[
                { href: 'https://twitter.com', icon: '𝕏', label: 'Twitter' },
                { href: 'https://linkedin.com', icon: 'in', label: 'LinkedIn' },
                { href: 'https://github.com',   icon: '⌥', label: 'GitHub'   },
              ].map(({ href, icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} AWE-OS. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link to="/terms"   className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-gray-300 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
