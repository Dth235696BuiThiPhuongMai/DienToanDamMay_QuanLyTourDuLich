var express = require('express');
var router = express.Router();
const Tour = require('../models/tour');
const DanhGia = require('../models/danhgia');
const DatVe = require('../models/datve');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 2. Trang chủ
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const tours = await Tour.find().sort({ _id: -1 }).skip(skip).limit(limit);
        const totalTours = await Tour.countDocuments();
        res.render('index', {
            title: 'Trang chủ',
            tours: tours,
            currentPage: page,
            totalPages: Math.ceil(totalTours / limit),
            session: req.session
        });
    } catch (err) { res.redirect('/error'); }
});


router.get('/tours', async (req, res) => {
    try {
        const sortType = req.query.sort || '';
        let sortOption = { MaTour: 1 };

        if (sortType === 'popular') sortOption = { DanhGia: -1, LuotDanhGia: -1 };
        else if (sortType === 'price_asc') sortOption = { GiaTour: 1 };
        else if (sortType === 'price_desc') sortOption = { GiaTour: -1 };

        const tours = await Tour.find().sort(sortOption);

        const favoriteTours = await Tour.find().sort({ DanhGia: -1 }).limit(5);

        res.render('tour', {
            title: 'Tất cả các Tour du lịch',
            tours: tours,
            favTours: favoriteTours,
            session: req.session,
            currentSort: sortType
        });

    } catch (error) {
        res.redirect('/error');
    }
});


router.get('/tours/chitiet/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/error');
        const danhgias = await DanhGia.find({ MaTour: tour.MaTour }).sort({ NgayDanhGia: -1 });
        res.render('tour_chitiet', {
            title: tour.TenTour,
            tour: tour,
            danhgias: danhgias,
            session: req.session
        });
    } catch (err) { res.redirect('/error'); }
});

router.get('/dangnhap', (req, res) => res.render('dangnhap', { title: 'Đăng nhập' }));
router.get('/dangky', (req, res) => res.render('dangky', { title: 'Đăng ký' }));
router.get('/success', (req, res) => res.render('success', { title: 'Thành công' }));
router.get('/error', (req, res) => res.render('error', { title: 'Lỗi rồi!' }));

module.exports = router;