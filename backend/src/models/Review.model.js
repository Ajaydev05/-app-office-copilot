const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  comment:    String,
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
