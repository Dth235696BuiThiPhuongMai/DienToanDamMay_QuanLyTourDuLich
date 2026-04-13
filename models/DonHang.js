const mongoose = require('mongoose');
const donHangSchema = new mongoose.Schema({
    MaTour: String,
    TenTour: String,
    HoTen: String,
    Email: String,
    SoDienThoai: String,
    NgayDat: { type: Date, default: Date.now },
    TrangThai: { type: String, default: 'Chờ xác nhận' }
});
module.exports = mongoose.model('DonHang', donHangSchema);