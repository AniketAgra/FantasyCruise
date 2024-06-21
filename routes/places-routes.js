const express = require('express');

const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controller')
const fileUpload = require('../middleware/file-upload')
const chechAuth = require('../middleware/check-auth')

const router = express.Router();  //here Router is a method present in express --> execute like a function and we don't uses express as a function as we executed in app.js 

router.get('/:pid',placesControllers.getPlaceById);

router.get('/user/:uid',placesControllers.getPlacesByUserId);

router.use(chechAuth);  //so all routes below this are protected until this middleware is verified

router.post('/', fileUpload.single('image'),[check ('title').not().isEmpty(),check ('description').isLength({min: 5}),check('address').not().isEmpty()], placesControllers.createPlace);  //left to right execution nad we may pass multiple middleware

router.patch('/:pid',[check('title').not().isEmpty(),check('description').isLength({min: 5})],placesControllers.updatePlace);

router.delete('/:pid',placesControllers.deletePlace);

module.exports = router;      //export syntax used to export in express --> the thing here we export is router