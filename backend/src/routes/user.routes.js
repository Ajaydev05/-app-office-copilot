const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const ctrl   = require('../controllers/user.controller');

router.get('/profile',                 auth, ctrl.getProfile);
router.put('/profile',                 auth, ctrl.updateProfile);
router.post('/address',                auth, ctrl.addAddress);
router.delete('/address/:addressId',   auth, ctrl.deleteAddress);

module.exports = router;
