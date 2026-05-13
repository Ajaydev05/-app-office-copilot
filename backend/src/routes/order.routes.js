const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const Order  = require('../models/Order.model');
const Cart   = require('../models/Cart.model');
const Restaurant = require('../models/Restaurant.model');

// POST /api/orders
router.post('/', auth, role('customer'), async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || !cart.items.length) return res.status(400).json({ error: 'Cart is empty' });

    const restaurant = await Restaurant.findById(cart.restaurant);
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = restaurant.deliveryFee || 0;
    const tax = +(subtotal * 0.05).toFixed(2);

    const order = await Order.create({
      customer:        req.user._id,
      restaurant:      cart.restaurant,
      items:           cart.items,
      deliveryAddress: req.body.deliveryAddress,
      paymentMethod:   req.body.paymentMethod || 'cash',
      notes:           req.body.notes,
      pricing:         { subtotal, deliveryFee, tax, total: subtotal + deliveryFee + tax },
    });

    await Cart.findOneAndDelete({ user: req.user._id });
    res.status(201).json({ success: true, order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/my
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find({ customer: req.user._id })
      .populate('restaurant', 'name logo')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/restaurant  (restaurant owner)
router.get('/restaurant', auth, role('restaurant_owner'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    const orders = await Order.find({ restaurant: restaurant._id })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name logo phone')
      .populate('customer', 'name email phone');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', auth, role('restaurant_owner'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/orders/:id/cancel
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.status))
      return res.status(400).json({ error: 'Cannot cancel at this stage' });
    order.status = 'cancelled';
    await order.save();
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
