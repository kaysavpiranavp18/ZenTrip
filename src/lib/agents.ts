import type {
  TripPreferences, Destination, BudgetBreakdown, BudgetItem, Route, RouteSegment,
  StayOption, Activity, DayPlan, WeatherForecast, LocalExperience, AgentInfo, Trip, AgentStatus,
  TripMode, FitLabel, TripConstraints, GroundedDestination, NearbyPlace
} from '@/types';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { safeGroqCall, FAST_MODEL, COMPLEX_MODEL } from './groq';
import {
  INTENT_SYSTEM, PLACE_RESOLVER_SYSTEM, DESTINATION_GROUNDING_SYSTEM, BUDGET_SYSTEM,
  ROUTE_SYSTEM, ACTIVITIES_SYSTEM, PLANNER_SYSTEM, SUPERVISOR_SYSTEM
} from './prompts';
import { fetchWeatherForCity } from './weatherService';

const MAX_RETRIES = 1;

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// ===== 1. Intent Agent =====
export async function intentAgent(input: string): Promise<Partial<TripPreferences>> {
  return await safeGroqCall<Partial<TripPreferences>>(
    {
      system: INTENT_SYSTEM,
      user: `Parse this travel request:\n\n"${input}"`,
      model: FAST_MODEL,
      temperature: 0.1,
    },
    { destinationIdea: input, duration: 3, budget: 15000, travelers: 2, tripType: 'relaxed', pace: 'balanced', transportPreference: 'mixed', climatePreference: 'any', foodPreferences: [], tripMode: 'weekend', strictDestination: false },
    'Intent'
  );
}

// ===== 2. Place Resolver Agent =====
export async function placeResolverAgent(destinationIdea: string): Promise<{ normalizedName: string; country: string; isValid: boolean; type: string }> {
  return await safeGroqCall(
    {
      system: PLACE_RESOLVER_SYSTEM,
      user: `Resolve this destination: "${destinationIdea}"`,
      model: FAST_MODEL,
      temperature: 0.1,
    },
    { normalizedName: destinationIdea, country: 'India', isValid: true, type: 'city' },
    'Place Resolver'
  );
}

// ===== 3. Destination Grounding Agent =====
export async function destinationGroundingAgent(resolvedPlace: string, constraints: TripConstraints): Promise<GroundedDestination> {
  return await safeGroqCall<GroundedDestination>(
    {
      system: DESTINATION_GROUNDING_SYSTEM,
      user: `Ground this destination: "${resolvedPlace}". Max radius allowed: ${constraints.maxRadius}km.`,
      model: COMPLEX_MODEL,
      temperature: 0.2,
    },
    { destination: resolvedPlace, nearbyPlaces: [] },
    'Destination Grounding'
  );
}

// ===== 4. Constraint Engine (Deterministic) =====
export function computeConstraints(prefs: TripPreferences): TripConstraints {
  let maxRadius = 150;
  if (prefs.tripMode === 'local') maxRadius = 30;
  if (prefs.tripMode === 'weekend') maxRadius = 80;

  // Dynamic budget allocation defaults based on mode
  let stayPct = 0.35, foodPct = 0.15, activitiesPct = 0.20, transportPct = 0.20;
  if (prefs.tripMode === 'local') {
    stayPct = 0.20; activitiesPct = 0.30; transportPct = 0.15; foodPct = 0.25;
  } else if (prefs.transportPreference === 'car' || prefs.tripMode === 'multi_city') {
    transportPct = 0.35; stayPct = 0.30; activitiesPct = 0.10;
  }
  if (prefs.tripType === 'luxury') {
    stayPct = 0.45; transportPct = 0.15; activitiesPct = 0.15; foodPct = 0.15;
  }

  const budget = prefs.budget;
  let stayBudget = Math.round(budget * stayPct);
  let activityBudget = Math.round(budget * activitiesPct);
  let foodBudget = Math.round(budget * foodPct);
  let transportBudget = Math.round(budget * transportPct);
  let buffer = Math.round(budget * 0.10);

  const minStayPerNight = 800 * Math.ceil(prefs.travelers / 2);
  const minStayTotal = minStayPerNight * prefs.duration;

  if (stayBudget < minStayTotal) {
    stayBudget = minStayTotal;
    const remaining = Math.max(0, budget - stayBudget);
    activityBudget = Math.round(remaining * 0.4);
    foodBudget = Math.round(remaining * 0.4);
    transportBudget = Math.round(remaining * 0.1);
    buffer = Math.round(remaining * 0.1);
  }

  return {
    maxTravelHoursPerDay: 4,
    maxActivitiesPerDay: 3,
    maxCategoryShare: 0.5,
    stayBudget,
    activityBudget,
    foodBudget,
    transportBudget,
    buffer,
    maxRadius
  };
}

// ===== 5. Budget Agent =====
export async function budgetAgent(prefs: TripPreferences, constraints: TripConstraints): Promise<BudgetBreakdown> {
  const result = await safeGroqCall<BudgetBreakdown>(
    {
      system: BUDGET_SYSTEM,
      user: `Distribute budget of ₹${prefs.budget} based on these constraints: Stay ₹${constraints.stayBudget}, Food ₹${constraints.foodBudget}, Activities ₹${constraints.activityBudget}, Transport ₹${constraints.transportBudget}, Buffer ₹${constraints.buffer}.`,
      model: FAST_MODEL,
      temperature: 0.1,
    },
    {
      total: prefs.budget,
      allocated: prefs.budget,
      remaining: 0,
      items: [
        { category: 'stay', label: 'Accommodation', amount: constraints.stayBudget, currency: 'INR', notes: '' },
        { category: 'food', label: 'Meals', amount: constraints.foodBudget, currency: 'INR', notes: '' },
        { category: 'activities', label: 'Activities', amount: constraints.activityBudget, currency: 'INR', notes: '' },
        { category: 'transport', label: 'Transport', amount: constraints.transportBudget, currency: 'INR', notes: '' },
        { category: 'buffer', label: 'Buffer', amount: constraints.buffer, currency: 'INR', notes: '' }
      ],
      warnings: []
    },
    'Budget'
  );
  
  if (result.allocated > result.total) {
    result.warnings.push("Budget allocated exceeds total budget!");
  }
  return result;
}

// ===== 6. Route Agent =====
export async function routeAgent(grounded: GroundedDestination, prefs: TripPreferences, constraints: TripConstraints): Promise<Route> {
  const places = [grounded.destination, ...grounded.nearbyPlaces.map(p => p.name)].join(', ');
  return await safeGroqCall<Route>(
    {
      system: ROUTE_SYSTEM,
      user: `Plan a logical route between these places: ${places}. Max travel time per segment: ${constraints.maxTravelHoursPerDay} hours. Transport: ${prefs.transportPreference}.`,
      model: FAST_MODEL,
      temperature: 0.2,
    },
    {
      segments: [{ from: grounded.destination, to: grounded.destination, mode: 'car', duration: '0h', distance: '0km', cost: 0, notes: 'Local stay' }],
      totalDistance: '0km',
      totalDuration: '0h',
      warnings: []
    },
    'Route'
  );
}

// ===== 7. Weather Agent (Service call) =====
export async function weatherAgent(city: string, duration: number, startDate: string | null): Promise<WeatherForecast[]> {
  const data = await fetchWeatherForCity(city);
  // Ensure we have enough days
  const forecasts = [...data.forecasts];
  while (forecasts.length < duration) {
    forecasts.push({ ...forecasts[forecasts.length - 1], date: new Date(new Date(forecasts[forecasts.length - 1].date).getTime() + 86400000).toISOString().split('T')[0] });
  }
  return forecasts.slice(0, duration);
}

// ===== 8. Activities Agent =====
export async function activitiesAgent(grounded: GroundedDestination, prefs: TripPreferences, constraints: TripConstraints, weather: WeatherForecast[]): Promise<Activity[]> {
  const places = [grounded.destination, ...grounded.nearbyPlaces.map(p => p.name)].join(', ');
  const numActs = prefs.duration * constraints.maxActivitiesPerDay;
  const rainyDays = weather.filter(w => w.condition === 'rainy' || w.condition === 'stormy').length;
  const result = await safeGroqCall<{ activities: Activity[] }>(
    {
      system: ACTIVITIES_SYSTEM,
      user: `Generate EXACTLY ${numActs} distinct activities for: ${places}.
Trip context:
- Trip type: ${prefs.tripType}, pace: ${prefs.pace}, travelers: ${prefs.travelers}, duration: ${prefs.duration} days
- Food preferences: ${prefs.foodPreferences.length ? prefs.foodPreferences.join(', ') : 'none specified'} (include 1-2 food experiences if relevant)
- Activities budget: ₹${constraints.activityBudget} — the sum of all activity costs must stay within this
- Weather: ${rainyDays > 0 ? `${rainyDays} day(s) may be rainy/stormy — include indoor options with real indoorAlternatives` : 'generally clear'}
Assign each activity a unique id: "act-1", "act-2", ...`,
      model: COMPLEX_MODEL,
      temperature: 0.4,
      maxTokens: 8192,
    },
    { activities: [] }, // Provide a minimal fallback later if needed
    'Activities'
  );

  return (result.activities || []).map((a, i) => ({ ...a, id: a.id || `act-${i + 1}` }));
}

// ===== 9. Planner Agent =====
export async function plannerAgent(
  prefs: TripPreferences, grounded: GroundedDestination, constraints: TripConstraints, 
  route: Route, activities: Activity[], weather: WeatherForecast[]
): Promise<DayPlan[]> {
  const activityBrief = activities
    .map((a) => `- id:${a.id} | ${a.name} | ${a.type} | slot:${a.timeSlot} | ${a.duration} | ₹${a.cost}/person | @${a.location}${a.weatherDependent ? ` | weather-dependent (indoor alt: ${a.indoorAlternative || 'none'})` : ''}`)
    .join('\n');
  const dailyWeather = weather.map((w, i) => `Day ${i + 1} (${w.date}): ${w.condition}, ${w.tempLow}-${w.tempHigh}°C, ${w.precipitation}% rain`).join('; ') || 'unknown';

  const result = await safeGroqCall<{ days: DayPlan[] }>(
    {
      system: PLANNER_SYSTEM,
      user: `Construct a ${prefs.duration}-day itinerary for ${prefs.travelers} traveler(s). Trip type: ${prefs.tripType}, pace: ${prefs.pace}. Food preferences: ${prefs.foodPreferences.length ? prefs.foodPreferences.join(', ') : 'none specified'}.

Activities to schedule (assign EVERY id exactly once, in visit order within each day):
${activityBrief || '(no activities provided — build days around well-known local highlights)'}

Budgets: stay ₹${constraints.stayBudget} total (≈₹${Math.round(constraints.stayBudget / Math.max(1, prefs.duration))}/night), food ₹${constraints.foodBudget} total across ALL meals, transport ₹${constraints.transportBudget}.
Daily weather: ${dailyWeather}.
${prefs.startDate ? `Day 1 date: ${prefs.startDate}.` : ''}
Per-day meal times: breakfast ~08:00, lunch ~13:00, dinner ~20:00.`,
      model: COMPLEX_MODEL,
      temperature: 0.3,
      maxTokens: 8192,
    },
    { days: [] },
    'Planner'
  );

  const days = result.days || [];
  // Ensure we return exactly prefs.duration days, populating missing activities
  for (let i = 0; i < prefs.duration; i++) {
    if (!days[i]) {
      const date = prefs.startDate ? new Date(prefs.startDate) : null;
      if (date) date.setDate(date.getDate() + i);
      const dateStr = date ? date.toISOString().split('T')[0] : null;
      const mealBudget = Math.round(constraints.foodBudget / Math.max(1, prefs.duration));
      days.push({
        day: i + 1, date: dateStr, title: `Day ${i + 1} — ${grounded.destination} at your own pace`,
        description: `A flexible day in ${grounded.destination}: local food, easy sightseeing and time to wander.`,
        activities: [],
        meals: [
          { type: 'breakfast', suggestion: prefs.foodPreferences.length ? `Local breakfast spot serving ${prefs.foodPreferences[0]} options` : 'Local breakfast specialty near the stay', cost: Math.round(mealBudget * 0.3), time: '08:00' },
          { type: 'lunch', suggestion: 'Regional thali or set meal at a well-reviewed local eatery', cost: Math.round(mealBudget * 0.35), time: '13:00' },
          { type: 'dinner', suggestion: 'Popular local dinner spot — ask your host for the current favourite', cost: Math.round(mealBudget * 0.35), time: '20:00' },
        ],
        stay: {
          id: generateId(), name: `Local accommodation in ${grounded.destination}`, type: 'hotel', description: 'Comfortable stay', pricePerNight: Math.floor(constraints.stayBudget / prefs.duration), currency: 'INR', rating: 4, vibe: [], location: grounded.destination, amenities: [], score: 8, fitLabel: 'Acceptable'
        }, notes: 'Regenerate the itinerary for a fully tailored plan for this day.', locked: false, travelLoad: 'Low', walkingLoad: 'Low', dailyTransit: '<45 mins'
      });
    }
  }

  // Map activityIds back to actual activity objects if the planner only returned IDs, 
  // or trust the planner's embedded activities if provided. (The prompt asked for activityIds).
  let fallbackCursor = 0;
  return days.map(d => {
    // Some LLMs might embed the full activity. If not, map from IDs.
    let mappedActivities = (d as any).activityIds?.map((id: string) => activities.find(a => a.id === id)).filter(Boolean) || d.activities || [];
    if (mappedActivities.length === 0 && activities.length > 0) {
      // Fallback: assign remaining unassigned activities. Use slice (never splice) —
      // `activities` is graph state; mutating it corrupted the state on retries.
      mappedActivities = activities.slice(fallbackCursor, fallbackCursor + Math.min(3, activities.length));
      fallbackCursor += mappedActivities.length;
    }
    return {
      ...d,
      activities: mappedActivities,
      weather: weather[d.day - 1] || weather[0]
    };
  });
}

// ===== 10. Supervisor Agent =====
export async function supervisorAgent(
  prefs: TripPreferences, grounded: GroundedDestination, budget: BudgetBreakdown, route: Route, itinerary: DayPlan[]
): Promise<{ approved: boolean; regenerate: string[]; issues: string[]; confidenceScore: number; confidence: string; budgetFit: string; weatherFit: string; routeFit: string; }> {
  const allActivities = itinerary.flatMap((d) => d.activities || []);
  const categorySummary = Object.entries(
    allActivities.reduce<Record<string, number>>((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';
  const maxActivitiesPerDay = itinerary.reduce((m, d) => Math.max(m, (d.activities || []).length), 0);
  const activityNames = allActivities.map((a) => a.name).slice(0, 40).join('; ') || 'none';

  return await safeGroqCall(
    {
      system: SUPERVISOR_SYSTEM,
      user: `Validate this trip plan.
Destination: ${grounded.destination}${grounded.nearbyPlaces.length ? ` (+nearby: ${grounded.nearbyPlaces.map((p) => p.name).join(', ')})` : ''}.
Budget: ₹${budget.allocated} allocated vs ₹${budget.total} total.
Requested: ${prefs.duration}-day ${prefs.tripType} trip, pace ${prefs.pace}, ${prefs.travelers} traveler(s). Itinerary has ${itinerary.length} days.
Activities: ${allActivities.length} total (${categorySummary}); max ${maxActivitiesPerDay} on a single day.
Activity list: ${activityNames}
Travel times: ${route.segments.map((s) => `${s.from}→${s.to} ${s.duration}`).join(', ') || 'single-base trip'}.`,
      model: COMPLEX_MODEL,
      temperature: 0.1,
    },
    { approved: true, regenerate: [], issues: [], confidenceScore: 85, confidence: 'High Confidence', budgetFit: 'Good', weatherFit: 'High', routeFit: 'Excellent' },
    'Supervisor'
  );
}

// ===== Main Orchestrator =====
export async function generateTrip(
  preferences: TripPreferences,
  onAgentUpdate?: (agentId: string, status: AgentStatus, progress: number, output?: string) => void
): Promise<Trip> {
  const TripGraphState = Annotation.Root({
    preferences: Annotation<TripPreferences>(),
    nowIso: Annotation<string>(),
    mergedPrefs: Annotation<TripPreferences>(),
    resolvedPlace: Annotation<{ normalizedName: string; country: string; isValid: boolean; type: string }>(),
    groundedDestination: Annotation<GroundedDestination>(),
    constraints: Annotation<TripConstraints>(),
    budgetBreakdown: Annotation<BudgetBreakdown>(),
    route: Annotation<Route>(),
    weatherForecasts: Annotation<WeatherForecast[]>(),
    activities: Annotation<Activity[]>(),
    itinerary: Annotation<DayPlan[]>(),
    supervisorResult: Annotation<{ approved: boolean; regenerate: string[]; issues: string[]; confidenceScore: number; confidence: string; budgetFit: string; weatherFit: string; routeFit: string; }>(),
    retryCount: Annotation<number>()
  });

  const id = generateId();
  const now = new Date().toISOString();
  
  const updateAgent = (agentId: string, status: AgentStatus, progress: number, output?: string) => {
    onAgentUpdate?.(agentId, status, progress, output);
  };

  const graph = new StateGraph(TripGraphState)
    .addNode('intent', async (state) => {
      updateAgent('intent', 'analyzing', 10, 'Parsing your travel request...');
      const parsedPrefs = await intentAgent(state.preferences.destinationIdea);
      const mergedPrefs: TripPreferences = {
        ...parsedPrefs,
        ...state.preferences,
        destinationIdea: state.preferences.destinationIdea?.trim() || parsedPrefs.destinationIdea || '',
        tripMode: parsedPrefs.tripMode || state.preferences.tripMode || 'weekend',
      };
      updateAgent('intent', 'completed', 100, `Understood intent`);
      return { mergedPrefs, retryCount: state.retryCount || 0 };
    })
    .addNode('placeResolver', async (state) => {
      updateAgent('intent', 'analyzing', 50, 'Resolving place...'); // UI merges intent/resolver
      const resolvedPlace = await placeResolverAgent(state.mergedPrefs.destinationIdea);
      return { resolvedPlace };
    })
    .addNode('destinationGrounding', async (state) => {
      updateAgent('destination', 'analyzing', 20, 'Grounding destination...');
      const constraints = computeConstraints(state.mergedPrefs);
      const groundedDestination = await destinationGroundingAgent(state.resolvedPlace.normalizedName, constraints);
      updateAgent('destination', 'completed', 100, `Grounded: ${groundedDestination.destination}`);
      return { groundedDestination, constraints };
    })
    .addNode('budget', async (state) => {
      updateAgent('budget', 'analyzing', 15, 'Calculating budget...');
      const budgetBreakdown = await budgetAgent(state.mergedPrefs, state.constraints);
      updateAgent('budget', 'completed', 100, `Budget allocated: ₹${budgetBreakdown.total}`);
      return { budgetBreakdown };
    })
    .addNode('route_agent', async (state) => {
      updateAgent('route', 'generating', 30, 'Planning optimal route...');
      const route = await routeAgent(state.groundedDestination, state.mergedPrefs, state.constraints);
      updateAgent('route', 'completed', 100, `Route planned`);
      return { route };
    })
    .addNode('weather', async (state) => {
      updateAgent('weather', 'analyzing', 15, 'Checking weather...');
      const weatherForecasts = await weatherAgent(state.groundedDestination.destination, state.mergedPrefs.duration, state.mergedPrefs.startDate);
      updateAgent('weather', 'completed', 100, `Weather checked`);
      return { weatherForecasts };
    })
    .addNode('activities_agent', async (state) => {
      updateAgent('activities', 'generating', 40, 'Curating activities...');
      const activities = await activitiesAgent(state.groundedDestination, state.mergedPrefs, state.constraints, state.weatherForecasts);
      updateAgent('activities', 'completed', 100, `${activities.length} activities curated`);
      return { activities };
    })
    .addNode('planner', async (state) => {
      updateAgent('planner', 'generating', 50, 'Building final itinerary...');
      const itinerary = await plannerAgent(state.mergedPrefs, state.groundedDestination, state.constraints, state.route, state.activities, state.weatherForecasts);
      updateAgent('planner', 'completed', 100, `Itinerary built`);
      return { itinerary };
    })
    .addNode('supervisor', async (state) => {
      updateAgent('supervisor', 'analyzing', 60, 'Validating plan...');
      const supervisorResult = await supervisorAgent(state.mergedPrefs, state.groundedDestination, state.budgetBreakdown, state.route, state.itinerary);
      updateAgent('supervisor', 'completed', 100, supervisorResult.approved ? 'Plan approved' : 'Plan needs adjustments');
      // Increment retryCount here (node returns persist to state). Incrementing it in
      // the router below has no effect — router state is a read-only snapshot.
      return { supervisorResult, retryCount: (state.retryCount ?? 0) + 1 };
    });

  graph.addEdge(START, 'intent')
    .addEdge('intent', 'placeResolver')
    .addEdge('placeResolver', 'destinationGrounding')
    .addEdge('destinationGrounding', 'budget')
    .addEdge('budget', 'route_agent')
    .addEdge('route_agent', 'weather')
    .addEdge('weather', 'activities_agent')
    .addEdge('activities_agent', 'planner')
    .addEdge('planner', 'supervisor');

  graph.addConditionalEdges('supervisor', (state) => {
    if (state.supervisorResult.approved) {
      return END;
    }
    // retryCount is persisted by the supervisor node; do NOT mutate it here —
    // router snapshots are read-only, so this previously looped forever and hit
    // the global generation timeout.
    if ((state.retryCount ?? 0) >= MAX_RETRIES) {
      return END;
    }
    const regen = state.supervisorResult.regenerate || [];
    if (regen.includes('budget')) return 'budget';
    if (regen.includes('route')) return 'route_agent';
    if (regen.includes('activities')) return 'activities_agent';
    if (regen.includes('planner')) return 'planner';
    return END;
  });

  const compiledGraph = graph.compile();

  // Execution Time Limits
  const MAX_TOTAL_TIME = 150000;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('Trip generation timed out')), MAX_TOTAL_TIME);
  });

  let graphResult: typeof TripGraphState.State;
  try {
    graphResult = await Promise.race([
      compiledGraph.invoke({ preferences, nowIso: now, retryCount: 0 }),
      timeoutPromise,
    ]) as typeof TripGraphState.State;
  } finally {
    // Always clear the timer so a completed run doesn't keep a dangling timer alive
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  const { mergedPrefs, groundedDestination, budgetBreakdown, route, weatherForecasts, activities, itinerary, supervisorResult } = graphResult;

  if (!mergedPrefs || !groundedDestination || !budgetBreakdown || !route || !weatherForecasts || !activities || !itinerary || !supervisorResult) {
    throw new Error('Orchestration failed to produce complete trip state');
  }

  const agents: AgentInfo[] = [
    { id: 'intent', name: 'Intent Agent', icon: '🎯', description: 'Parsing your travel intentions', status: 'completed', progress: 100, outputSummary: `Parsed: ${mergedPrefs.tripMode} trip` },
    { id: 'destination', name: 'Destination Grounding', icon: '🌍', description: 'Finding perfect destinations', status: 'completed', progress: 100, outputSummary: `Grounded to ${groundedDestination.destination}` },
    { id: 'budget', name: 'Budget Agent', icon: '💰', description: 'Allocating your budget', status: 'completed', progress: 100, outputSummary: `₹${budgetBreakdown.total} allocated` },
    { id: 'route', name: 'Route Agent', icon: '🗺️', description: 'Planning optimal routes', status: 'completed', progress: 100, outputSummary: `${route.segments.length} route segments` },
    { id: 'weather', name: 'Weather Agent', icon: '🌤️', description: 'Checking weather conditions', status: 'completed', progress: 100, outputSummary: `${weatherForecasts.length} day forecast` },
    { id: 'activities', name: 'Activities Agent', icon: '🎪', description: 'Curating activities', status: 'completed', progress: 100, outputSummary: `${activities.length} activities` },
    { id: 'planner', name: 'Itinerary Planner', icon: '📅', description: 'Building the daily timeline', status: 'completed', progress: 100, outputSummary: `${itinerary.length} days planned` },
    { id: 'supervisor', name: 'Supervisor Agent', icon: '⭐', description: 'Validating and finalizing plan', status: 'completed', progress: 100, outputSummary: `${supervisorResult.confidenceScore}% confidence` },
  ];

  // We need to map `GroundedDestination` into the legacy `Destination[]` format for the Trip object
  const destinations: Destination[] = [
    { id: generateId(), name: groundedDestination.destination, country: graphResult.resolvedPlace?.country || 'Unknown', description: 'Primary destination', score: 10, reasons: [], bestSeason: '', estimatedCost: 0, climate: 'any' },
    ...groundedDestination.nearbyPlaces.map((p) => ({
      id: generateId(), name: p.name, country: graphResult.resolvedPlace?.country || 'Unknown', description: p.reason, score: 8, reasons: [p.reason], bestSeason: '', estimatedCost: 0, climate: 'any'
    }))
  ];

  const finalTrip: Trip = {
    id,
    title: `${groundedDestination.destination} Adventure`,
    destinationSummary: groundedDestination.destination,
    startDate: mergedPrefs.startDate,
    endDate: mergedPrefs.endDate,
    duration: mergedPrefs.duration,
    budget: mergedPrefs.budget,
    travelers: mergedPrefs.travelers,
    status: 'completed',
    preferences: mergedPrefs,
    destinations,
    itinerary,
    budgetBreakdown,
    route,
    agents,
    weatherSnapshots: weatherForecasts,
    localExperiences: [],
    confidenceScore: supervisorResult.confidenceScore,
    confidence: supervisorResult.confidence || 'High Confidence',
    budgetFit: supervisorResult.budgetFit || 'Good',
    weatherFit: supervisorResult.weatherFit || 'High',
    routeFit: supervisorResult.routeFit || 'Excellent',
    warnings: supervisorResult.issues || [],
    createdAt: now,
    updatedAt: now,
    locked: false,
  };

  // ===== Validation Rule: Rejection throw should NOT occur here for the plan logic, 
  // since the supervisor conditionally handles regeneration, but we still ensure
  // structural integrity before rendering.
  const validateTripBeforeRendering = (t: Trip) => {
    if (!t.destinations || t.destinations.length === 0) throw new Error('TRIP VALIDATION ERROR: Destination is mandatory.');
    if (!t.itinerary || t.itinerary.length !== t.duration) throw new Error(`TRIP VALIDATION ERROR: Itinerary days count mismatch.`);
  };

  validateTripBeforeRendering(finalTrip);
  return finalTrip;
}
