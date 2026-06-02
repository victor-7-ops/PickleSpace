import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/slots/[id] — only owner of the court can delete; only if status = available
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: slot } = await supabase
    .from('slots')
    .select('status, court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const court = Array.isArray(slot.court) ? slot.court[0] : slot.court
  if ((court as { owner_id: string } | null)?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }
  if (slot.status !== 'available') {
    return NextResponse.json({ error: 'Cannot delete a held or booked slot' }, { status: 409 })
  }

  const { error } = await supabase.from('slots').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
