import { mongoose } from '../db.js';

const { Schema } = mongoose;

const filmSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    originalTitle: { type: String, trim: true },
    industry: {
      type: String,
      enum: ['Bollywood', 'Tollywood', 'Kollywood', 'Mollywood', 'Sandalwood', 'Other'],
      required: true,
    },
    languages: [{ type: String, trim: true }],
    releaseDate: { type: Date, required: true },
    runtimeMinutes: { type: Number },
    productionHouses: [{ type: String, trim: true }],
    budget: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: 'INR' },
    },
    posterUrl: { type: String },
    status: { type: String, enum: ['upcoming', 'released'], default: 'released' },
  },
  { timestamps: true }
);

filmSchema.index({ title: 1, releaseDate: 1 });

export default mongoose.models.Film || mongoose.model('Film', filmSchema);
