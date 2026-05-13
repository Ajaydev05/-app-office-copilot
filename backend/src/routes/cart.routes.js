const router   = require('express').Router();
const auth     = require('../middleware/auth.middleware');
const Cart     = require('../models/Cart.model');
const MenuItem = require('../models/MenuItem.model');

router.get('/clear', auth, async (req, res) => {  // alias for DELETE
  try { await Cart.findOneAndDelete({ user: req.user._id }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem');
    res.json({ success: true, cart: cart || { items: [] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { menuItemId, quantity = 1 } = req.body;
    const menuItem = await MenuItem.findById(menuItemId);
    if (!menuItem) return res.status(404).json({ error: 'Item not found' });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, restaurant: menuItem.restaurant, items: [] });

    const existing = cart.items.find(i => i.menuItem.toString() === menuItemId);
    if (existing) existing.quantity += quantity;
    else cart.items.push({ menuItem: menuItemId, name: menuItem.name, price: menuItem.price, quantity });

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/item/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.quantity = req.body.quantity;
    if (item.quantity <= 0) cart.items.pull(item._id);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/clear', auth, async (req, res) => {
  try { await Cart.findOneAndDelete({ user: req.user._id }); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
