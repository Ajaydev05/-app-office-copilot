const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description:  String,
  cuisine:      [String],
  address: {
    street: String, city: String, state: String, zipCode: String,
    coordinates: { lat: Number, lng: Number },
  },
  phone:        String,
  email:        String,
  logo:         String,
  coverImage:   String,
  rating:       { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  deliveryTime: { type: Number, default: 30 },
  deliveryFee:  { type: Number, default: 0 },
  minOrder:     { type: Number, default: 0 },
  isOpen:       { type: Boolean, default: true },
  isActive:     { type: Boolean, default: true },
  isVerified:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
