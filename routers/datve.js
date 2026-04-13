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

// 3. Route xử lý lưu đặt vé (Đã sửa lại để chạy AJAX/Socket)
router.post('/them/:id', async (req, res) => {
    try {
        if (!req.session.User) {
            return res.json({ success: false, message: 'Bấy bi đăng nhập cái đã nè!' });
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
            TrangThai: 'Chờ duyệt', // Set mặc định là chờ duyệt
            NgayDat: new Date()
        });

        await phieuMoi.save();

        // ----> CHỖ NÀY BẠN SẼ VIẾT CODE GỬI EMAIL CHO ADMIN <----
        // Nội dung email sẽ có link: 
        // [Xác nhận]: http://localhost:3000/api/approve?id=phieuMoi._id
        // [Từ chối]: http://localhost:3000/api/reject?id=phieuMoi._id

        // Trả mã đơn hàng về cho FE (để FE gắn vào Socket.io ngồi đợi)
        res.json({ success: true, bookingId: phieuMoi._id });

    } catch (err) {
        res.json({ success: false, message: "Lỗi hệ thống: " + err.message });
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