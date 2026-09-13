// ===== Core Trip Types =====

export type TripStatus = 'draft' | 'generating' | 'completed' | 'failed';
export type TripPace = 'relaxed' | 'balanced' | 'packed';
export type TripType = 'relaxed' | 'adventurous' | 'romantic' | 'family' | 'solo' | 'workcation' | 'spiritual' | 'luxury' | 'budget' | 'cultural';
export type TransportMode = 'flight' | 'train' | 'bus' | 'car' | 'mixed';
export type ClimatePref = 'tropical' | 'cold' | 'temperate' | 'any';
export type AgentStatus = 'idle' | 'analyzing' | 'generating' | 'completed' | 'warning' | 'error';
export type TripMode = 'local' | 'weekend' | 'multi_city';
export type FitLabel = 'Highly Recommended' | 'Recommended' | 'Acceptable' | 'Low Fit';

export interface TripPreferences {
  destinationIdea: string;
  startDate: string | null;
  endDate: string | null;
  duration: number;
  budget: number;
  currency: string;
  travelers: number;
  tripType: TripType;
  pace: TripPace;
  foodPreferences: string[];
  transportPreference: TransportMode;
  climatePreference: ClimatePref;
  accessibilityNeeds: string[];
  companions: Companion[];
  tripMode?: TripMode;
  strictDestination?: boolean;
}

export interface Companion {
  id: string;
  name: string;
  preferences?: Partial<TripPreferences>;
  votes?: Record<string, string>;
}

export interface TripConstraints {
  maxTravelHoursPerDay: number;
  maxActivitiesPerDay: number;
  maxCategoryShare: number;
  stayBudget: number;
  activityBudget: number;
  foodBudget: number;
  transportBudget: number;
  buffer: number;
  maxRadius: number; // in km
}

export interface NearbyPlace {
  name: string;
  distanceKm: number;
  travelMinutes: number;
  category: string;
  reason: string;
}

export interface GroundedDestination {
  destination: string;
  nearbyPlaces: NearbyPlace[];
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl?: string;
  score: number;
  reasons: string[];
  bestSeason: string;
  estimatedCost: number;
  climate: string;
}

export interface BudgetItem {
  category: 'transport' | 'stay' | 'food' | 'activities' | 'buffer' | 'other';
  label: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface BudgetBreakdown {
  total: number;
  allocated: number;
  remaining: number;
  items: BudgetItem[];
  warnings: string[];
}

export interface StayOption {
  id: string;
  name: string;
  type: 'hotel' | 'resort' | 'hostel' | 'homestay' | 'villa' | 'camp';
  description: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  vibe: string[];
  location: string;
  amenities: string[];
  imageUrl?: string;
  score: number;
  fitLabel?: FitLabel;
}

export interface Route {
  segments: RouteSegment[];
  totalDistance: string;
  totalDuration: string;
  warnings: string[];
}

export interface RouteSegment {
  from: string;
  to: string;
  mode: TransportMode;
  duration: string;
  distance: string;
  cost: number;
  notes?: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  type: 'outdoor' | 'indoor' | 'food' | 'cultural' | 'relaxation' | 'adventure' | 'nature' | 'nightlife';
  duration: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  cost: number;
  location: string;
  weatherDependent: boolean;
  indoorAlternative?: string;
  score: number;
  fitLabel?: FitLabel;
}

export interface DayPlan {
  day: number;
  date: string | null;
  title: string;
  description: string;
  activities: Activity[];
  meals: { type: 'breakfast' | 'lunch' | 'dinner'; suggestion: string; cost: number; time?: string }[];
  stay: StayOption;
  weather?: WeatherForecast;
  notes: string;
  locked: boolean;
  travelLoad?: string;
  walkingLoad?: string;
  dailyTransit?: string;
}

export interface WeatherForecast {
  date: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy';
  tempHigh: number;
  tempLow: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  advisory: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: AgentStatus;
  progress: number;
  outputSummary?: string;
}

export interface Trip {
  id: string;
  userId?: string;
  title: string;
  destinationSummary: string;
  startDate: string | null;
  endDate: string | null;
  duration: number;
  budget: number;
  travelers: number;
  status: TripStatus;
  preferences: TripPreferences;
  destinations: Destination[];
  itinerary: DayPlan[];
  budgetBreakdown: BudgetBreakdown;
  route: Route;
  agents: AgentInfo[];
  weatherSnapshots: WeatherForecast[];
  localExperiences: LocalExperience[];
  confidenceScore: number;
  confidence: string;
  budgetFit: string;
  weatherFit: string;
  routeFit: string;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
  shareId?: string;
  locked: boolean;
}

export interface LocalExperience {
  id: string;
  name: string;
  type: 'food' | 'culture' | 'nature' | 'event' | 'hidden_gem';
  description: string;
  location: string;
  bestTime: string;
  cost: number;
  score: number;
}

export interface UserMemory {
  id: string;
  userId: string;
  preferences: Partial<TripPreferences>;
  learnedTraits: string[];
  pastDestinations: string[];
  likes: string[];
  dislikes: string[];
  savedLocations: SavedLocation[];
}

export interface SavedLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes?: string;
}

export interface GroupVote {
  companionId: string;
  companionName: string;
  votes: Record<string, string | number>;
}

// ===== Agent Orchestration Types =====

export interface AgentTask {
  agentId: string;
  input: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
}

export interface OrchestrationPlan {
  tripId: string;
  tasks: AgentTask[];
  supervisorNotes: string[];
  status: 'running' | 'completed' | 'failed';
}

// ===== API Types =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TripCreateRequest {
  preferences: TripPreferences;
  userId?: string;
}

export interface TripRegenerateRequest {
  tripId: string;
  sections: ('destinations' | 'budget' | 'itinerary' | 'route' | 'stays' | 'activities')[];
  preferences?: Partial<TripPreferences>;
}

// ===== Chart Types =====

export interface BudgetChartData {
  name: string;
  value: number;
  color: string;
}
