/**
 * Computes the physical maximum a single show could have grossed:
 * every seat sold, at the listed price, scaled by an occupancy assumption.
 */
export function computeShowCeiling({ seats, ticketPrice, occupancy }) {
  if (seats < 0 || ticketPrice < 0) {
    throw new Error('seats and ticketPrice must be non-negative');
  }
  if (occupancy < 0 || occupancy > 1) {
    throw new Error('occupancy must be a fraction between 0 and 1');
  }
  return seats * ticketPrice * occupancy;
}

/**
 * Computes a ceiling for a venue/date. Accepts either a uniform
 * {seats, shows, ticketPrice, occupancy} shape, or an array of individual
 * show records when shows differ in price/occupancy (e.g. a premium
 * evening show vs a discounted morning show at the same theatre).
 */
export function computeCeiling(input) {
  if (Array.isArray(input)) {
    return input.reduce((sum, show) => sum + computeShowCeiling(show), 0);
  }

  const { seats, shows, ticketPrice, occupancy } = input;
  if (shows < 0) {
    throw new Error('shows must be non-negative');
  }
  return shows * computeShowCeiling({ seats, ticketPrice, occupancy });
}
