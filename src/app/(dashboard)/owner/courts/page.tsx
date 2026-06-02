import { createClient } from '@/lib/supabase/server'
import { CourtsList } from '@/components/owner/CourtsList'

export default async function CourtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })

  return <CourtsList courts={courts ?? []} />
}
