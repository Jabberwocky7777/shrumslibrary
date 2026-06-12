import React, { useEffect, useState } from 'react'
import axios from 'axios'
import BookCard from '../components/BookCard'

export default function Library() {
  const [books, setBooks] = useState([])
  const [kindleAddresses, setKindleAddresses] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [{ data: b }, { data: k }] = await Promise.all([
        axios.get('/api/library'),
        axios.get('/api/kindle-addresses'),
      ])
      setBooks(b)
      setKindleAddresses(k)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="empty-state"><span className="spinner" /></div>

  return (
    <div>
      <h1 className="page-title">Library</h1>
      {books.length === 0 ? (
        <div className="empty-state">Your library is empty. Books appear here once downloaded and validated.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {books.map(book => (
            <BookCard
              key={book.id}
              book={book}
              kindleAddresses={kindleAddresses}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
