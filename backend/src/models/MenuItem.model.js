const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurant:  { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name:        { type: String, required: true },
  description: String,
  price:       { type: Number, required: true },
  category:    { type: String, required: true },
  image:       String,
  isVeg:       { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  rating:      { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
