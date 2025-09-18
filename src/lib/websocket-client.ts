'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { supabase } from './supabase-client'

interface WebSocketHookOptions {
  autoConnect?: boolean
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onError?: (error: Error) => void
}

export function useWebSocket(options: WebSocketHookOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastPing, setLastPing] = useState<number | null>(null)

  useEffect(() => {
    if (!autoConnect) return

    const connectWebSocket = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.access_token) {
          setConnectionError('No valid session found')
          return
        }

        // Create socket connection
        const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001', {
          auth: {
            token: session.access_token
          },
          transports: ['websocket', 'polling']
        })

        socketRef.current = socket

        socket.on('connect', () => {
          console.log('WebSocket connected')
          setIsConnected(true)
          setConnectionError(null)
          onConnect?.()
        })

        socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason)
          setIsConnected(false)
          onDisconnect?.(reason)
        })

        socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error)
          setConnectionError(error.message)
          setIsConnected(false)
          onError?.(error)
        })

        socket.on('error', (error) => {
          console.error('WebSocket error:', error)
          setConnectionError(error.message)
          onError?.(new Error(error.message))
        })

        socket.on('pong', (data) => {
          setLastPing(Date.now() - data.timestamp)
        })

        // Send ping every 30 seconds to check connection health
        const pingInterval = setInterval(() => {
          if (socket.connected) {
            socket.emit('ping')
          }
        }, 30000)

        return () => {
          clearInterval(pingInterval)
          socket.disconnect()
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setConnectionError(error instanceof Error ? error.message : 'Connection failed')
        onError?.(error instanceof Error ? error : new Error('Connection failed'))
      }
    }

    connectWebSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [autoConnect, onConnect, onDisconnect, onError])

  const connect = async () => {
    if (socketRef.current?.connected) return
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session?.access_token) {
        throw new Error('No valid session found')
      }

      if (socketRef.current) {
        socketRef.current.auth = { token: session.access_token }
        socketRef.current.connect()
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
  }

  const subscribeToAccount = (accountId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:account', accountId)
    }
  }

  const subscribeToCopyRule = (copyRuleId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:copy-rule', copyRuleId)
    }
  }

  const unsubscribe = (type: string, id: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { type, id })
    }
  }

  const on = (event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    lastPing,
    connect,
    disconnect,
    subscribeToAccount,
    subscribeToCopyRule,
    unsubscribe,
    on,
    off
  }
}

// Hook for subscribing to trade updates
export function useTradeUpdates(accountId?: string) {
  const [trades, setTrades] = useState<any[]>([])
  const [latestTrade, setLatestTrade] = useState<any | null>(null)
  const { socket, isConnected, subscribeToAccount, unsubscribe, on, off } = useWebSocket()

  useEffect(() => {
    if (!isConnected || !socket) return

    const handleTradeUpdate = (data: { type: string; trade: any }) => {
      setLatestTrade(data.trade)
      
      if (data.type === 'insert') {
        setTrades(prev => [data.trade, ...prev])
      } else if (data.type === 'update') {
        setTrades(prev => 
          prev.map(trade => 
            trade.id === data.trade.id ? data.trade : trade
          )
        )
      }
    }

    on('trade:update', handleTradeUpdate)

    if (accountId) {
      subscribeToAccount(accountId)
    }

    return () => {
      off('trade:update', handleTradeUpdate)
      if (accountId) {
        unsubscribe('account', accountId)
      }
    }
  }, [isConnected, accountId, socket, subscribeToAccount, unsubscribe, on, off])

  return { trades, latestTrade }
}

// Hook for subscribing to copy operation updates
export function useCopyOperationUpdates(copyRuleId?: string) {
  const [operations, setOperations] = useState<any[]>([])
  const [latestOperation, setLatestOperation] = useState<any | null>(null)
  const { socket, isConnected, subscribeToCopyRule, unsubscribe, on, off } = useWebSocket()

  useEffect(() => {
    if (!isConnected || !socket) return

    const handleCopyOperationUpdate = (data: { type: string; operation: any }) => {
      setLatestOperation(data.operation)
      
      if (data.type === 'insert') {
        setOperations(prev => [data.operation, ...prev])
      } else if (data.type === 'update') {
        setOperations(prev => 
          prev.map(op => 
            op.id === data.operation.id ? data.operation : op
          )
        )
      }
    }

    on('copy-operation:update', handleCopyOperationUpdate)

    if (copyRuleId) {
      subscribeToCopyRule(copyRuleId)
    }

    return () => {
      off('copy-operation:update', handleCopyOperationUpdate)
      if (copyRuleId) {
        unsubscribe('copy-rule', copyRuleId)
      }
    }
  }, [isConnected, copyRuleId, socket, subscribeToCopyRule, unsubscribe, on, off])

  return { operations, latestOperation }
}

// Hook for system events and alerts
export function useSystemEvents() {
  const [events, setEvents] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const { socket, isConnected, on, off } = useWebSocket()

  useEffect(() => {
    if (!isConnected || !socket) return

    const handleSystemEvent = (data: { event: any }) => {
      setEvents(prev => [data.event, ...prev.slice(0, 99)]) // Keep last 100 events
    }

    const handleSystemAlert = (data: { message: string; severity: string; timestamp: string }) => {
      setAlerts(prev => [data, ...prev.slice(0, 19)]) // Keep last 20 alerts
    }

    on('system:event', handleSystemEvent)
    on('system:alert', handleSystemAlert)

    return () => {
      off('system:event', handleSystemEvent)
      off('system:alert', handleSystemAlert)
    }
  }, [isConnected, socket, on, off])

  const clearAlerts = () => setAlerts([])
  const removeAlert = (index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index))
  }

  return { events, alerts, clearAlerts, removeAlert }
}

// Hook for account status updates
export function useAccountStatus(accountId?: string) {
  const [accountStatus, setAccountStatus] = useState<any | null>(null)
  const { socket, isConnected, subscribeToAccount, unsubscribe, on, off } = useWebSocket()

  useEffect(() => {
    if (!isConnected || !socket) return

    const handleAccountUpdate = (data: { type: string; account: any }) => {
      if (!accountId || data.account.id === accountId) {
        setAccountStatus(data.account)
      }
    }

    on('account:update', handleAccountUpdate)

    if (accountId) {
      subscribeToAccount(accountId)
    }

    return () => {
      off('account:update', handleAccountUpdate)
      if (accountId) {
        unsubscribe('account', accountId)
      }
    }
  }, [isConnected, accountId, socket, subscribeToAccount, unsubscribe, on, off])

  return { accountStatus }
}
