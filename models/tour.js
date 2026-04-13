const mongoose = require('mongoose');

const TourSchema = new mongoose.Schema({
    TenTour: { type: String, required: true },
    MaTour: { type: String, unique: true },
    GiaTour: { type: Number, default: 0 },
    NgayKhoiHanh: { type: Date },
    ThoiGian: { type: String },
    NoiKhoiHanh: { type: String },
    SoCho: { type: Number },
    HinhAnh: [String],
    MoTa: { type: String },
    ChuDe: { type: String }, // Hoặc ObjectId nếu bạn làm bảng Chuyên mục riêng
    NgayDang: { type: Date, default: Date.now },
    DanhGia: { type: Number, default: 5.0 }, 
    LuotDanhGia: { type: Number, default: 0 }
    
});

module.exports = mongoose.model('Tour', TourSchema);