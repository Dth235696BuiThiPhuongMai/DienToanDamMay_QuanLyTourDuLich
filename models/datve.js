const mongoose = require('mongoose');

const datveSchema = new mongoose.Schema({
    Tour_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
    TaiKhoan_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'TaiKhoan' },
    SoNguoi: { type: Number, required: true },
    TongTien: { type: Number, required: true },
    NgayDat: { type: Date, default: Date.now },
    // Thêm dòng này vào schema của models/DatVe.js
    TrangThai: {
        type: String,
        enum: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'],
        default: 'Chờ duyệt'
    }
});

module.exports = mongoose.model('DatVe', datveSchema);