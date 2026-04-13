var express = require('express');
var router = express.Router();
const passport = require('passport');
const TaiKhoan = require('../models/taikhoan');

// --- CÁC ROUTE CÓ SẴN CỦA BẤY BI ---

// Trang danh sách tài khoản
router.get('/', async (req, res) => {
    try {
        const danhSachTK = await TaiKhoan.find();
        res.render('taikhoan', { taikhoans: danhSachTK });
    } catch (error) {
        console.log(error);
        res.status(500).send("Lỗi server"); 
    }
});

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Trạm gác đón khách từ Google trả về
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/taikhoan/dangnhap' }),
    function (req, res) {
        // Nếu thành công thì cho vào thẳng trang chủ! 🎉
        res.redirect('/');
    }
);

module.exports = router;