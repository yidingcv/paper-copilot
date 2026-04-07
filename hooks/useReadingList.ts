'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ReadingListItem {
  paperId: string
  venue: string
  year: string
  title: string
  addedAt: number
}

const STORAGE_KEY = 'papercc-reading-list'

export function useReadingList() {
  const [readingList, setReadingList] = useState<ReadingListItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setReadingList(JSON.parse(stored))
      } catch {
        setReadingList([])
      }
    }
  }, [])

  const toggleReadingList = useCallback((item: Omit<ReadingListItem, 'addedAt'>) => {
    setReadingList(prev => {
      const exists = prev.find(p => p.paperId === item.paperId)
      let newList: ReadingListItem[]
      if (exists) {
        newList = prev.filter(p => p.paperId !== item.paperId)
      } else {
        newList = [...prev, { ...item, addedAt: Date.now() }]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      return newList
    })
  }, [])

  const isInReadingList = useCallback((paperId: string) => {
    return readingList.some(p => p.paperId === paperId)
  }, [readingList])

  const clearReadingList = useCallback(() => {
    setReadingList([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    readingList,
    toggleReadingList,
    isInReadingList,
    clearReadingList,
  }
}