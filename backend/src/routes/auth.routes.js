const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User.model');
const auth   = require('../middleware/auth.middleware');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, token: sign(user._id), user: { id: user._id, name, email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });
    res.json({ success: true, token: sign(user._id), user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json({ success: true, user: req.user }));

module.exports = router;
