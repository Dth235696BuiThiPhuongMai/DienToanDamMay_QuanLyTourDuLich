var express = require('express');
var router = express.Router();
const Tour = require('../models/Tour');

// Trang admin
router.get('/', async (req, res) => {
    const tours = await Tour.find();
    res.render('admin', { 
        title: 'Quản lý Tour',   
        tours: tours 
    });
});

module.exports = router;