import { mongoose } from '../db.js';

const { Schema } = mongoose;

// A single reported claim, pinned to whoever said it. Never overwritten or
// merged with other claims — conflicting numbers for the same film/date
// just become more documents.
const collectionSchema = new Schema(
  {
    film: { type: Schema.Types.ObjectId, ref: 'Film', required: true },
    // Null location means the claim wasn't tied to a specific node in the
    // tree (e.g. a headline "worldwide gross" with no breakdown given).
    location: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    date: { type: Date, required: true },
    dayNumber: { type: Number },
    metricType: {
      type: String,
      enum: ['gross', 'net', 'share', 'footfalls', 'occupancy'],
      required: true,
    },
    scope: {
      type: String,
      enum: ['domestic', 'overseas', 'worldwide'],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    // True when `amount` is a running total as of `date`, false when it's
    // that single day's figure.
    isCumulative: { type: Boolean, default: false },
    source: { type: Schema.Types.ObjectId, ref: 'Source', required: true },
    claimant: { type: String, trim: true },
    notes: { type: String },
  },
  { timestamps: true }
);

collectionSchema.index({ film: 1, date: 1 });
collectionSchema.index({ location: 1, date: 1 });

export default mongoose.models.Collection || mongoose.model('Collection', collectionSchema);
