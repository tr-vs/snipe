export interface Profile {
  id: string
  email: string
  display_name: string
  created_at: string
}

export interface Game {
  id: string
  name: string
  created_by: string
  status: 'active' | 'ended'
  created_at: string
}

export interface GameMember {
  id: string
  game_id: string
  user_id: string
  score: number
  joined_at: string
  profile?: Profile
}

export interface Snipe {
  id: string
  game_id: string
  sniper_id: string
  photo_url: string
  sniped_id: string | null
  created_at: string
  sniper?: Profile
}
