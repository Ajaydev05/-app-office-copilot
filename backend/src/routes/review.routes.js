const router     = require('express').Router();
const auth       = require('../middleware/auth.middleware');
const role       = require('../middleware/role.middleware');
const Review     = require('../models/Review.model');
const Restaurant = require('../models/Restaurant.model');

// POST /api/reviews
router.post('/', auth, role('customer'), async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, customer: req.user._id });
    // update restaurant rating
    const reviews = await Review.find({ restaurant: req.body.restaurant });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await Restaurant.findByIdAndUpdate(req.body.restaurant, { rating: avg.toFixed(1), totalReviews: reviews.length });
    res.status(201).json({ success: true, review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reviews/restaurant/:id
router.get('/restaurant/:id', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const reviews = await Review.find({ restaurant: req.params.id })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(parseInt(limit));
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
