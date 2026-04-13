var express = require('express');
var router = express.Router();
const DatVe = require('../models/datve');
const Tour = require('../models/tour');
const nodemailer = require('nodemailer');

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
// 3. Route xử lý lưu đặt vé (ĐÃ GẮN TÍNH NĂNG GỬI EMAIL CHO ADMIN)
router.post('/them/:id', async (req, res) => {
    try {
        if (!req.session.User) {
            return res.json({ success: false, message: 'Bấy bi đăng nhập cái đã nè!' });
        }

        const { SoNguoi, TongTien, HoTen, DienThoai, GhiChu } = req.body;

        // Lưu phiếu đặt vé vào Database
        const phieuMoi = new DatVe({
            TaiKhoan_ID: req.session.User.id,
            Tour_ID: req.params.id,
            HoTen: HoTen || req.session.User.HoVaTen,
            DienThoai: DienThoai,
            SoNguoi: Number(SoNguoi) || 1,
            TongTien: Number(TongTien) || 0,
            GhiChu: GhiChu,
            TrangThai: 'Chờ duyệt',
            NgayDat: new Date()
        });
        await phieuMoi.save();

        // Lấy thông tin tour để hiện tên tour trong email cho đẹp
        const tourDaDat = await Tour.findById(req.params.id);

        // ----> ĐOẠN CODE GỬI EMAIL CHO ADMIN <----
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Gửi về chính email của bấy bi (Admin)
            subject: `🔥 CÓ ĐƠN ĐẶT TOUR MỚI: ${tourDaDat.TenTour}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #0056b3;">🎉 Bấy bi ơi, có khách đặt tour mới nè!</h2>
                    <p><strong>Tên khách hàng:</strong> ${phieuMoi.HoTen}</p>
                    <p><strong>Số điện thoại:</strong> ${phieuMoi.DienThoai}</p>
                    <p><strong>Tên Tour:</strong> ${tourDaDat.TenTour}</p>
                    <p><strong>Số lượng:</strong> ${phieuMoi.SoNguoi} khách</p>
                    <p><strong>Tổng tiền:</strong> <span style="color: red; font-weight: bold;">${phieuMoi.TongTien.toLocaleString('vi-VN')} VNĐ</span></p>
                    <p><strong>Ghi chú của khách:</strong> ${phieuMoi.GhiChu || 'Không có'}</p>
                    <hr>
                    <h3>Vui lòng duyệt đơn hàng:</h3>
                    <p><i>Click vào nút bên dưới để duyệt. Hệ thống sẽ tự báo kết quả về màn hình của khách!</i></p>
                    <br>
                    <a href="https://one4pm-tour.onrender.com/api/approve?id=${phieuMoi._id}" style="padding: 12px 25px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">✅ XÁC NHẬN</a>
                    
                    <a href="https://one4pm-tour.onrender.com/api/reject?id=${phieuMoi._id}" style="padding: 12px 25px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; margin-left: 15px;">❌ TỪ CHỐI</a>
                </div>
            `
        };

        // Bắn email đi
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Lỗi gửi mail rùi:', error);
            } else {
                console.log('Đã gửi email thành công cho Admin:', info.response);
            }
        });

        // Trả mã đơn hàng về cho FE (để FE gắn vào Socket.io ngồi đợi phản hồi từ bạn)
        res.json({ success: true, bookingId: phieuMoi._id });

    } catch (err) {
        res.json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});

await phieuMoi.save();



// Cấu hình con thoi gửi thư (Nhớ lấy email và pass ứng dụng từ file .env nha)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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