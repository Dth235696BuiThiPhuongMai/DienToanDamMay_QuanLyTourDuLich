var express = require('express');
var router = express.Router();
const DatVe = require('../models/datve');
const Tour = require('../models/tour');

// 1. Route hiển thị danh sách (Admin thấy hết, Khách thấy của mình)
router.get('/', async (req, res) => {
    try {
        if (!req.session.User) return res.redirect('/auth/dangnhap');

        let query = {}; 
        // Nếu không phải admin, chỉ tìm vé của User đang đăng nhập
        if (req.session.User.QuyenHan !== 'admin') {
            query = { TaiKhoan_ID: req.session.User.id };
        }

        const ves = await DatVe.find(query)
            .populate('Tour_ID')
            .populate('TaiKhoan_ID')
            .sort({ NgayDat: -1 });

        res.render('datve', { ves: ves, session: req.session });
    } catch (err) {
        res.status(500).send("Lỗi: " + err.message);
    }
});

// 2. Route hiển thị form đặt vé
router.get('/them/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/tour');
        res.render('datve_them', { tour: tour, session: req.session });
    } catch (err) {
        res.redirect('/tour');
    }
});

// 3. Route xử lý lưu đặt vé
router.post('/them/:id', async (req, res) => {
    try {
        if (!req.session.User) {
            return res.send("<script>alert('Bấy bi đăng nhập cái đã nè!'); window.location.href='/auth/dangnhap';</script>");
        }
        const { SoNguoi, TongTien, HoTen, DienThoai, GhiChu } = req.body;
        const phieuMoi = new DatVe({
            TaiKhoan_ID: req.session.User.id,
            Tour_ID: req.params.id,
            HoTen: HoTen || req.session.User.HoVaTen,
            DienThoai: DienThoai,
            SoNguoi: Number(SoNguoi) || 1,
            TongTien: Number(TongTien) || 0,
            GhiChu: GhiChu,
            NgayDat: new Date()
        });
        await phieuMoi.save();
        res.send("<script>alert('Đặt thành công! Chúc bấy bi đi chơi vui vẻ!'); window.location.href='/datve';</script>");
    } catch (err) {
        res.status(500).send("Lỗi hệ thống: " + err.message);
    }
});

// 4. Route xóa (Chỉ dành cho Admin)
router.get('/xoa/:id', async (req, res) => {
    try {
        if (!req.session.User || req.session.User.QuyenHan !== 'admin') {
            return res.send("<script>alert('Chỉ Admin mới có quyền xóa nha!'); window.location.href='/datve';</script>");
        }
        await DatVe.findByIdAndDelete(req.params.id);
        res.redirect('/datve');
    } catch (err) {
        res.send("Lỗi xóa: " + err.message);
    }
});

module.exports = router;