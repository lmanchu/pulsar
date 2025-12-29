import { getSupabaseAdmin } from './client.js'

// User Queries
export async function getUserById(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Persona Queries
export async function getPersonasByUserId(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

export async function getPersonaById(personaId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', personaId)
    .single()

  if (error) throw error
  return data
}

// Content Job Queries
export async function createContentJob(job: {
  userId: string
  platform: string
  type: string
  personaId: string
  targetUrl?: string
}) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('content_jobs')
    .insert({
      user_id: job.userId,
      platform: job.platform,
      type: job.type,
      persona_id: job.personaId,
      target_url: job.targetUrl,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateContentJobStatus(
  jobId: string,
  status: string,
  content?: string,
  error?: string
) {
  const supabase = getSupabaseAdmin()
  const { data, error: dbError } = await supabase
    .from('content_jobs')
    .update({
      status,
      content,
      error,
      ...(status === 'completed' ? { posted_at: new Date().toISOString() } : {}),
    })
    .eq('id', jobId)
    .select()
    .single()

  if (dbError) throw dbError
  return data
}

export async function getPendingJobs(limit = 10) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('content_jobs')
    .select('*, personas(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}

// Tracked Account Queries
export async function getTrackedAccounts(userId: string, platform?: string) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('tracked_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// Daily Stats Queries
export async function getDailyStats(userId: string, date: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data
}

export async function incrementDailyStat(
  userId: string,
  date: string,
  platform: string,
  type: 'posts' | 'replies'
) {
  const supabase = getSupabaseAdmin()

  // Upsert daily stats
  const { error } = await supabase.rpc('increment_daily_stat', {
    p_user_id: userId,
    p_date: date,
    p_platform: platform,
    p_type: type,
  })

  if (error) throw error
}
