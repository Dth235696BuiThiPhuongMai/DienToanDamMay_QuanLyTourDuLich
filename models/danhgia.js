const mongoose = require('mongoose');

const DanhGiaSchema = new mongoose.Schema({
    MaTour: { type: String, required: true }, // Đánh giá cho Tour nào (Ví dụ: TD0001)
    NguoiDanhGia: { type: String, required: true }, // Tên người đánh giá (Lấy từ Session)
    MaNguoiDung: { type: String }, // ID của user để mốt quản lý
    DiemSo: { type: Number, required: true, min: 1, max: 5 }, // Số sao (1 đến 5)
    NoiDung: { type: String }, // Khách khen hay chê gì viết vào đây
    NgayDanhGia: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DanhGia', DanhGiaSchema);