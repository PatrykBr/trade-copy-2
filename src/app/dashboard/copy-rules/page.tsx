'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Copy, ArrowRight, Edit, Trash2, Play, Pause } from 'lucide-react'

interface CopyRule {
  id: string
  master_account_id: string
  slave_account_id: string
  lot_multiplier: number
  max_lot_size: number
  risk_percentage: number
  copy_pending_orders: boolean
  copy_stop_loss: boolean
  copy_take_profit: boolean
  symbol_filter: string[] | null
  magic_number_filter: number[] | null
  is_active: boolean
  created_at: string
  master_account?: {
    account_login: string
    broker_name: string | null
    platform: string
  }
  slave_account?: {
    account_login: string
    broker_name: string | null
    platform: string
  }
}

interface MTAccount {
  id: string
  account_login: string
  broker_name: string | null
  platform: string
  role: string
}

export default function CopyRulesPage() {
  const [copyRules, setCopyRules] = useState<CopyRule[]>([])
  const [accounts, setAccounts] = useState<MTAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    master_account_id: '',
    slave_account_id: '',
    lot_multiplier: 1.0,
    max_lot_size: 10.0,
    risk_percentage: 2.0,
    copy_pending_orders: true,
    copy_stop_loss: true,
    copy_take_profit: true,
    symbol_filter: '',
    magic_number_filter: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('mt_accounts')
        .select('id, account_login, broker_name, platform, role')
        .eq('user_id', user.id)

      setAccounts(accountsData || [])

      // Fetch copy rules with account details
      const { data: rulesData } = await supabase
        .from('copy_rules')
        .select(`
          *,
          master_account:mt_accounts!copy_rules_master_account_id_fkey(
            account_login,
            broker_name,
            platform
          ),
          slave_account:mt_accounts!copy_rules_slave_account_id_fkey(
            account_login,
            broker_name,
            platform
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setCopyRules(rulesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (formData.master_account_id === formData.slave_account_id) {
        setError('Master and slave accounts must be different')
        setFormLoading(false)
        return
      }

      // Parse symbol and magic number filters
      const symbolFilter = formData.symbol_filter
        ? formData.symbol_filter.split(',').map(s => s.trim()).filter(s => s)
        : null

      const magicNumberFilter = formData.magic_number_filter
        ? formData.magic_number_filter.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
        : null

      const { error } = await supabase
        .from('copy_rules')
        .insert({
          user_id: user.id,
          master_account_id: formData.master_account_id,
          slave_account_id: formData.slave_account_id,
          lot_multiplier: formData.lot_multiplier,
          max_lot_size: formData.max_lot_size,
          risk_percentage: formData.risk_percentage,
          copy_pending_orders: formData.copy_pending_orders,
          copy_stop_loss: formData.copy_stop_loss,
          copy_take_profit: formData.copy_take_profit,
          symbol_filter: symbolFilter,
          magic_number_filter: magicNumberFilter,
        })

      if (error) {
        setError(error.message)
        return
      }

      // Reset form and refresh data
      setFormData({
        master_account_id: '',
        slave_account_id: '',
        lot_multiplier: 1.0,
        max_lot_size: 10.0,
        risk_percentage: 2.0,
        copy_pending_orders: true,
        copy_stop_loss: true,
        copy_take_profit: true,
        symbol_filter: '',
        magic_number_filter: ''
      })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      setError('Failed to create copy rule')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('copy_rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId)

      if (error) {
        console.error('Error toggling rule:', error)
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this copy rule?')) return

    try {
      const { error } = await supabase
        .from('copy_rules')
        .delete()
        .eq('id', ruleId)

      if (error) {
        console.error('Error deleting rule:', error)
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const masterAccounts = accounts.filter(acc => acc.role === 'master')
  const slaveAccounts = accounts.filter(acc => acc.role === 'slave')

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
          <h1 className="text-2xl font-bold text-gray-900">Copy Rules</h1>
          <p className="text-gray-600">Configure how trades are copied between your accounts</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={masterAccounts.length === 0 || slaveAccounts.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Copy Rule
        </Button>
      </div>

      {/* Info Cards */}
      {(masterAccounts.length === 0 || slaveAccounts.length === 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <p className="text-yellow-800">
                You need at least one master account and one slave account to create copy rules.
                {masterAccounts.length === 0 && ' Add a master account first.'}
                {slaveAccounts.length === 0 && ' Add a slave account first.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Copy Rule</CardTitle>
            <CardDescription>
              Configure how trades will be copied from master to slave account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRule} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Account Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Master Account</label>
                  <select
                    value={formData.master_account_id}
                    onChange={(e) => setFormData({ ...formData, master_account_id: e.target.value })}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select master account</option>
                    {masterAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.broker_name || 'Unknown'} - {account.account_login} ({account.platform})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slave Account</label>
                  <select
                    value={formData.slave_account_id}
                    onChange={(e) => setFormData({ ...formData, slave_account_id: e.target.value })}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select slave account</option>
                    {slaveAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.broker_name || 'Unknown'} - {account.account_login} ({account.platform})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lot Multiplier</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.lot_multiplier}
                      onChange={(e) => setFormData({ ...formData, lot_multiplier: parseFloat(e.target.value) || 1 })}
                      placeholder="1.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Multiply master lot size by this factor</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Lot Size</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.max_lot_size}
                      onChange={(e) => setFormData({ ...formData, max_lot_size: parseFloat(e.target.value) || 10 })}
                      placeholder="10.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum lot size for copied trades</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Risk Percentage</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      value={formData.risk_percentage}
                      onChange={(e) => setFormData({ ...formData, risk_percentage: parseFloat(e.target.value) || 2 })}
                      placeholder="2.0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Risk per trade as % of account balance</p>
                  </div>
                </div>
              </div>

              {/* Copy Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Copy Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.copy_pending_orders}
                      onChange={(e) => setFormData({ ...formData, copy_pending_orders: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Copy pending orders</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.copy_stop_loss}
                      onChange={(e) => setFormData({ ...formData, copy_stop_loss: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Copy stop loss levels</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.copy_take_profit}
                      onChange={(e) => setFormData({ ...formData, copy_take_profit: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Copy take profit levels</span>
                  </label>
                </div>
              </div>

              {/* Filters */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filters (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Symbol Filter</label>
                    <Input
                      type="text"
                      value={formData.symbol_filter}
                      onChange={(e) => setFormData({ ...formData, symbol_filter: e.target.value })}
                      placeholder="EURUSD, GBPUSD, XAUUSD"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list of symbols to copy (leave empty for all)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Magic Number Filter</label>
                    <Input
                      type="text"
                      value={formData.magic_number_filter}
                      onChange={(e) => setFormData({ ...formData, magic_number_filter: e.target.value })}
                      placeholder="12345, 67890"
                    />
                    <p className="text-xs text-gray-500 mt-1">Comma-separated list of magic numbers to copy (leave empty for all)</p>
                  </div>
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
                  {formLoading ? 'Creating...' : 'Create Copy Rule'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Copy Rules List */}
      <div className="space-y-4">
        {copyRules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Copy className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No copy rules configured</h3>
              <p className="text-gray-500 text-center mb-4">
                Create your first copy rule to start copying trades between accounts
              </p>
              {masterAccounts.length > 0 && slaveAccounts.length > 0 && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Copy Rule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          copyRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>
                          {rule.master_account?.broker_name || 'Unknown'} - {rule.master_account?.account_login}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span>
                          {rule.slave_account?.broker_name || 'Unknown'} - {rule.slave_account?.account_login}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {rule.is_active ? 'Active' : 'Inactive'} • Created {new Date(rule.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    >
                      {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Lot Multiplier</p>
                    <p className="font-medium">{rule.lot_multiplier}x</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Max Lot Size</p>
                    <p className="font-medium">{rule.max_lot_size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Risk %</p>
                    <p className="font-medium">{rule.risk_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Copy Options</p>
                    <div className="flex space-x-1">
                      {rule.copy_pending_orders && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Pending</span>}
                      {rule.copy_stop_loss && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">SL</span>}
                      {rule.copy_take_profit && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">TP</span>}
                    </div>
                  </div>
                </div>
                
                {(rule.symbol_filter || rule.magic_number_filter) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Filters</h4>
                    {rule.symbol_filter && (
                      <p className="text-sm text-gray-600">
                        <strong>Symbols:</strong> {rule.symbol_filter.join(', ')}
                      </p>
                    )}
                    {rule.magic_number_filter && (
                      <p className="text-sm text-gray-600">
                        <strong>Magic Numbers:</strong> {rule.magic_number_filter.join(', ')}
                      </p>
                    )}
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
