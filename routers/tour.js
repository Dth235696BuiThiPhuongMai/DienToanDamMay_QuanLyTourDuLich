const axios = require('axios');
const fs = require('fs');
const path = require('path');
var express = require('express');
var router = express.Router();
const Tour = require('../models/tour');
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
// 4. Lọc Tour theo Châu Lục
router.get('/tour/loc', async (req, res) => {
    try {
        const chauLuc = req.query.chau;
        let query = chauLuc ? { ChauLuc: chauLuc } : {};
        const tours = await Tour.find(query).sort({ _id: -1 });
        res.render('tour', { // Lưu ý tên file view cho đồng bộ
            title: 'Du lịch ' + (chauLuc || 'Toàn cầu'),
            tours: tours
        });
    } catch (err) {
        res.redirect('/error');
    }
});

router.post('/tour/danhgia/:maTour', async (req, res) => {
    try {
        const maTour = req.params.maTour;
        const { DiemSo, NoiDung } = req.body; // Lấy dữ liệu từ form

        // 1. Tìm tour dựa trên mã tour (hoặc ID)
        const tour = await Tour.findOne({ MaTour: maTour });

        if (!tour) {
            return res.redirect('/error');
        }

        // 2. Logic tính toán lại điểm trung bình (Ví dụ đơn giản)
        // Lấy số lượt đánh giá hiện tại + 1
        let soLuotMoi = (tour.LuotDanhGia || 0) + 1;

        // Tính điểm mới (Đây là cách tính trung bình cộng đơn giản)
        let diemHienTai = parseFloat(tour.DanhGia || 5);
        let diemMoi = ((diemHienTai * (soLuotMoi - 1)) + parseFloat(DiemSo)) / soLuotMoi;

        // 3. Cập nhật vào Database
        await Tour.findOneAndUpdate(
            { MaTour: maTour },
            {
                $set: {
                    DanhGia: diemMoi.toFixed(1), // Lưu 1 chữ số thập phân (VD: 4.5)
                    LuotDanhGia: soLuotMoi
                }
            }
        );

        // 4. Đánh giá xong thì quay lại đúng trang chi tiết của tour đó
        // Chỗ này quan trọng nè: quay lại trang chi tiết chứ đừng đi đâu hết!
        res.redirect('/tours/chitiet/' + tour._id);

    } catch (err) {
        console.error("Lỗi khi lưu đánh giá:", err);
        res.redirect('/error');
    }
});



module.exports = router;