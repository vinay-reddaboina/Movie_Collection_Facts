import { mongoose } from '../db.js';

const { Schema } = mongoose;

// A computed physical ceiling, not a claim. One row per film/location/date,
// produced entirely from public capacity data — no trade or production
// input goes into this number.
const estimateSchema = new Schema(
  {
    film: { type: Schema.Types.ObjectId, ref: 'Film', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    date: { type: Date, required: true },
    scope: {
      type: String,
      enum: ['domestic', 'overseas', 'worldwide'],
      required: true,
    },
    method: {
      seatsCounted: { type: Number, required: true },
      showsCounted: { type: Number, required: true },
      ticketPriceAvg: { type: Number, required: true },
      occupancyAssumed: { type: Number, required: true }, // 0-1 fraction
    },
    ceilingAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    budgetRange: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: 'INR' },
    },
    // Child location estimates summed to produce this one, for traceability
    // up the rollup the same way `sources` traces a claim.
    rolledUpFrom: [{ type: Schema.Types.ObjectId, ref: 'Estimate' }],
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

estimateSchema.index({ film: 1, date: 1, location: 1 }, { unique: true });

export default mongoose.models.Estimate || mongoose.model('Estimate', estimateSchema);
