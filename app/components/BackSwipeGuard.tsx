'use client'

import { useEffect } from 'react'

export default function BackSwipeGuard() {
  useEffect(() => {
    // Push a dummy entry so the back swipe lands back on this page
    // instead of going blank or to a previous site
    history.pushState(null, '', window.location.href)

    const onPopState = () => {
      history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return null
}
