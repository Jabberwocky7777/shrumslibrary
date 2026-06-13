const router = require('express').Router()

router.get('/', async (req, res) => {
  const { q } = req.query
  if (!q || !q.trim()) return res.json([])

  try {
    const params = new URLSearchParams({
      q: q.trim(),
      fields: 'key,title,author_name,first_publish_year,cover_i,series',
      limit: '20',
    })

    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      headers: { 'User-Agent': 'ShrumsLibrary/1.0 (self-hosted ebook manager)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) throw new Error(`Open Library returned ${response.status}`)

    const data = await response.json()
    const books = (data.docs || []).map(doc => ({
      key:      doc.key,
      title:    doc.title,
      author:   doc.author_name?.[0] || null,
      year:     doc.first_publish_year || null,
      cover_id: doc.cover_i || null,
      series:   doc.series?.[0] || null,
    }))

    res.json(books)
  } catch (err) {
    res.status(502).json({ error: `Book lookup failed: ${err.message}` })
  }
})

module.exports = router
