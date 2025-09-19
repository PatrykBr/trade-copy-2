import { createServerSupabaseClient } from './supabase-server'
import { redirect } from 'next/navigation'
import { TablesInsert } from './supabase-types'

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return profile
}

export async function createUserProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const supabase = await createServerSupabaseClient()
  
  const userData: TablesInsert<'users'> = {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name as string || null,
  }
  
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user profile:', error)
    return null
  }
  
  return data
}
