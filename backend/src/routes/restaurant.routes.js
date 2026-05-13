const router = require('express').Router();
const auth   = require('../middleware/auth.middleware');
const role   = require('../middleware/role.middleware');
const ctrl   = require('../controllers/restaurant.controller');

router.get('/',                auth, ctrl.getAllRestaurants);
router.get('/my',              auth, role('restaurant_owner'), ctrl.getMyRestaurant);
router.get('/my/dashboard',    auth, role('restaurant_owner'), ctrl.getDashboardStats);
router.get('/:id',             auth, ctrl.getRestaurantById);
router.post('/',               auth, role('restaurant_owner'), ctrl.createRestaurant);
router.put('/:id',             auth, role('restaurant_owner'), ctrl.updateRestaurant);
router.patch('/:id/toggle',    auth, role('restaurant_owner'), ctrl.toggleRestaurantStatus);

module.exports = router;
