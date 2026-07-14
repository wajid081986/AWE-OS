import { Link } from 'react-router-dom'
import { BLOG_POSTS } from '../../../data/blogPosts'
import { BlogCard } from '../../../components/cards'
import { Container, Section, Button } from '../../../components/primitives'

function formatUpdated(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`
}

function initialsOf(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Latest 3 real, indexable posts — only the static BLOG_POSTS array is
// eligible (BlogPage.jsx's DB-fetched posts come from a client-side
// useEffect, not available at SSG build time). Sort is stable, so ties
// on `date` keep the array's existing order.
function getLatestPosts() {
  return BLOG_POSTS
    .filter(p => !p.noindex)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3)
}

export default function Guides() {
  const posts = getLatestPosts()

  return (
    <Section>
      <Container>
        <div className="max-w-[length:var(--section-head-max-width)] mb-10">
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Guides &amp; explainers
          </span>
          <h2 className="ds-h2 text-ink mb-3">Learn the "why" behind the tools</h2>
          <p className="text-[length:var(--text-body)] text-ink-soft">
            Our editorial team writes practical guides on PDF workflows, Indian personal finance, and productivity — reviewed, dated, and updated when the rules change.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
          {posts.map(post => (
            <BlogCard
              key={post.slug}
              to={`/blog/${post.slug}`}
              category={post.category}
              updatedDate={formatUpdated(post.date)}
              title={post.title}
              excerpt={post.excerpt}
              authorInitials={initialsOf(post.author)}
              authorName={post.author}
              readTime={post.readTime}
            />
          ))}
        </div>

        <div className="text-center mt-[length:var(--tools-cta-margin-top)]">
          <Button variant="ghost" as={Link} to="/blog">Read all guides →</Button>
        </div>
      </Container>
    </Section>
  )
}
