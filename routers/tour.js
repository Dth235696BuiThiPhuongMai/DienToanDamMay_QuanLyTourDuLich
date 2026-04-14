const axios = require('axios');
const fs = require('fs');
const path = require('path');
var express = require('express');
var router = express.Router();
const Tour = require('../models/tour');
const DanhGia = require('../models/danhgia');


const TU_DIEN_CHAU_LUC = {
    "Châu Á": "Việt Nam|Thái Lan|Singapore|Malaysia|Indonesia|Bali|Philippines|Campuchia|Lào|Myanmar|Brunei|Đông Timor|Trung Quốc|Nhật Bản|Hàn Quốc|Triều Tiên|Đài Loan|Hồng Kông|Ma Cao|Ấn Độ|Nepal|Sri Lanka|Maldives|Bhutan|Pakistan|Bangladesh|Ả Rập|UAE|Dubai|Qatar|Saudi Arabia|Oman|Yemen|Iran|Iraq|Israel|Jordan|Lebanon|Syria|Thổ Nhĩ Kỳ|Kazakhstan|Uzbekistan|Mông Cổ",
    "Châu Âu": "Anh|Pháp|Đức|Ý|Italia|Tây Ban Nha|Bồ Đào Nha|Hà Lan|Bỉ|Thụy Sĩ|Thụy Điển|Đan Mạch|Na Uy|Phần Lan|Nga|Hy Lạp|Áo|Séc|Hungary|Ba Lan|Slovakia|Slovenia|Croatia|Serbia|Romania|Bulgaria|Ukraina|Belarus|Lithuania|Latvia|Estonia|Ireland|Scotland|Wales|Vatican|Monaco|Iceland",
    "Châu Mỹ": "Mỹ|Hoa Kỳ|USA|Canada|Mexico|Brazil|Argentina|Chile|Colombia|Peru|Venezuela|Ecuador|Bolivia|Paraguay|Uruguay|Cuba|Bahamas|Jamaica|Haiti|Dominica|Costa Rica|Panama|Guatemala|Honduras|Nicaragua|El Salvador|Puerto Rico|New York|Los Angeles|San Francisco|Las Vegas",
    "Châu Úc": "Úc|Australia|New Zealand|Fiji|Papua New Guinea|Solomon|Vanuatu|Samoa|Tonga|Tuvalu|Kiribati|Micronesia|Palau|Marshall|Sydney|Melbourne",
    "Châu Phi": "Ai Cập|Nam Phi|Morocco|Ma-rốc|Kenya|Nigeria|Madagascar|Ethiopia|Tanzania|Uganda|Ghana|Senegal|Cameroon|Bờ Biển Ngà|Mali|Zimbabwe|Zambia|Angola|Algeria|Libya|Sudan|Tunisia|Somalia|Rwanda"
};

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

router.get('/loc', async (req, res) => {
    try {
        const keyword = (req.query.q || '').trim();
        const continent = (req.query.continent || '').trim();

        let query = null;

        // 🔍 keyword
        if (keyword) {
            query = {
                $or: [
                    { TenTour: { $regex: keyword, $options: 'i' } },
                    { MoTa: { $regex: keyword, $options: 'i' } },
                    { NoiKhoiHanh: { $regex: keyword, $options: 'i' } }
                ]
            };
        }

        // 🇻🇳 trong nước
        else if (continent === 'Trong nước') {
            query = {
                NoiKhoiHanh: {
                    $regex: "Hà Nội|Đà Nẵng|Nha Trang|Phú Quốc|Huế|Sapa|Đà Lạt",
                    $options: 'i'
                }
            };
        }

        // 🌍 châu lục
        else if (TU_DIEN_CHAU_LUC[continent]) {
            query = {
                NoiKhoiHanh: {
                    $regex: TU_DIEN_CHAU_LUC[continent],
                    $options: 'i'
                }
            };
        }

        if (!query) {
            return res.render('tour', {
                tours: [],
                favTours: [],
                message: 'Chưa chọn điều kiện lọc 😗',
                session: req.session
            });
        }

        const tours = await Tour.find(query).sort({ _id: -1 });

        const favTours = await Tour.find()
            .sort({ DanhGia: -1 })
            .limit(5);

        res.render('tour', {
            tours,
            favTours,
            message: tours.length
                ? `Tìm thấy ${tours.length} tour ✈️`
                : 'Không tìm thấy tour 😢',
            session: req.session
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Lỗi filter");
    }
});
// 5. ĐÁNH GIÁ (Bản nâng cấp tính điểm trung bình)
router.post('/danhgia/:id', async (req, res) => {
    if (!req.session || !req.session.User) {
        return res.send("<script>alert('Bấy bi phải đăng nhập mới đánh giá được nha!'); window.location.href='/auth/dangnhap';</script>");
    }

    try {
        const idTour = req.params.id;
        const tourHienTai = await Tour.findById(idTour);

        if (!tourHienTai) {
            return res.send("<script>alert('Không tìm thấy tour!'); window.history.back();</script>");
        }

        const danhGiaMoi = {
            MaTour: tourHienTai.MaTour,
            MaNguoiDung: req.session.User.id || req.session.User._id,
            NguoiDanhGia: req.session.User.HoVaTen,
            DiemSo: Number(req.body.DiemSo), // Số sao người dùng chọn (1-5)
            NoiDung: req.body.NoiDung,
            NgayDanhGia: new Date()
        };

        // Bước 1: Lưu đánh giá mới
        await DanhGia.create(danhGiaMoi);

        // Bước 2: Lấy tất cả đánh giá của TOUR NÀY để tính trung bình
        const dsDanhGia = await DanhGia.find({ MaTour: tourHienTai.MaTour });
        const soLuong = dsDanhGia.length;
        const tongDiem = dsDanhGia.reduce((sum, dg) => sum + dg.DiemSo, 0);
        const diemTrungBinh = (tongDiem / soLuong).toFixed(1); // Ví dụ: 4.5 sao

        // Bước 3: Cập nhật vào bảng Tour (Cập nhật cả 2 trường)
        await Tour.findByIdAndUpdate(idTour, {
            DanhGia: soLuong,    // Đây là số lượt (hiện trong ngoặc đơn)
            SoSao: diemTrungBinh // Đây là điểm sao (hiện ở cái badge vàng)
        });

        return res.send("<script>alert('Cảm ơn bấy bi đã đánh giá!'); window.location.href=document.referrer;</script>");

    } catch (error) {
        console.log("Lỗi: ", error);
        return res.send(`<script>alert('Lỗi: ${error.message}'); window.history.back();</script>`);
    }
});

router.get('/success', (req, res) => res.render('success', { title: 'Thành công' }));
router.get('/error', (req, res) => res.render('error', { title: 'Lỗi rồi!' }));


module.exports = router;