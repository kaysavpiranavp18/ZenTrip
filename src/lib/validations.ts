import { z } from 'zod';

// ===== Enums matching TripPreferences types =====
const tripTypeEnum = z.enum([
  'relaxed', 'adventurous', 'romantic', 'family', 'solo',
  'workcation', 'spiritual', 'luxury', 'budget', 'cultural'
]);

const paceEnum = z.enum(['relaxed', 'balanced', 'packed']);
const transportEnum = z.enum(['flight', 'train', 'bus', 'car', 'mixed']);
const climateEnum = z.enum(['tropical', 'cold', 'temperate', 'any']);

// ===== Companion Schema =====
const companionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Companion name is required'),
  preferences: z.record(z.string(), z.unknown()).optional(),
  votes: z.record(z.string(), z.string()).optional(),
});

// ===== Full Trip Preferences Schema =====
export const tripPreferencesSchema = z.object({
  destinationIdea: z
    .string()
    .min(3, 'Tell us a bit more about where you want to go (at least 3 characters)')
    .max(500, 'Destination idea is too long'),
  startDate: z
    .string()
    .min(1, 'Please select a start date')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid start date'),
  endDate: z
    .string()
    .min(1, 'Please select an end date')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    }, 'Invalid end date'),
  duration: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Trip must be at least 1 day')
    .max(30, 'Trip cannot exceed 30 days'),
  budget: z
    .number()
    .min(5000, 'Minimum budget is ₹5,000')
    .max(10000000, 'Budget seems too high — please check'),
  currency: z.string(),
  travelers: z
    .number()
    .int()
    .min(1, 'At least 1 traveler required')
    .max(50, 'Maximum 50 travelers'),
  tripType: tripTypeEnum,
  pace: paceEnum,
  foodPreferences: z.array(z.string()),
  transportPreference: transportEnum,
  climatePreference: climateEnum,
  accessibilityNeeds: z.array(z.string()),
  companions: z.array(companionSchema),
});

// ===== Per-step schemas for progressive validation =====
// Step 0: Destination idea
export const step0Schema = z.object({
  destinationIdea: z
    .string()
    .min(3, 'Tell us a bit more about where you want to go (at least 3 characters)')
    .max(500, 'Destination idea is too long'),
});

// Step 1: Dates and duration
export const step1Schema = z.object({
  startDate: z
    .string()
    .min(1, 'Please select a start date')
    .refine((date) => !isNaN(new Date(date).getTime()), 'Invalid start date'),
  endDate: z
    .string()
    .min(1, 'Please select an end date')
    .refine((date) => !isNaN(new Date(date).getTime()), 'Invalid end date'),
  duration: z
    .number()
    .int()
    .min(1, 'Trip must be at least 1 day')
    .max(30, 'Trip cannot exceed 30 days'),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) > new Date(data.startDate);
  },
  { message: 'End date must be after start date', path: ['endDate'] }
);

// Step 2: Budget and travelers
export const step2Schema = z.object({
  budget: z
    .number()
    .min(5000, 'Minimum budget is ₹5,000')
    .max(10000000, 'Budget seems too high — please check'),
  travelers: z
    .number()
    .int()
    .min(1, 'At least 1 traveler required')
    .max(50, 'Maximum 50 travelers'),
});

// Step 3: Preferences (all have defaults, so minimal validation)
export const step3Schema = z.object({
  tripType: tripTypeEnum,
  pace: paceEnum,
  foodPreferences: z.array(z.string()),
  transportPreference: transportEnum,
  climatePreference: climateEnum,
});

// ===== Type inference =====
export type TripFormData = z.input<typeof tripPreferencesSchema>;
