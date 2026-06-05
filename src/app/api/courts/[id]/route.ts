import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/courts/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data: existing } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = ['name', 'description', 'address', 'city', 'province', 'hourly_rate', 'amenities', 'images']
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  // Validate hourly_rate if being updated
  if ('hourly_rate' in updates) {
    const rate = Number(updates.hourly_rate)
    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({ error: 'hourly_rate must be a positive number' }, { status: 400 })
    }
    updates.hourly_rate = rate
  }

  const { data, error } = await supabase
    .from('courts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ court: data })
}

// DELETE /api/courts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase.from('courts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
