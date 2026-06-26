import { mongoose } from '../db.js';

const { Schema } = mongoose;

const sourceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['trade_analyst', 'news', 'production_self_report', 'official_registration', 'social_media', 'other'],
      required: true,
    },
    url: { type: String },
    claimant: { type: String, trim: true },
    datePulled: { type: Date, default: Date.now },
    // Recorded whenever a figure had to be currency-converted, so the
    // conversion itself is auditable rather than baked silently into the number.
    exchangeRate: {
      rate: { type: Number },
      fromCurrency: { type: String },
      toCurrency: { type: String },
      asOf: { type: Date },
    },
    reliabilityNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Source || mongoose.model('Source', sourceSchema);
