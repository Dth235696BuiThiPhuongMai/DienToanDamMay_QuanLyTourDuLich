var express = require('express');
var router = express.Router();
const DatVe = require('../models/datve');
const Tour = require('../models/tour');
const nodemailer = require('nodemailer');

// Cấu hình con thoi gửi thư
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 1. DANH SÁCH VÉ (Khách thấy vé của mình, Admin thấy tất cả)
router.get('/', async (req, res) => {
    try {
        if (!req.session.User) return res.redirect('/auth/dangnhap');

        let query = {};
        // Nếu không phải admin, chỉ tìm vé của chính khách đó
        if (req.session.User.QuyenHan !== 'admin') {
            query = { TaiKhoan_ID: req.session.User.id };
        }

        const ves = await DatVe.find(query)
            .populate('Tour_ID')
            .populate('TaiKhoan_ID') // Populate cái này để hiện tên khách hàng
            .sort({ NgayDat: -1 });

        res.render('datve', { ves: ves, session: req.session });
    } catch (err) {
        res.status(500).send("Lỗi: " + err.message);
    }
});

// 2. HIỂN THỊ FORM ĐẶT VÉ
router.get('/them/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/tour');
        res.render('datve_them', { tour: tour, session: req.session });
    } catch (err) {
        res.redirect('/tour');
    }
});

// 3. XỬ LÝ LƯU ĐẶT VÉ & GỬI EMAIL CHO ADMIN
router.post('/them/:id', async (req, res) => {
    try {
        if (!req.session.User) {
            return res.send("<script>alert('Bấy bi đăng nhập cái đã nè!'); window.location.href='/auth/dangnhap';</script>");
        }

        const { SoNguoi, TongTien, HoTen, DienThoai, GhiChu } = req.body;
        const tourDaDat = await Tour.findById(req.params.id);

        // Tạo phiếu đặt mới
        const phieuMoi = new DatVe({
            TaiKhoan_ID: req.session.User.id,
            Tour_ID: req.params.id,
            HoTen: HoTen || req.session.User.HoVaTen,
            DienThoai: DienThoai,
            SoNguoi: Number(SoNguoi) || 1,
            // Sửa lỗi 0đ: Nếu TongTien từ form gửi lên bị lỗi, mình tự tính lại luôn
            TongTien: Number(TongTien) || (Number(SoNguoi) * tourDaDat.GiaTour),
            GhiChu: GhiChu,
            TrangThai: 'Chờ duyệt',
            NgayDat: new Date()
        });
        await phieuMoi.save();

        // Gửi email cho Admin
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, 
            subject: `🔥 CÓ ĐƠN ĐẶT TOUR MỚI: ${tourDaDat.TenTour}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #0056b3;">🎉 Bấy bi ơi, có khách đặt tour mới nè!</h2>
                    <p><strong>Khách hàng:</strong> ${phieuMoi.HoTen}</p>
                    <p><strong>Tour:</strong> ${tourDaDat.TenTour}</p>
                    <p><strong>Số lượng:</strong> ${phieuMoi.SoNguoi} khách</p>
                    <p><strong>Tổng tiền:</strong> <span style="color: red;">${phieuMoi.TongTien.toLocaleString('vi-VN')} VNĐ</span></p>
                    <hr>
                    <a href="https://one4pm-tour.onrender.com/api/approve?id=${phieuMoi._id}" style="padding: 10px; background: green; color: white; text-decoration: none;">✅ XÁC NHẬN</a>
                    <a href="https://one4pm-tour.onrender.com/api/reject?id=${phieuMoi._id}" style="padding: 10px; background: red; color: white; text-decoration: none; margin-left: 10px;">❌ TỪ CHỐI</a>
                </div>
            `
        };

        transporter.sendMail(mailOptions);

        // THAY res.json THÀNH CÁI NÀY ĐỂ HẾT BỊ TRANG TRẮNG CHỮ ĐEN
        res.send("<script>alert('Đặt tour thành công! Vui lòng chờ Admin duyệt đơn nhé bấy bi.'); window.location.href='/datve';</script>");

    } catch (err) {
        res.status(500).send("Lỗi đặt vé: " + err.message);
    }
});

// 4. XÓA VÉ (Chỉ Admin)
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