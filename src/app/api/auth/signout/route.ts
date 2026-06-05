import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Redirect back to whichever login page the caller wants
  const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/login'
  return NextResponse.redirect(new URL(redirectTo, request.url))
}
