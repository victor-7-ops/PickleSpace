import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/courts — list the authenticated owner's courts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ courts: data })
}

// POST /api/courts — create a new court
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // BUG-006 FIX: Verify the user is an owner, not a player
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only court owners can list courts' }, { status: 403 })
  }

  const body = await req.json()
  const { name, description, address, city, province, hourly_rate, amenities } = body

  if (!name?.trim() || !address?.trim() || !hourly_rate) {
    return NextResponse.json({ error: 'name, address, and hourly_rate are required' }, { status: 400 })
  }

  // BUG-008 FIX: Validate hourly_rate is a positive number
  const rate = Number(hourly_rate)
  if (isNaN(rate) || rate <= 0) {
    return NextResponse.json({ error: 'hourly_rate must be a positive number' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('courts')
    .insert({
      owner_id: user.id,
      name: name.trim(),
      description: description?.trim(),
      address: address.trim(),
      city: city ?? 'Cebu City',
      province: province ?? 'Cebu',
      hourly_rate: rate,
      amenities: amenities ?? [],
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ court: data }, { status: 201 })
}
