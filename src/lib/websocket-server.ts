import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { supabaseAdmin } from './supabase-server'
import jwt from 'jsonwebtoken'

let io: SocketIOServer | null = null

export function initializeWebSocketServer(server: HTTPServer) {
  if (io) {
    return io
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST']
    }
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication token required'))
      }

      // Verify JWT token (you'd use your actual JWT secret)
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
      
      // Get user from Supabase
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(decoded.sub)
      if (error || !user) {
        return next(new Error('Invalid authentication token'))
      }

      socket.data.userId = user.id
      socket.data.userEmail = user.email
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    console.log(`User ${userId} connected to WebSocket`)

    // Join user-specific room for personalized updates
    socket.join(`user:${userId}`)

    // Handle subscription to specific account updates
    socket.on('subscribe:account', async (accountId: string) => {
      try {
        // Verify user owns this account
        const { data: account, error } = await supabaseAdmin
          .from('mt_accounts')
          .select('id')
          .eq('id', accountId)
          .eq('user_id', userId)
          .single()

        if (error || !account) {
          socket.emit('error', { message: 'Account not found or unauthorized' })
          return
        }

        socket.join(`account:${accountId}`)
        socket.emit('subscribed', { type: 'account', id: accountId })
      } catch (error) {
        socket.emit('error', { message: 'Failed to subscribe to account' })
      }
    })

    // Handle subscription to copy rule updates
    socket.on('subscribe:copy-rule', async (copyRuleId: string) => {
      try {
        // Verify user owns this copy rule
        const { data: copyRule, error } = await supabaseAdmin
          .from('copy_rules')
          .select('id')
          .eq('id', copyRuleId)
          .eq('user_id', userId)
          .single()

        if (error || !copyRule) {
          socket.emit('error', { message: 'Copy rule not found or unauthorized' })
          return
        }

        socket.join(`copy-rule:${copyRuleId}`)
        socket.emit('subscribed', { type: 'copy-rule', id: copyRuleId })
      } catch (error) {
        socket.emit('error', { message: 'Failed to subscribe to copy rule' })
      }
    })

    // Handle unsubscribe requests
    socket.on('unsubscribe', (data: { type: string; id: string }) => {
      socket.leave(`${data.type}:${data.id}`)
      socket.emit('unsubscribed', data)
    })

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    socket.on('disconnect', (reason) => {
      console.log(`User ${userId} disconnected: ${reason}`)
    })
  })

  // Set up Supabase real-time subscriptions
  setupSupabaseSubscriptions()

  return io
}

function setupSupabaseSubscriptions() {
  if (!io) return

  // Subscribe to trade changes
  const tradesSubscription = supabaseAdmin
    .channel('trades-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'trades' },
      async (payload) => {
        console.log('Trade change detected:', payload)
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const trade = payload.new
          
          // Get account owner
          const { data: account, error } = await supabaseAdmin
            .from('mt_accounts')
            .select('user_id')
            .eq('id', trade.account_id)
            .single()

          if (!error && account) {
            // Emit to account room
            io!.to(`account:${trade.account_id}`).emit('trade:update', {
              type: payload.eventType.toLowerCase(),
              trade: trade
            })

            // Emit to user room
            io!.to(`user:${account.user_id}`).emit('trade:update', {
              type: payload.eventType.toLowerCase(),
              trade: trade
            })
          }
        }
      }
    )
    .subscribe()

  // Subscribe to copy operation changes
  const copyOpsSubscription = supabaseAdmin
    .channel('copy-operations-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'copy_operations' },
      async (payload) => {
        console.log('Copy operation change detected:', payload)
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const operation = payload.new
          
          // Get copy rule and user
          const { data: copyRule, error } = await supabaseAdmin
            .from('copy_rules')
            .select('id, user_id')
            .eq('id', operation.copy_rule_id)
            .single()

          if (!error && copyRule) {
            // Emit to copy rule room
            io!.to(`copy-rule:${copyRule.id}`).emit('copy-operation:update', {
              type: payload.eventType.toLowerCase(),
              operation: operation
            })

            // Emit to user room
            io!.to(`user:${copyRule.user_id}`).emit('copy-operation:update', {
              type: payload.eventType.toLowerCase(),
              operation: operation
            })
          }
        }
      }
    )
    .subscribe()

  // Subscribe to account status changes
  const accountsSubscription = supabaseAdmin
    .channel('accounts-changes')
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'mt_accounts' },
      async (payload) => {
        console.log('Account change detected:', payload)
        
        const account = payload.new
        
        // Emit to account room
        io!.to(`account:${account.id}`).emit('account:update', {
          type: 'update',
          account: account
        })

        // Emit to user room
        io!.to(`user:${account.user_id}`).emit('account:update', {
          type: 'update',
          account: account
        })
      }
    )
    .subscribe()

  // Subscribe to system events
  const systemEventsSubscription = supabaseAdmin
    .channel('system-events-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'system_events' },
      async (payload) => {
        console.log('System event detected:', payload)
        
        const event = payload.new
        
        if (event.account_id) {
          // Get account owner
          const { data: account, error } = await supabaseAdmin
            .from('mt_accounts')
            .select('user_id')
            .eq('id', event.account_id)
            .single()

          if (!error && account) {
            // Emit to user room
            io!.to(`user:${account.user_id}`).emit('system:event', {
              event: event
            })

            // Emit to account room
            io!.to(`account:${event.account_id}`).emit('system:event', {
              event: event
            })
          }
        } else {
          // Broadcast to all connected users for system-wide events
          io!.emit('system:event', {
            event: event
          })
        }
      }
    )
    .subscribe()

  console.log('Supabase real-time subscriptions set up')
}

// Helper functions to emit events from other parts of the application
export function emitTradeUpdate(accountId: string, userId: string, trade: any) {
  if (!io) return
  
  io.to(`account:${accountId}`).emit('trade:update', {
    type: 'update',
    trade: trade
  })
  
  io.to(`user:${userId}`).emit('trade:update', {
    type: 'update',
    trade: trade
  })
}

export function emitCopyOperationUpdate(copyRuleId: string, userId: string, operation: any) {
  if (!io) return
  
  io.to(`copy-rule:${copyRuleId}`).emit('copy-operation:update', {
    type: 'update',
    operation: operation
  })
  
  io.to(`user:${userId}`).emit('copy-operation:update', {
    type: 'update',
    operation: operation
  })
}

export function emitSystemAlert(message: string, severity: 'info' | 'warning' | 'error' = 'info') {
  if (!io) return
  
  io.emit('system:alert', {
    message,
    severity,
    timestamp: new Date().toISOString()
  })
}

export function getConnectedUsersCount(): number {
  if (!io) return 0
  return io.engine.clientsCount
}

export function getWebSocketServer() {
  return io
}
