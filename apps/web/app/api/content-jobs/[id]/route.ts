import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('content_jobs')
      .select(`
        id,
        platform,
        job_type,
        target_url,
        target_content,
        generated_content,
        final_content,
        status,
        error_message,
        scheduled_at,
        posted_at,
        post_url,
        created_at,
        updated_at,
        persona:personas(id, name),
        social_account:social_accounts(id, username, platform)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching content job:', error)
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Error in GET /api/content-jobs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { final_content, status, scheduled_at } = body

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (final_content !== undefined) updates.final_content = final_content
    if (status !== undefined) updates.status = status
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Verify ownership and update
    const { data, error } = await supabase
      .from('content_jobs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        id,
        platform,
        job_type,
        target_url,
        generated_content,
        final_content,
        status,
        scheduled_at,
        updated_at,
        persona:personas(id, name)
      `)
      .single()

    if (error) {
      console.error('Error updating content job:', error)
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    console.error('Error in PATCH /api/content-jobs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('content_jobs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting content job:', error)
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/content-jobs/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
