export type UserRole = 'owner' | 'player'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'open'
export type CourtStatus = 'active' | 'inactive' | 'pending'
export type SlotStatus = 'available' | 'held' | 'booked'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type PaymentMethod = 'gcash' | 'card' | 'cash'
export type GameStatus = 'open' | 'full' | 'cancelled' | 'completed'
export type GamePlayerStatus = 'joined' | 'waitlisted' | 'left'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  skill_level?: SkillLevel
  avatar_url?: string
  created_at: string
}

export interface Court {
  id: string
  owner_id: string
  name: string
  description?: string
  address: string
  city: string
  province: string
  lat?: number
  lng?: number
  hourly_rate: number
  amenities: string[]
  images: string[]
  status: CourtStatus
  created_at: string
  owner?: User
}

export interface Slot {
  id: string
  court_id: string
  date: string
  start_time: string
  end_time: string
  status: SlotStatus
  held_by?: string
  hold_expires_at?: string
  created_at: string
}

export interface Booking {
  id: string
  slot_id: string
  player_id: string
  court_id: string
  amount: number
  platform_fee: number
  payment_status: PaymentStatus
  payment_method?: PaymentMethod
  paymongo_link_id?: string
  paymongo_payment_id?: string
  qr_code: string
  booking_status: BookingStatus
  notes?: string
  created_at: string
  slot?: Slot
  court?: Court
  player?: User
}

export interface Game {
  id: string
  court_id: string
  slot_id?: string
  host_id: string
  title: string
  description?: string
  skill_level: SkillLevel
  max_players: number
  current_players: number
  status: GameStatus
  created_at: string
  court?: Court
  host?: User
  slot?: Slot
  game_players?: GamePlayer[]
}

export interface GamePlayer {
  id: string
  game_id: string
  player_id: string
  status: GamePlayerStatus
  joined_at: string
  player?: User
}
