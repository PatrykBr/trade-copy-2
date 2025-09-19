import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase-server'
import { Database } from '@/lib/supabase-types'

type MTAccount = Database['public']['Tables']['mt_accounts']['Row']
import { decryptCredentials } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, action } = await request.json()

    if (!accountId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('mt_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    switch (action) {
      case 'deploy':
        return await deployAccount(account)
      case 'stop':
        return await stopAccount(account)
      case 'restart':
        return await restartAccount(account)
      case 'status':
        return await getAccountStatus(account)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in VPS API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function deployAccount(account: MTAccount) {
  try {
    // Find available VPS container
    const { data: availableContainer, error: containerError } = await supabaseAdmin
      .from('vps_containers')
      .select('*')
      .eq('status', 'active')
      .lt('account_count', 100) // Max 100 accounts per container
      .order('account_count', { ascending: true })
      .limit(1)
      .single()

    let containerId: string

    if (containerError || !availableContainer) {
      // Create new VPS container
      const newContainer = await createNewContainer()
      containerId = newContainer.container_id
    } else {
      containerId = availableContainer.container_id
    }

    // Decrypt account credentials
    const credentials = decryptCredentials(account.account_password_encrypted)

    // Deploy to container (this would be a real Docker/Kubernetes deployment)
    const deploymentResult = await deployToContainer(containerId, account)

    if (!deploymentResult.success) {
      throw new Error(deploymentResult.error)
    }

    // Update account with container info
    await supabaseAdmin
      .from('mt_accounts')
      .update({
        vps_container_id: containerId,
        is_active: true,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', account.id)

    // Update container account count
    await supabaseAdmin
      .from('vps_containers')
      .update({
        account_count: availableContainer ? (availableContainer.account_count ?? 0) + 1 : 1
      })
      .eq('container_id', containerId)

    // Log deployment event
    await supabaseAdmin
      .from('system_events')
      .insert({
        event_type: 'account_deployed',
        account_id: account.id,
        container_id: containerId,
        severity: 'info',
        message: `Account ${account.account_login} deployed to container ${containerId}`,
        metadata: {
          platform: account.platform,
          role: account.role,
          server: credentials.server,
        },
      })

    return NextResponse.json({
      success: true,
      containerId,
      message: 'Account deployed successfully'
    })

  } catch (error) {
    console.error('Error deploying account:', error)
    
    // Log deployment failure
    await supabaseAdmin
      .from('system_events')
      .insert({
        event_type: 'account_deployment_failed',
        account_id: account.id,
        severity: 'error',
        message: `Failed to deploy account ${account.account_login}: ${error}`,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      })

    return NextResponse.json({
      success: false,
      error: 'Failed to deploy account'
    }, { status: 500 })
  }
}

async function stopAccount(account: MTAccount) {
  try {
    if (!account.vps_container_id) {
      return NextResponse.json({ error: 'Account not deployed' }, { status: 400 })
    }

    // Stop container instance for this account
    const stopResult = await stopContainerInstance(account.vps_container_id, account.id)

    if (!stopResult.success) {
      throw new Error(stopResult.error)
    }

    // Update account status
    await supabaseAdmin
      .from('mt_accounts')
      .update({
        is_active: false,
        vps_container_id: null,
      })
      .eq('id', account.id)

    // Update container account count
    const { data: container } = await supabaseAdmin
      .from('vps_containers')
      .select('account_count')
      .eq('container_id', account.vps_container_id)
      .single()

    if (container) {
      await supabaseAdmin
        .from('vps_containers')
        .update({
          account_count: Math.max(0, (container.account_count ?? 1) - 1)
        })
        .eq('container_id', account.vps_container_id)
    }

    // Log stop event
    await supabaseAdmin
      .from('system_events')
      .insert({
        event_type: 'account_stopped',
        account_id: account.id,
        container_id: account.vps_container_id,
        severity: 'info',
        message: `Account ${account.account_login} stopped`,
      })

    return NextResponse.json({
      success: true,
      message: 'Account stopped successfully'
    })

  } catch (error) {
    console.error('Error stopping account:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to stop account'
    }, { status: 500 })
  }
}

async function restartAccount(account: MTAccount) {
  // Stop then deploy
  await stopAccount(account)
  return await deployAccount(account)
}

async function getAccountStatus(account: MTAccount) {
  try {
    if (!account.vps_container_id) {
      return NextResponse.json({
        status: 'not_deployed',
        message: 'Account not deployed to any container'
      })
    }

    // Get container status
    const { data: container, error } = await supabaseAdmin
      .from('vps_containers')
      .select('*')
      .eq('container_id', account.vps_container_id)
      .single()

    if (error || !container) {
      return NextResponse.json({
        status: 'error',
        message: 'Container not found'
      })
    }

    // Check actual container status (this would query Docker/Kubernetes)
    const containerStatus = await checkContainerStatus(account.vps_container_id, account.id)

    return NextResponse.json({
      status: containerStatus.status,
      message: containerStatus.message,
      container: {
        id: container.container_id,
        server_ip: container.server_ip,
        region: container.server_region,
        cpu_usage: container.cpu_usage,
        memory_usage: container.memory_usage,
        account_count: container.account_count,
      },
      last_connected: account.last_connected_at,
    })

  } catch (error) {
    console.error('Error getting account status:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get account status'
    }, { status: 500 })
  }
}

async function createNewContainer(): Promise<{ container_id: string }> {
  // This would create a new Docker container or Kubernetes pod
  // For now, we'll simulate this
  const containerId = `vps-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Create container record
  await supabaseAdmin
    .from('vps_containers')
    .insert({
      container_id: containerId,
      server_ip: '10.0.1.' + Math.floor(Math.random() * 254 + 1), // Simulated IP
      server_region: 'us-phoenix-1',
      status: 'active',
      account_count: 0,
    })

  return { container_id: containerId }
}

async function deployToContainer(containerId: string, accountData: MTAccount): Promise<{ success: boolean; error?: string }> {
  // This would deploy the MT4/MT5 EA to the container
  // For now, we'll simulate this
  console.log(`Deploying account ${accountData.account_login} to container ${containerId}`)
  
  // Simulate deployment time
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    return { success: true }
  } else {
    return { success: false, error: 'Container deployment failed' }
  }
}

async function stopContainerInstance(containerId: string, accountId: string): Promise<{ success: boolean; error?: string }> {
  // This would stop the specific account instance in the container
  console.log(`Stopping account ${accountId} in container ${containerId}`)
  
  // Simulate stop time
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return { success: true }
}

async function checkContainerStatus(containerId: string, accountId: string): Promise<{ status: string; message: string }> {
  // This would check the actual container status
  console.log(`Checking status for account ${accountId} in container ${containerId}`)
  
  // Simulate status check
  const statuses = [
    { status: 'running', message: 'Account is active and trading' },
    { status: 'connecting', message: 'Connecting to broker server' },
    { status: 'error', message: 'Connection failed - invalid credentials' },
    { status: 'idle', message: 'Connected but no trading activity' },
  ]
  
  return statuses[Math.floor(Math.random() * statuses.length)]
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get VPS containers status
    const { data: containers, error } = await supabaseAdmin
      .from('vps_containers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching containers:', error)
      return NextResponse.json({ error: 'Failed to fetch containers' }, { status: 500 })
    }

    // Get user's accounts with container info
    const { data: accounts, error: accountsError } = await supabase
      .from('mt_accounts')
      .select('id, account_login, vps_container_id, is_active, last_connected_at')
      .eq('user_id', user.id)

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return NextResponse.json({
      containers,
      accounts,
      summary: {
        total_containers: containers.length,
        active_containers: containers.filter(c => c.status === 'active').length,
        total_capacity: containers.reduce((sum, c) => sum + (c.max_accounts ?? 100), 0),
        used_capacity: containers.reduce((sum, c) => sum + (c.account_count ?? 0), 0),
      }
    })

  } catch (error) {
    console.error('Error in VPS GET API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
