import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Trip, TripPreferences, AgentInfo, DayPlan, Destination, BudgetBreakdown, Route, WeatherForecast, LocalExperience, Companion, AgentStatus, TripStatus } from '@/types';

interface TripState {
  // Current trip being worked on
  currentTrip: Trip | null;
  // All saved trips
  savedTrips: Trip[];
  // Loading states
  isGenerating: boolean;
  generationProgress: number;
  // Agent states
  agents: AgentInfo[];
  // Auth state
  isAuthenticated: boolean;
  userId: string | null;
  // UI state
  activeTab: string;
  sidebarOpen: boolean;
  // Guest mode
  isGuest: boolean;
  // User memory
  userPreferences: Partial<TripPreferences>;

  // Actions
  setCurrentTrip: (trip: Trip | null) => void;
  updateTrip: (updates: Partial<Trip>) => void;
  addSavedTrip: (trip: Trip) => void;
  removeSavedTrip: (tripId: string) => void;
  setSavedTrips: (trips: Trip[]) => void;
  setGenerating: (value: boolean) => void;
  setGenerationProgress: (value: number) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus, progress: number, outputSummary?: string) => void;
  setAgents: (agents: AgentInfo[]) => void;
  setAuthenticated: (value: boolean, userId?: string) => void;
  setGuest: (value: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (value: boolean) => void;
  updateUserPreferences: (prefs: Partial<TripPreferences>) => void;
  lockDay: (day: number) => void;
  unlockDay: (day: number) => void;
  updateDayPlan: (day: number, updates: Partial<DayPlan>) => void;
  resetCurrentTrip: () => void;
}

const defaultAgents: AgentInfo[] = [
  { id: 'intent', name: 'Intent Agent', icon: '🎯', description: 'Parsing your travel intentions', status: 'idle', progress: 0 },
  { id: 'destination', name: 'Destination Agent', icon: '🌍', description: 'Finding perfect destinations', status: 'idle', progress: 0 },
  { id: 'budget', name: 'Budget Agent', icon: '💰', description: 'Allocating your budget', status: 'idle', progress: 0 },
  { id: 'route', name: 'Route Agent', icon: '🗺️', description: 'Planning optimal routes', status: 'idle', progress: 0 },
  { id: 'stay', name: 'Stay Agent', icon: '🏨', description: 'Finding best accommodations', status: 'idle', progress: 0 },
  { id: 'activities', name: 'Activities Agent', icon: '🎪', description: 'Curating activities', status: 'idle', progress: 0 },
  { id: 'weather', name: 'Weather Agent', icon: '🌤️', description: 'Checking weather conditions', status: 'idle', progress: 0 },
  { id: 'local', name: 'Local Experience Agent', icon: '🍜', description: 'Discovering local gems', status: 'idle', progress: 0 },
  { id: 'group', name: 'Group Agent', icon: '👥', description: 'Reconciling group preferences', status: 'idle', progress: 0 },
  { id: 'supervisor', name: 'Supervisor Agent', icon: '⭐', description: 'Validating and finalizing plan', status: 'idle', progress: 0 },
];

const initialPreferences: TripPreferences = {
  destinationIdea: '',
  startDate: '',
  endDate: '',
  duration: 5,
  budget: 50000,
  currency: 'INR',
  travelers: 1,
  tripType: 'relaxed',
  pace: 'balanced',
  foodPreferences: [],
  transportPreference: 'mixed',
  climatePreference: 'any',
  accessibilityNeeds: [],
  companions: [],
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      currentTrip: null,
      savedTrips: [],
      isGenerating: false,
      generationProgress: 0,
      agents: defaultAgents,
      isAuthenticated: false,
      userId: null,
      activeTab: 'itinerary',
      sidebarOpen: true,
      isGuest: false,
      userPreferences: {},

      setCurrentTrip: (trip) => set({ currentTrip: trip }),
      
      updateTrip: (updates) => set((state) => ({
        currentTrip: state.currentTrip ? { ...state.currentTrip, ...updates } : null,
      })),

      addSavedTrip: (trip) => set((state) => ({
        savedTrips: [trip, ...state.savedTrips],
      })),

      removeSavedTrip: (tripId) => set((state) => ({
        savedTrips: state.savedTrips.filter((t) => t.id !== tripId),
      })),

      setSavedTrips: (trips) => set({ savedTrips: trips }),

      setGenerating: (value) => set({ isGenerating: value }),

      setGenerationProgress: (value) => set({ generationProgress: value }),

      updateAgentStatus: (agentId, status, progress, outputSummary) => set((state) => ({
        agents: state.agents.map((a) =>
          a.id === agentId ? { ...a, status, progress, outputSummary: outputSummary || a.outputSummary } : a
        ),
      })),

      setAgents: (agents) => set({ agents }),

      setAuthenticated: (value, userId) => set({ isAuthenticated: value, userId: userId || null }),

      setGuest: (value) => set({ isGuest: value }),

      setActiveTab: (tab) => set({ activeTab: tab }),

      setSidebarOpen: (value) => set({ sidebarOpen: value }),

      updateUserPreferences: (prefs) => set((state) => ({
        userPreferences: { ...state.userPreferences, ...prefs },
      })),

      lockDay: (day) => set((state) => ({
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              itinerary: state.currentTrip.itinerary.map((d) =>
                d.day === day ? { ...d, locked: true } : d
              ),
            }
          : null,
      })),

      unlockDay: (day) => set((state) => ({
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              itinerary: state.currentTrip.itinerary.map((d) =>
                d.day === day ? { ...d, locked: false } : d
              ),
            }
          : null,
      })),

      updateDayPlan: (day, updates) => set((state) => ({
        currentTrip: state.currentTrip
          ? {
              ...state.currentTrip,
              itinerary: state.currentTrip.itinerary.map((d) =>
                d.day === day ? { ...d, ...updates } : d
              ),
            }
          : null,
      })),

      resetCurrentTrip: () => set({
        currentTrip: null,
        isGenerating: false,
        generationProgress: 0,
        agents: defaultAgents,
      }),
    }),
    {
      name: 'zentrip-storage',
      partialize: (state) => ({
        savedTrips: state.savedTrips,
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        isGuest: state.isGuest,
        userPreferences: state.userPreferences,
      }),
    }
  )
);
