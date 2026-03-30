'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import type { Notification } from '@/components/NotificationCenter'

export function useNotifications() {
  const { user } = useUser()
  const db = useFirestore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setNotifications([])
      setLoading(false)
      return
    }

    const notificationsRef = collection(db, 'notifications')
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Notification[]
      
      setNotifications(notifs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, db])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return
    
    const notifRef = doc(db, 'notifications', notificationId)
    await updateDoc(notifRef, { read: true })
  }, [user, db])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    
    const unread = notifications.filter(n => !n.read)
    await Promise.all(
      unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }))
    )
  }, [notifications, user, db])

  const dismiss = useCallback(async (notificationId: string) => {
    if (!user) return
    
    const notifRef = doc(db, 'notifications', notificationId)
    await updateDoc(notifRef, { dismissed: true })
  }, [user, db])

  const clearAll = useCallback(async () => {
    if (!user) return
    
    await Promise.all(
      notifications.map(n => updateDoc(doc(db, 'notifications', n.id), { dismissed: true }))
    )
  }, [notifications, user, db])

  // Request push notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }, [])

  // Send local push notification
  const sendPushNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      })
    }
  }, [])

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    requestPermission,
    sendPushNotification,
    unreadCount: notifications.filter(n => !n.read).length
  }
}

// Notification creation helper
export async function createNotification(
  db: any,
  userId: string,
  notification: Omit<Notification, 'id' | 'timestamp'>
) {
  const notificationsRef = collection(db, 'notifications')
  await addDoc(notificationsRef, {
    ...notification,
    userId,
    timestamp: serverTimestamp(),
    dismissed: false
  })
}