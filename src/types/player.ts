export interface PlayerCore {
  id: string;
  first: string;
  last: string;
  index: number;
  ghin?: string;
  avatarUrl?: string;   // forward-compatible
}

export type Team = 'red' | 'blue';
export interface MatchRoster { 
  red: string[]; 
  blue: string[]; 
} 