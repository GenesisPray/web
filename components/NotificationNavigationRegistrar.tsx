'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registerNotificationNavigation } from '@/lib/notifications'

export default function NotificationNavigationRegistrar() {
  const router = useRouter()

  useEffect(
    () => registerNotificationNavigation((path) => router.push(path)),
    [router]
  )

  return null
}
