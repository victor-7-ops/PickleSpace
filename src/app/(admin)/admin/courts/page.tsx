import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CourtActions } from '@/components/admin/CourtActions'

export default async function AdminCourtsPage() {
  const supabase = await createClient()

  const { data: courts } = await supabase
    .from('courts')
    .select('*, owner:users(name, email)')
    .order('created_at', { ascending: false })

  const pending  = (courts ?? []).filter(c => c.status === 'pending')
  const active   = (courts ?? []).filter(c => c.status === 'active')
  const inactive = (courts ?? []).filter(c => c.status === 'inactive')

  const statusVariant: Record<string, 'secondary' | 'outline' | 'destructive'> = {
    active:   'secondary',
    pending:  'outline',
    inactive: 'destructive',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pending.length} pending · {active.length} active · {inactive.length} inactive
        </p>
      </div>

      {/* Pending — action needed */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            ⏳ Pending Review ({pending.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pending.map(court => (
              <Card key={court.id} className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{court.name}</p>
                      <p className="text-sm text-muted-foreground">{court.address}, {court.city}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Owner: {(court.owner as { name?: string; email?: string } | null)?.name ?? '—'}
                        {' · '}{(court.owner as { name?: string; email?: string } | null)?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ₱{court.hourly_rate?.toLocaleString()}/hr
                        {court.amenities?.length > 0 && ` · ${court.amenities.join(', ')}`}
                      </p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                  {court.description && (
                    <p className="text-sm text-muted-foreground mb-3 italic">{court.description}</p>
                  )}
                  <CourtActions courtId={court.id} currentStatus="pending" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Active courts */}
      {active.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            ✅ Active ({active.length})
          </h2>
          <div className="flex flex-col gap-3">
            {active.map(court => (
              <Card key={court.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{court.name}</p>
                      <p className="text-sm text-muted-foreground">{court.city} · ₱{court.hourly_rate?.toLocaleString()}/hr</p>
                      <p className="text-xs text-muted-foreground">
                        {(court.owner as { email?: string } | null)?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[court.status] ?? 'outline'} className="capitalize">{court.status}</Badge>
                      <CourtActions courtId={court.id} currentStatus="active" compact />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Inactive courts */}
      {inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
            🚫 Inactive ({inactive.length})
          </h2>
          <div className="flex flex-col gap-3">
            {inactive.map(court => (
              <Card key={court.id} className="opacity-70">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{court.name}</p>
                      <p className="text-sm text-muted-foreground">{court.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Inactive</Badge>
                      <CourtActions courtId={court.id} currentStatus="inactive" compact />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(courts ?? []).length === 0 && (
        <p className="text-center text-muted-foreground py-12">No courts yet.</p>
      )}
    </div>
  )
}
