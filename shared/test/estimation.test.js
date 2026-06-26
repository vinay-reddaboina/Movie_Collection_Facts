import { describe, it, expect } from 'vitest';
import {
  computeCeiling,
  computeShowCeiling,
  rollupCeilings,
  plausibilityScore,
  classifyPlausibility,
} from '../estimation/index.js';

describe('computeShowCeiling', () => {
  it('multiplies seats x price x occupancy', () => {
    expect(computeShowCeiling({ seats: 200, ticketPrice: 150, occupancy: 0.8 })).toBe(24000);
  });

  it('rejects occupancy outside 0-1', () => {
    expect(() => computeShowCeiling({ seats: 100, ticketPrice: 100, occupancy: 1.2 })).toThrow();
  });

  it('rejects negative seats', () => {
    expect(() => computeShowCeiling({ seats: -1, ticketPrice: 100, occupancy: 0.5 })).toThrow();
  });
});

describe('computeCeiling', () => {
  it('scales a uniform show pattern across the day', () => {
    const ceiling = computeCeiling({ seats: 200, shows: 4, ticketPrice: 150, occupancy: 0.8 });
    expect(ceiling).toBe(200 * 4 * 150 * 0.8);
  });

  it('sums an array of differing shows', () => {
    const ceiling = computeCeiling([
      { seats: 200, ticketPrice: 150, occupancy: 0.9 }, // premium evening show
      { seats: 200, ticketPrice: 100, occupancy: 0.4 }, // discounted morning show
    ]);
    expect(ceiling).toBe(200 * 150 * 0.9 + 200 * 100 * 0.4);
  });

  it('rejects negative show counts', () => {
    expect(() => computeCeiling({ seats: 100, shows: -2, ticketPrice: 100, occupancy: 0.5 })).toThrow();
  });
});

describe('rollupCeilings', () => {
  it('sums leaf ceilings up through every ancestor, per date', () => {
    const date = new Date('2025-01-10');
    const city = { _id: 'hyderabad', name: 'Hyderabad', type: 'city' };
    const state = { _id: 'telangana', name: 'Telangana', type: 'state' };
    const country = { _id: 'india', name: 'India', type: 'country' };

    const leaves = [
      { locationId: 'theatre-a', ancestors: [city, state, country], date, ceilingAmount: 50_000 },
      { locationId: 'theatre-b', ancestors: [city, state, country], date, ceilingAmount: 30_000 },
    ];

    const totals = rollupCeilings(leaves);
    const byLocation = Object.fromEntries(totals.map((t) => [t.locationId, t.ceilingAmount]));

    expect(byLocation['theatre-a']).toBe(50_000);
    expect(byLocation['theatre-b']).toBe(30_000);
    expect(byLocation['hyderabad']).toBe(80_000);
    expect(byLocation['telangana']).toBe(80_000);
    expect(byLocation['india']).toBe(80_000);
  });

  it('keeps different dates separate', () => {
    const country = { _id: 'india', name: 'India', type: 'country' };
    const leaves = [
      { locationId: 'theatre-a', ancestors: [country], date: new Date('2025-01-10'), ceilingAmount: 10_000 },
      { locationId: 'theatre-a', ancestors: [country], date: new Date('2025-01-11'), ceilingAmount: 20_000 },
    ];

    const totals = rollupCeilings(leaves);
    const india = totals.filter((t) => t.locationId === 'india');
    expect(india).toHaveLength(2);
    expect(india.map((t) => t.ceilingAmount).sort()).toEqual([10_000, 20_000]);
  });
});

describe('plausibilityScore / classifyPlausibility', () => {
  it('scores a claim under the ceiling as plausible', () => {
    const score = plausibilityScore(40_000, 80_000);
    expect(score).toBe(0.5);
    expect(classifyPlausibility(score)).toBe('plausible');
  });

  it('flags a claim above the ceiling as impossible', () => {
    const score = plausibilityScore(120_000, 80_000);
    expect(classifyPlausibility(score)).toBe('impossible');
  });

  it('rejects a non-positive ceiling', () => {
    expect(() => plausibilityScore(100, 0)).toThrow();
  });
});
