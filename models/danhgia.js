const mongoose = require('mongoose');

const DanhGiaSchema = new mongoose.Schema({
    MaTour: { type: String, required: true },
    MaNguoiDung: { type: String, required: true },

    NguoiDanhGia: { type: String, required: true },

    DiemSo: { type: Number, required: true, min: 1, max: 5 },
    NoiDung: { type: String },

    NgayDanhGia: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DanhGia', DanhGiaSchema);