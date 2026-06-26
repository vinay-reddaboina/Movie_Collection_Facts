import { mongoose } from '../db.js';

const { Schema } = mongoose;

// Ancestors-array tree pattern: each node denormalizes its full lineage so
// "give me everything under this state" is a single indexed query
// (`ancestors._id`) instead of a recursive walk.
const ancestorSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['theatre', 'city', 'state', 'country', 'worldwide'],
      required: true,
    },
    parent: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
    ancestors: { type: [ancestorSchema], default: [] },
    // Theatre-level capacity facts used directly by the estimation engine.
    screenCount: { type: Number },
    totalSeats: { type: Number },
  },
  { timestamps: true }
);

locationSchema.index({ 'ancestors._id': 1 });
locationSchema.index({ parent: 1 });
locationSchema.index({ type: 1, name: 1 });

export default mongoose.models.Location || mongoose.model('Location', locationSchema);
