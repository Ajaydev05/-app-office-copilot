const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const ctrl   = require('../controllers/admin.controller');

router.get('/dashboard',                   auth, role('admin'), ctrl.getDashboard);
router.get('/users',                       auth, role('admin'), ctrl.getAllUsers);
router.patch('/users/:id/toggle',          auth, role('admin'), ctrl.toggleUserStatus);
router.patch('/restaurants/:id/verify',    auth, role('admin'), ctrl.verifyRestaurant);

module.exports = router;
