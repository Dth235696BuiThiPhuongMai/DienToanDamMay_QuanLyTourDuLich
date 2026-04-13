const mongoose = require('mongoose');

const datveSchema = new mongoose.Schema({
    Tour_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    TaiKhoan_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
    HoTen: String, 
    DienThoai: String,
    SoNguoi: { type: Number, required: true, default: 1 },
    GhiChu: String,
    
    NgayDat: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DatVe', datveSchema);