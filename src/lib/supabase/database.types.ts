// Manually maintained until `npx supabase login` + gen types is set up.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; email: string; phone: string | null; role: 'owner' | 'player'; skill_level: 'beginner' | 'intermediate' | 'advanced' | 'open' | null; avatar_url: string | null; created_at: string }
        Insert: { id: string; name: string; email: string; phone?: string | null; role?: 'owner' | 'player'; skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'open' | null; avatar_url?: string | null; created_at?: string }
        Update: { name?: string; email?: string; phone?: string | null; role?: 'owner' | 'player'; skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'open' | null; avatar_url?: string | null }
      }
      courts: {
        Row: { id: string; owner_id: string; name: string; description: string | null; address: string; city: string; province: string; lat: number | null; lng: number | null; hourly_rate: number; amenities: string[]; images: string[]; status: 'active' | 'inactive' | 'pending'; created_at: string }
        Insert: { id?: string; owner_id: string; name: string; description?: string | null; address: string; city?: string; province?: string; lat?: number | null; lng?: number | null; hourly_rate: number; amenities?: string[]; images?: string[]; status?: 'active' | 'inactive' | 'pending'; created_at?: string }
        Update: { name?: string; description?: string | null; address?: string; city?: string; province?: string; lat?: number | null; lng?: number | null; hourly_rate?: number; amenities?: string[]; images?: string[]; status?: 'active' | 'inactive' | 'pending' }
      }
      slots: {
        Row: { id: string; court_id: string; date: string; start_time: string; end_time: string; status: 'available' | 'held' | 'booked'; held_by: string | null; hold_expires_at: string | null; created_at: string }
        Insert: { id?: string; court_id: string; date: string; start_time: string; end_time: string; status?: 'available' | 'held' | 'booked'; held_by?: string | null; hold_expires_at?: string | null; created_at?: string }
        Update: { status?: 'available' | 'held' | 'booked'; held_by?: string | null; hold_expires_at?: string | null }
      }
      bookings: {
        Row: { id: string; slot_id: string; player_id: string; court_id: string; amount: number; platform_fee: number; payment_status: 'unpaid' | 'paid' | 'refunded'; payment_method: 'gcash' | 'card' | 'cash' | null; paymongo_link_id: string | null; paymongo_payment_id: string | null; qr_code: string; booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; notes: string | null; created_at: string }
        Insert: { id?: string; slot_id: string; player_id: string; court_id: string; amount: number; platform_fee: number; payment_status?: 'unpaid' | 'paid' | 'refunded'; payment_method?: 'gcash' | 'card' | 'cash' | null; paymongo_link_id?: string | null; paymongo_payment_id?: string | null; qr_code?: string; booking_status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'; notes?: string | null; created_at?: string }
        Update: { payment_status?: 'unpaid' | 'paid' | 'refunded'; payment_method?: 'gcash' | 'card' | 'cash' | null; paymongo_link_id?: string | null; paymongo_payment_id?: string | null; booking_status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' }
      }
      games: {
        Row: { id: string; court_id: string; slot_id: string | null; host_id: string; title: string; description: string | null; skill_level: 'beginner' | 'intermediate' | 'advanced' | 'open'; max_players: number; current_players: number; status: 'open' | 'full' | 'cancelled' | 'completed'; created_at: string }
        Insert: { id?: string; court_id: string; slot_id?: string | null; host_id: string; title: string; description?: string | null; skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'open'; max_players?: number; current_players?: number; status?: 'open' | 'full' | 'cancelled' | 'completed'; created_at?: string }
        Update: { title?: string; description?: string | null; skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'open'; max_players?: number; current_players?: number; status?: 'open' | 'full' | 'cancelled' | 'completed' }
      }
      game_players: {
        Row: { id: string; game_id: string; player_id: string; status: 'joined' | 'waitlisted' | 'left'; joined_at: string }
        Insert: { id?: string; game_id: string; player_id: string; status?: 'joined' | 'waitlisted' | 'left'; joined_at?: string }
        Update: { status?: 'joined' | 'waitlisted' | 'left' }
      }
    }
    Functions: {
      hold_slot: { Args: { p_slot_id: string; p_user_id: string }; Returns: Database['public']['Tables']['slots']['Row'] }
      confirm_booking: { Args: { p_booking_id: string; p_paymongo_payment_id: string }; Returns: Database['public']['Tables']['bookings']['Row'] }
    }
  }
}
