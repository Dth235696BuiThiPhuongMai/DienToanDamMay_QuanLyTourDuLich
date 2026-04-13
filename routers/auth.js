var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var TaiKhoan = require('../models/taikhoan');

// GET: Đăng ký
router.get('/dangky', async (req, res) => {
    res.render('dangky', { title: 'Đăng ký tài khoản' });
});

// POST: Đăng ký
router.post('/dangky', async (req, res) => {
    try {
        var salt = bcrypt.genSaltSync(10);
        var data = {
            HoVaTen: req.body.HoVaTen,
            Email: req.body.Email,
            HinhAnh: req.body.HinhAnh || "",
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            QuyenHan: "khachhang", // Mặc định là khách
            KichHoat: 1
        };
        await TaiKhoan.create(data);
        // Đăng ký thành công thì hiện thông báo rồi chuyển về đăng nhập
        res.send("<script>alert('Đã đăng ký tài khoản thành công! Đăng nhập ngay thôi bấy bi ơi!'); window.location.href='/auth/dangnhap';</script>");
    } catch (error) {
        // Lỗi đăng ký (ví dụ trùng tên) cũng cho hiện pop-up luôn
        res.send("<script>alert('Lỗi đăng ký: Tên đăng nhập hoặc Email có thể đã tồn tại!'); window.history.back();</script>");
    }
});

// GET: Đăng nhập
router.get('/dangnhap', async (req, res) => {
    res.render('dangnhap', { title: 'Đăng nhập' });
});

// POST: Đăng nhập (CHO PHÉP ĐĂNG NHẬP BẰNG TÊN HOẶC EMAIL)
router.post('/dangnhap', async (req, res) => {
    // Kiểm tra xem đã đăng nhập chưa bằng biến session.User mới
    if(req.session.User) {
        return res.redirect('/');
    }

    try {
        const inputDangNhap = req.body.TenDangNhap; // Lấy dữ liệu khách nhập (có thể là tên, có thể là email)

        // CHỖ NÀY LÀ ĐIỂM NHẤN NÈ: Tìm bằng $or (hoặc Tên hoặc Email)
        var taikhoan = await TaiKhoan.findOne({ 
            $or: [
                { TenDangNhap: inputDangNhap },
                { Email: inputDangNhap }
            ]
        }).exec();
        
        if(taikhoan) {
            if(bcrypt.compareSync(req.body.MatKhau, taikhoan.MatKhau)) {
                if(taikhoan.KichHoat == 0) {
                    // TÀI KHOẢN BỊ KHÓA
                    return res.send("<script>alert('Tài khoản của bấy bi đã bị khóa rồi nha!'); window.location.href='/auth/dangnhap';</script>");
                } else {
                    // Đăng ký session theo cấu trúc CHUẨN (User)
                    req.session.User = {
                        id: taikhoan._id,
                        HoVaTen: taikhoan.HoVaTen,
                        Email: taikhoan.Email,
                        QuyenHan: taikhoan.QuyenHan
                    };
                    
                    // Lưu session rồi mới nhảy trang cho chắc
                    req.session.save(() => {
                        res.redirect('/');
                    });
                }
            } else {
                // SAI MẬT KHẨU
                return res.send("<script>alert('Sai mật khẩu mất tiêu rồi bấy bi ơi!'); window.location.href='/auth/dangnhap';</script>");
            }
        } else {
            // KHÔNG TỒN TẠI (Đã cập nhật câu thông báo)
            return res.send("<script>alert('Tên đăng nhập hoặc Email không tồn tại. Bấy bi kiểm tra lại nha!'); window.location.href='/auth/dangnhap';</script>");
        }
    } catch (error) {
        // LỖI HỆ THỐNG
        return res.send("<script>alert('Lỗi hệ thống rồi: " + error.message + "'); window.location.href='/auth/dangnhap';</script>");
    }
});

// GET: Đăng xuất
router.get('/dangxuat', (req, res) => {
    // Passport logout nếu có dùng Google
    if (req.logout) {
        req.logout(() => {
            req.session.destroy(() => {
                res.clearCookie('TourSession');
                res.redirect('/');
            });
        });
    } else {
        // Logout thủ công
        req.session.destroy(() => {
            res.clearCookie('TourSession');
            res.redirect('/');
        });
    }
});

module.exports = router;