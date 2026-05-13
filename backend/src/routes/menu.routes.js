const router   = require('express').Router();
const auth     = require('../middleware/auth.middleware');
const role     = require('../middleware/role.middleware');
const MenuItem = require('../models/MenuItem.model');
const Restaurant = require('../models/Restaurant.model');

// GET /api/menu/restaurant/:restaurantId
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const items = await MenuItem.find({ restaurant: req.params.restaurantId, isAvailable: true });
    res.json({ success: true, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/menu
router.post('/', auth, role('restaurant_owner'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) return res.status(404).json({ error: 'No restaurant found' });
    const item = await MenuItem.create({ ...req.body, restaurant: restaurant._id });
    res.status(201).json({ success: true, item });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/menu/:id
router.put('/:id', auth, role('restaurant_owner'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, item });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/menu/:id
router.delete('/:id', auth, role('restaurant_owner'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/menu/:id/toggle
router.patch('/:id/toggle', auth, role('restaurant_owner'), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json({ success: true, isAvailable: item.isAvailable });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
