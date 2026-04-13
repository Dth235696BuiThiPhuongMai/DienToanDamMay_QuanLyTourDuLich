var express = require('express');
var router = express.Router();
const Tour = require('../models/tour');
const DanhGia = require('../models/danhgia');
const DatVe = require('../models/datve');
const nodemailer = require('nodemailer');

// 1. Cấu hình gửi mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const TU_DIEN_CHAU_LUC = {
    "Châu Á": "Việt Nam|Thái Lan|Singapore|Malaysia|Indonesia|Bali|Philippines|Campuchia|Lào|Myanmar|Brunei|Đông Timor|Trung Quốc|Nhật Bản|Hàn Quốc|Triều Tiên|Đài Loan|Hồng Kông|Ma Cao|Ấn Độ|Nepal|Sri Lanka|Maldives|Bhutan|Pakistan|Bangladesh|Ả Rập|UAE|Dubai|Qatar|Saudi Arabia|Oman|Yemen|Iran|Iraq|Israel|Jordan|Lebanon|Syria|Thổ Nhĩ Kỳ|Kazakhstan|Uzbekistan|Mông Cổ",
    "Châu Âu": "Anh|Pháp|Đức|Ý|Italia|Tây Ban Nha|Bồ Đào Nha|Hà Lan|Bỉ|Thụy Sĩ|Thụy Điển|Đan Mạch|Na Uy|Phần Lan|Nga|Hy Lạp|Áo|Séc|Hungary|Ba Lan|Slovakia|Slovenia|Croatia|Serbia|Romania|Bulgaria|Ukraina|Belarus|Lithuania|Latvia|Estonia|Ireland|Scotland|Wales|Vatican|Monaco|Iceland",
    "Châu Mỹ": "Mỹ|Hoa Kỳ|USA|Canada|Mexico|Brazil|Argentina|Chile|Colombia|Peru|Venezuela|Ecuador|Bolivia|Paraguay|Uruguay|Cuba|Bahamas|Jamaica|Haiti|Dominica|Costa Rica|Panama|Guatemala|Honduras|Nicaragua|El Salvador|Puerto Rico|New York|Los Angeles|San Francisco|Las Vegas",
    "Châu Úc": "Úc|Australia|New Zealand|Fiji|Papua New Guinea|Solomon|Vanuatu|Samoa|Tonga|Tuvalu|Kiribati|Micronesia|Palau|Marshall|Sydney|Melbourne",
    "Châu Phi": "Ai Cập|Nam Phi|Morocco|Ma-rốc|Kenya|Nigeria|Madagascar|Ethiopia|Tanzania|Uganda|Ghana|Senegal|Cameroon|Bờ Biển Ngà|Mali|Zimbabwe|Zambia|Angola|Algeria|Libya|Sudan|Tunisia|Somalia|Rwanda"
};

// 2. Trang chủ
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        const tours = await Tour.find().sort({ _id: -1 }).skip(skip).limit(limit);
        const totalTours = await Tour.countDocuments();
        res.render('index', {
            title: 'Trang chủ',
            tours: tours,
            currentPage: page,
            totalPages: Math.ceil(totalTours / limit),
            session: req.session
        });
    } catch (err) { res.redirect('/error'); }
});


router.get('/tours', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const sortType = req.query.sort || '';
        let sortOption = { MaTour: 1 };
        if (sortType === 'popular') sortOption = { DanhGia: -1, LuotDanhGia: -1 };
        else if (sortType === 'price_asc') sortOption = { GiaTour: 1 };
        else if (sortType === 'price_desc') sortOption = { GiaTour: -1 };

        const paginatedTours = await Tour.find().sort(sortOption).skip(skip).limit(limit);
        const favoriteTours = await Tour.find().sort({ DanhGia: -1 }).limit(5);
        const totalTours = await Tour.countDocuments();

        res.render('tour', {
            title: 'Tất cả các Tour du lịch',
            tours: paginatedTours,
            favTours: favoriteTours,
            currentPage: page,
            totalPages: Math.ceil(totalTours / limit),
            currentSort: sortType,
            session: req.session,
            tuKhoaTimKiem: ''
        });
    } catch (error) { res.redirect('/error'); }
});


router.get('/tours/chitiet/:id', async (req, res) => {
    try {
        const tour = await Tour.findById(req.params.id);
        if (!tour) return res.redirect('/error');
        const danhgias = await DanhGia.find({ MaTour: tour.MaTour }).sort({ NgayDanhGia: -1 });
        res.render('tour_chitiet', {
            title: tour.TenTour,
            tour: tour,
            danhgias: danhgias,
            session: req.session
        });
    } catch (err) { res.redirect('/error'); }
});

router.get('/dangnhap', (req, res) => res.render('dangnhap', { title: 'Đăng nhập' }));
router.get('/dangky', (req, res) => res.render('dangky', { title: 'Đăng ký' }));
router.get('/success', (req, res) => res.render('success', { title: 'Thành công' }));
router.get('/error', (req, res) => res.render('error', { title: 'Lỗi rồi!' }));

module.exports = router;