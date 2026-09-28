import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { getAuthToken } from '../services/api'
import { useExpedition } from './ExpeditionContext'

const RealtimeContext = createContext({ revision: 0, connected: false })

export function RealtimeProvider({ children }) {
  const { selectedId } = useExpedition()
  const [revision, setRevision] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!selectedId || !getAuthToken()) return undefined
    let socket
    let stopped = false
    let timer
    const connect = async () => {
      try {
        const { ticket } = await api.get('/api/realtime/ticket?expedition_id=' + selectedId)
        if (stopped) return
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        socket = new WebSocket(proto + '//' + window.location.host + '/ws/expeditions/' + selectedId + '?ticket=' + encodeURIComponent(ticket))
        socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token: getAuthToken() }))
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.type === 'auth.ok') setConnected(true)
            else if (message.type !== 'pong') setRevision((value) => value + 1)
          } catch { /* ignore malformed payload */ }
        }
        socket.onclose = () => {
          setConnected(false)
          if (!stopped) timer = window.setTimeout(connect, 3000)
        }
      } catch {
        if (!stopped) timer = window.setTimeout(connect, 5000)
      }
    }
    connect()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      socket?.close()
      setConnected(false)
    }
  }, [selectedId])

  const value = useMemo(() => ({ revision, connected }), [revision, connected])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export const useRealtime = () => useContext(RealtimeContext)
