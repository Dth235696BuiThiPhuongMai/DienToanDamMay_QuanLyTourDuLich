require('dotenv').config();

const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Lấy từ .env nè
        pass: process.env.EMAIL_PASS  // Lấy từ .env nè
    }
});

var express = require('express');
var app = express();
var mongoose = require('mongoose');
var session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
var path = require('path');

// --- BƯỚC 1: KHAI BÁO MODEL TÀI KHOẢN ---
var TaiKhoan = require('./models/taikhoan');

var indexRouter = require('./routers/index');
var authRouter = require('./routers/auth');
var taikhoanRouter = require('./routers/taikhoan');
var tourRouter = require('./routers/tour');
var datveRouter = require('./routers/datve');
var adminRouter = require('./routers/admin');

var uri = process.env.DATABASE_URL;
mongoose.connect(uri)
    .then(() => console.log('✅ Đã kết nối MongoDB thành công!'))
    .catch(err => console.log('❌ Lỗi kết nối CSDL:', err));

app.set('views', './views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    name: 'TourSession',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    var err = req.session.error;
    var msg = req.session.success;

    delete req.session.error;
    delete req.session.success;

    res.locals.message = '';
    if (err) res.locals.message = '<span class="text-danger">' + err + '</span>';
    if (msg) res.locals.message = '<span class="text-success">' + msg + '</span>';

    next();
});

// Khởi động Passport (Nên đặt trước Router)
app.use(passport.initialize());
app.use(passport.session());

// --- BƯỚC 2: CẤU HÌNH PASSPORT GOOGLE (ĐÃ NÂNG CẤP LƯU DATABASE) ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://one4pm-tour.onrender.com/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Tìm xem Email này đã tồn tại trong DB chưa
            let user = await TaiKhoan.findOne({ Email: profile.emails[0].value });

            if (user) {
                // Nếu đã có, trả về user đó luôn
                return cb(null, user);
            } else {
                // Nếu chưa có, tạo mới một tài khoản khách hàng
                let newUser = await TaiKhoan.create({
                    HoVaTen: profile.displayName,
                    Email: profile.emails[0].value,
                    TenDangNhap: profile.emails[0].value, // Lấy email làm tên đăng nhập cho độc nhất
                    MatKhau: "", // Đăng nhập qua Google nên không cần mật khẩu
                    HinhAnh: profile.photos[0].value,
                    QuyenHan: "khachhang",
                    KichHoat: 1
                });
                return cb(null, newUser);
            }
        } catch (error) {
            console.log("Lỗi xử lý Google Auth:", error);
            return cb(error, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

// --- BƯỚC 3: CÁC ĐƯỜNG DẪN ĐĂNG NHẬP ---
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/dangnhap' }),
    (req, res) => {
        // Lưu thông tin user vào session để các trang khác xài được
        req.session.User = {
            id: req.user._id,
            HoVaTen: req.user.HoVaTen,
            Email: req.user.Email
        };

        // Quan trọng: Đợi session lưu xong rồi mới Redirect về trang chủ
        req.session.save((err) => {
            if (err) console.log(err);
            res.redirect('/');
        });
    }
);

app.get('/auth/dangxuat', (req, res) => {
    req.logout(() => {
        req.session.destroy(() => {
            res.clearCookie('TourSession');
            res.redirect('/');
        });
    });
});

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/taikhoan', taikhoanRouter);
app.use('/tour', tourRouter);
app.use('/datve', datveRouter);
app.use('/admin', adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://127.0.0.1:${PORT}`);
});