const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },
  street:    String,
  city:      String,
  state:     String,
  zipCode:   String,
  isDefault: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6 },
  phone:     { type: String },
  role:      { type: String, enum: ['customer', 'restaurant_owner', 'admin'], default: 'customer' },
  avatar:    { type: String },
  addresses: [addressSchema],
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
