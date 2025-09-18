'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, TrendingUp, Users, Copy, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalAccounts: number
  activeAccounts: number
  totalTrades: number
  activeCopyRules: number
  todayProfitLoss: number
  systemStatus: 'healthy' | 'warning' | 'error'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalTrades: 0,
    activeCopyRules: 0,
    todayProfitLoss: 0,
    systemStatus: 'healthy'
  })
  const [loading, setLoading] = useState(true)
  const [recentTrades, setRecentTrades] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch account stats
        const { data: accounts } = await supabase
          .from('mt_accounts')
          .select('*')
          .eq('user_id', user.id)

        // Fetch copy rules stats
        const { data: copyRules } = await supabase
          .from('copy_rules')
          .select('*')
          .eq('user_id', user.id)

        // Fetch recent trades
        const { data: trades } = await supabase
          .from('trades')
          .select(`
            *,
            mt_accounts!inner(user_id)
          `)
          .eq('mt_accounts.user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        // Calculate stats
        const totalAccounts = accounts?.length || 0
        const activeAccounts = accounts?.filter(acc => acc.is_active).length || 0
        const activeCopyRules = copyRules?.filter(rule => rule.is_active).length || 0
        const totalTrades = trades?.length || 0

        // Calculate today's P&L
        const today = new Date().toISOString().split('T')[0]
        const todayTrades = trades?.filter(trade => 
          trade.close_time && trade.close_time.startsWith(today)
        ) || []
        const todayProfitLoss = todayTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)

        setStats({
          totalAccounts,
          activeAccounts,
          totalTrades,
          activeCopyRules,
          todayProfitLoss,
          systemStatus: 'healthy' // This would be determined by system health checks
        })

        setRecentTrades(trades || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Monitor your trading operations and system performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAccounts} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Copy Rules</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCopyRules}</div>
            <p className="text-xs text-muted-foreground">
              Active configurations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s P&L</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.todayProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.todayProfitLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Closed positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {stats.systemStatus === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Trade Copier Engine</span>
                <span className="text-sm text-green-600">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">VPS Infrastructure</span>
                <span className="text-sm text-green-600">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <span className="text-sm text-green-600">Connected</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">WebSocket</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/accounts">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Add MT4/MT5 Account
              </Button>
            </Link>
            <Link href="/dashboard/copy-rules">
              <Button variant="outline" className="w-full justify-start">
                <Copy className="h-4 w-4 mr-2" />
                Create Copy Rule
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Latest trading activity across your accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No trades yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Connect your MT4/MT5 accounts to start tracking trades
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      trade.trade_type.includes('BUY') ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{trade.symbol}</p>
                      <p className="text-sm text-gray-500">
                        {trade.trade_type} • {trade.lot_size} lots
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      (trade.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${(trade.profit || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
