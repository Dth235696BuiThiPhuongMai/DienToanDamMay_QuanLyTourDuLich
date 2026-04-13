const axios = require('axios');
const fs = require('fs');
const path = require('path');
var express = require('express');
var router = express.Router();
const Tour = require('../models/tour');
const DanhGia = require('../models/danhgia');

// Hàm tải ảnh (Giữ nguyên vì bấy bi viết quá xịn)
async function taiAnhVeMay(url, tenFile) {
    const duongDan = path.join(__dirname, '../public/images/tours', tenFile);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(duongDan))
            .on('finish', () => resolve())
            .on('error', e => reject(e));
    });
}

// 1. DANH SÁCH TOUR
router.get('/', async (req, res) => {
    try {
        const danhSachTour = await Tour.find().sort({ NgayTao: -1 });
        res.render('tour', { 
            tours: danhSachTour, 
            session: req.session // Thêm cái này để Navbar không bị lỗi Hình 2
        });
    } catch (error) {
        res.status(500).send("Lỗi tải danh sách tour");
    }
});

// 2. THÊM MỚI (POST) - Sửa lỗi Redirect
router.post('/them', async (req, res) => {
    try {
        const linkAnhPinterest = req.body.HinhAnh;
        const tenFileMoi = 'tour_' + Date.now() + '.jpg';
        await taiAnhVeMay(linkAnhPinterest, tenFileMoi);

        const tourMoi = new Tour({
            TenTour: req.body.TenTour,
            GiaTour: req.body.GiaTour,
            MaTour: req.body.MaTour, // Nhớ lấy thêm MaTour từ form nhé
            HinhAnh: '/images/tours/' + tenFileMoi,
        });

        await tourMoi.save();
        res.redirect('/tour'); // Sửa lại đường dẫn này cho đúng
    } catch (error) {
        res.send("Có lỗi khi tải ảnh bấy bi ơi: " + error.message);
    }
});

// 3. CHI TIẾT TOUR (Gộp lại cho chuẩn)
router.get('/chitiet/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/tour');

        const danhgias = await DanhGia.find({ MaTour: tour.MaTour }).sort({ NgayDanhGia: -1 });

        res.render('tour_chitiet', {
            tour: tour,
            danhgias: danhgias,
            session: req.session // Quan trọng để hiện tên Mai Phương
        });
    } catch (error) {
        res.redirect('/tour');
    }
});

// 4. XỬ LÝ ĐÁNH GIÁ (Giữ nguyên logic bấy bi viết nhưng bọc kỹ session)
router.post('/danhgia/:id', async (req, res) => {
    try {
        if (!req.session.User) {
            return res.send("<script>alert('Vui lòng đăng nhập bấy bi ơi!'); window.history.back();</script>");
        }
        const tourData = await Tour.findById(req.params.id);
        
        const danhGiaMoi = new DanhGia({
            MaTour: tourData.MaTour,
            NguoiDanhGia: req.session.User.HoVaTen,
            MaNguoiDung: req.session.User.id,
            DiemSo: Number(req.body.DiemSo),
            NoiDung: req.body.NoiDung,
            NgayDanhGia: Date.now()
        });
        await danhGiaMoi.save();

        // Tính điểm trung bình (Logic cũ của bấy bi rất tốt)
        const dsDanhGia = await DanhGia.find({ MaTour: tourData.MaTour });
        const tongDiem = dsDanhGia.reduce((sum, dg) => sum + dg.DiemSo, 0);
        const diemTB = (tongDiem / dsDanhGia.length).toFixed(1);

        await Tour.findByIdAndUpdate(req.params.id, {
            DanhGia: diemTB,
            LuotDanhGia: dsDanhGia.length
        });

        res.redirect(req.get('referer') || '/tour/chitiet/' + req.params.id);
    } catch (error) {
        res.send("<script>alert('Lỗi đánh giá rồi!'); window.history.back();</script>");
    }
});

module.exports = router;