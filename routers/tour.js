const axios = require('axios');
const fs = require('fs');
const path = require('path');
var express = require('express');
var router = express.Router();
const Tour = require('../models/Tour');
const DanhGia = require('../models/danhgia');

// Hàm tải ảnh xịn sò
async function taiAnhVeMay(url, tenFile) {
    const thuMuc = path.join(__dirname, '../public/images/tours');
    // Kiểm tra nếu chưa có thư mục thì tạo luôn cho chắc
    if (!fs.existsSync(thuMuc)) {
        fs.mkdirSync(thuMuc, { recursive: true });
    }
    const duongDan = path.join(thuMuc, tenFile);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(duongDan))
            .on('finish', () => resolve())
            .on('error', e => reject(e));
    });
}

// 1. DANH SÁCH TOUR (Đã fix lỗi phân trang)
// 1. DANH SÁCH TOUR (Đã fix lỗi phân trang, tìm kiếm và sắp xếp)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;

        // --- BƯỚC 1: XỬ LÝ ĐIỀU KIỆN TÌM KIẾM ---
        let query = {};
        const searchKeyword = req.query.search; // Giả sử form tìm kiếm của bạn gửi lên name="search"
        if (searchKeyword) {
            // Tìm tương đối không phân biệt hoa thường trong field TenTour
            query.TenTour = { $regex: searchKeyword, $options: 'i' };
        }

        // --- BƯỚC 2: XỬ LÝ SẮP XẾP ---
        let sortCondition = { NgayDang: -1 }; // Mặc định là mới nhất
        const sortQuery = req.query.sort;
        if (sortQuery === 'price_asc') {
            sortCondition = { GiaTour: 1 };
        } else if (sortQuery === 'price_desc') {
            sortCondition = { GiaTour: -1 };
        } else if (sortQuery === 'popular') {
            // Nếu model Tour có trường DanhGia thì sort theo nó, không thì để tạm ngày đăng
            sortCondition = { DanhGia: -1 };
        }

        // --- BƯỚC 3: TRUY VẤN CÓ ĐIỀU KIỆN ---
        // Thêm query và sortCondition vào đây
        const danhSachTour = await Tour.find(query).sort(sortCondition).skip(skip).limit(limit);

        // Đếm tổng số tour THEO ĐIỀU KIỆN TÌM KIẾM (để phân trang không bị dư)
        const totalTours = await Tour.countDocuments(query);

        res.render('tour', {
            tours: danhSachTour,
            currentPage: page,
            totalPages: Math.ceil(totalTours / limit) || 1,
            sVal: sortQuery || '',
            searchVal: searchKeyword || '', // Truyền từ khóa tìm kiếm ra view để giữ lại
            session: req.session
        });
    } catch (error) {
        console.error("Lỗi danh sách tour: ", error);
        res.status(500).send("Lỗi tải danh sách tour");
    }
});

// 2. FORM THÊM TOUR (GET)
router.get('/them', (req, res) => {
    res.render('tour_them', { title: 'Thêm Tour Mới', session: req.session });
});
router.post('/them', async (req, res) => {
    try {
        const { TenTour, GiaTour, ThoiGian, HinhAnh, MoTa } = req.body;

        // --- BƯỚC 1: TỰ SINH MÃ TĂNG DẦN (TD0001, TD0002...) ---
        const lastTour = await Tour.findOne().sort({ MaTour: -1 }); // Tìm tour có mã lớn nhất
        let MaTuSinh = "TD0001";
        if (lastTour && lastTour.MaTour) {
            const currentNumber = parseInt(lastTour.MaTour.replace("TD", "")); // Lấy phần số
            MaTuSinh = "TD" + String(currentNumber + 1).padStart(4, '0'); // Tăng 1 và bù số 0
        }

        // --- BƯỚC 2: XỬ LÝ LƯU HÌNH VỀ MÁY ---
        let duongDanAnh = '/images/no-image.jpg';
        if (HinhAnh && HinhAnh.trim().startsWith('http')) {
            try {
                const tenFileMoi = 'tour_' + Date.now() + '.jpg';
                await taiAnhVeMay(HinhAnh, tenFileMoi);
                duongDanAnh = '/images/tours/' + tenFileMoi;
            } catch (err) {
                console.log("Lỗi tải ảnh: ", err.message);
            }
        }

        const tourMoi = new Tour({
            MaTour: MaTuSinh,
            TenTour: TenTour,
            GiaTour: Number(GiaTour) || 0,
            ThoiGian: ThoiGian,
            HinhAnh: [duongDanAnh],
            MoTa: MoTa,
            NgayDang: new Date()
        });

        await tourMoi.save();
        res.send(`<script>alert('Thành công! Mã tour mới là: ${MaTuSinh}'); window.location.href='/tour';</script>`);

    } catch (error) {
        res.status(500).send("Lỗi: " + error.message);
    }
});
router.get('/sua/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/error');

        res.render('tour_sua', {
            title: 'Sửa tour',
            tour: tour
        });
    } catch (err) {
        console.log(err);
        res.redirect('/error');
    }
});
// cập nhật tour
router.post('/sua/:id', async (req, res) => {
    try {
        const { TenTour, GiaTour, ThoiGian, HinhAnh, MoTa } = req.body;

        await Tour.findByIdAndUpdate(req.params.id, {
            TenTour,
            GiaTour,
            ThoiGian,
            HinhAnh: HinhAnh ? [HinhAnh] : [],
            MoTa
        });

        res.redirect('/tour');
    } catch (err) {
        console.log(err);
        res.redirect('/error');
    }
});
// xóa tour
router.get('/xoa/:id', async (req, res) => {
    try {
        await Tour.findByIdAndDelete(req.params.id);
        res.redirect('/tour');
    } catch (err) {
        console.log(err);
        res.redirect('/error');
    }
});
// 4. CHI TIẾT TOUR
router.get('/chitiet/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/tour');
        const danhgias = await DanhGia.find({ MaTour: tour.MaTour }).sort({ NgayDanhGia: -1 });
        res.render('tour_chitiet', { tour, danhgias, session: req.session });
    } catch (error) { res.redirect('/tour'); }
});



// 5. ĐÁNH GIÁ
// 5. ĐÁNH GIÁ
router.post('/danhgia/:id', async (req, res) => {
    // 1. Kiểm tra xem bấy bi đã đăng nhập chưa
    if (!req.session.User) {
        return res.send("<script>alert('Bấy bi phải đăng nhập thì mới được đánh giá nha!'); window.location.href='/auth/dangnhap';</script>");
    }

    try {
        // SỬA CHỖ NÀY: Lấy đúng req.params.id theo URL
        const idTour = req.params.id;
        const idTaiKhoan = req.session.User.id;

        // Phải tìm cái Tour đó ra để lấy được cái "MaTour" (Ví dụ: TD0001)
        const tourHienTai = await Tour.findById(idTour);
        if (!tourHienTai) return res.send("<script>alert('Lỗi: Không tìm thấy tour này!'); window.history.back();</script>");

        // 2. ĐÂY LÀ CHỐT CHẶN
        const daDanhGiaChua = await DanhGia.findOne({
            MaTour: tourHienTai.MaTour, // Sửa thành MaTour cho khớp với hàm GET chi tiết ở trên
            TaiKhoanID: idTaiKhoan
        });

        if (daDanhGiaChua) {
            return res.send("<script>alert('Bấy bi đã đánh giá tour này rồi nha! Mỗi người chỉ được 1 lần thôi nè hihi.'); window.history.back();</script>");
        }

        // 3. NẾU CHƯA ĐÁNH GIÁ -> LƯU VÀO DATABASE
        const danhGiaMoi = {
            MaTour: tourHienTai.MaTour, // Lưu bằng MaTour luôn
            TaiKhoanID: idTaiKhoan,
            // Thêm tên người dùng nếu Model Đánh giá của bạn có lưu để hiển thị ra web
            TenNguoiDung: req.session.User.HoVaTen,
            NoiDung: req.body.NoiDung,
            DiemSao: req.body.DiemSao,
            NgayDanhGia: new Date() // Đổi thành NgayDanhGia cho khớp với hàm sort ở trên luôn
        };
        await DanhGia.create(danhGiaMoi);

        return res.send("<script>alert('Cảm ơn bấy bi đã để lại đánh giá!'); window.history.back();</script>");

    } catch (error) {
        console.log("Lỗi gửi đánh giá: ", error);
        return res.send("<script>alert('Lỗi hệ thống mất tiêu rồi bấy bi ơi!'); window.history.back();</script>");
    }
});


module.exports = router;