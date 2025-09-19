'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { encryptCredentials } from '@/lib/encryption'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Server, Activity, AlertCircle, CheckCircle, Edit, Trash2 } from 'lucide-react'

interface MTAccount {
  id: string
  account_login: string
  server_name: string
  platform: 'MT4' | 'MT5'
  account_type: 'demo' | 'live'
  role: 'master' | 'slave'
  broker_name: string | null
  balance: number
  equity: number
  is_active: boolean
  last_connected_at: string | null
  vps_container_id: string | null
  created_at: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<MTAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    account_login: '',
    account_password: '',
    server_name: '',
    platform: 'MT4' as 'MT4' | 'MT5',
    account_type: 'demo' as 'demo' | 'live',
    role: 'slave' as 'master' | 'slave',
    broker_name: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('mt_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching accounts:', error)
        return
      }

      setAccounts((data || []) as MTAccount[])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Encrypt the credentials
      const encryptedPassword = encryptCredentials({
        login: formData.account_login,
        password: formData.account_password,
        server: formData.server_name
      })

      const { data, error } = await supabase
        .from('mt_accounts')
        .insert({
          user_id: user.id,
          account_login: formData.account_login,
          account_password_encrypted: encryptedPassword,
          server_name: formData.server_name,
          platform: formData.platform,
          account_type: formData.account_type,
          role: formData.role,
          broker_name: formData.broker_name || null,
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
        return
      }

      // Reset form and refresh accounts
      setFormData({
        account_login: '',
        account_password: '',
        server_name: '',
        platform: 'MT4',
        account_type: 'demo',
        role: 'slave',
        broker_name: ''
      })
      setShowAddForm(false)
      fetchAccounts()

      // TODO: Trigger VPS deployment for this account
      console.log('Account added, should trigger VPS deployment:', data)
    } catch {
      setError('Failed to add account')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const { error } = await supabase
        .from('mt_accounts')
        .delete()
        .eq('id', accountId)

      if (error) {
        console.error('Error deleting account:', error)
        return
      }

      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const getStatusIcon = (account: MTAccount) => {
    if (!account.is_active) {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    }
    if (account.last_connected_at) {
      const lastConnected = new Date(account.last_connected_at)
      const now = new Date()
      const diffMinutes = (now.getTime() - lastConnected.getTime()) / (1000 * 60)
      
      if (diffMinutes < 5) {
        return <CheckCircle className="h-4 w-4 text-green-500" />
      } else if (diffMinutes < 30) {
        return <Activity className="h-4 w-4 text-yellow-500" />
      }
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MT4/MT5 Accounts</h1>
          <p className="text-gray-600">Manage your trading accounts and connections</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New MT4/MT5 Account</CardTitle>
            <CardDescription>
              Connect your trading account to start copying trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddAccount} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Login</label>
                  <Input
                    type="text"
                    value={formData.account_login}
                    onChange={(e) => setFormData({ ...formData, account_login: e.target.value })}
                    required
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Input
                    type="password"
                    value={formData.account_password}
                    onChange={(e) => setFormData({ ...formData, account_password: e.target.value })}
                    required
                    placeholder="Your account password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Server</label>
                  <Input
                    type="text"
                    value={formData.server_name}
                    onChange={(e) => setFormData({ ...formData, server_name: e.target.value })}
                    required
                    placeholder="BrokerName-Demo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Broker Name</label>
                  <Input
                    type="text"
                    value={formData.broker_name}
                    onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })}
                    placeholder="e.g. IC Markets, OANDA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as 'MT4' | 'MT5' })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="MT4">MetaTrader 4</option>
                    <option value="MT5">MetaTrader 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value as 'demo' | 'live' })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="demo">Demo Account</option>
                    <option value="live">Live Account</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'slave' })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="slave">Slave (Copy trades to this account)</option>
                    <option value="master">Master (Copy trades from this account)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Adding...' : 'Add Account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Accounts List */}
      <div className="grid gap-6">
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-gray-500 text-center mb-4">
                Add your first MT4 or MT5 account to start copying trades
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(account)}
                    <div>
                      <CardTitle className="text-lg">
                        {account.broker_name || 'Unknown Broker'} - {account.account_login}
                      </CardTitle>
                      <CardDescription>
                        {account.platform} • {account.account_type} • {account.role}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className="text-lg font-semibold">${account.balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Equity</p>
                    <p className="text-lg font-semibold">${account.equity.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Server</p>
                    <p className="text-sm font-medium">{account.server_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Connected</p>
                    <p className="text-sm font-medium">
                      {account.last_connected_at
                        ? new Date(account.last_connected_at).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
                {account.vps_container_id && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <Server className="h-4 w-4 inline mr-1" />
                      Running on VPS: {account.vps_container_id}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
