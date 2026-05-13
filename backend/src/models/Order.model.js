const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:     String,
  price:    Number,
  quantity: Number,
});

const orderSchema = new mongoose.Schema({
  customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items:      [orderItemSchema],
  status:     {
    type: String,
    enum: ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'],
    default: 'pending',
  },
  deliveryAddress: {
    street: String, city: String, state: String, zipCode: String,
  },
  pricing: {
    subtotal:    Number,
    deliveryFee: Number,
    tax:         Number,
    total:       Number,
  },
  paymentMethod: { type: String, default: 'cash' },
  notes:         String,
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
