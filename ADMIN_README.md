# Admin Dashboard - Teacher Tracking System

## Tổng quan

Admin Dashboard là một màn hình quản trị mới được thêm vào Teacher Tracking System, cho phép admin xem và quản lý dữ liệu từ Firebase.

## Tính năng chính

### 🔐 Đăng nhập Admin

- Sử dụng email và password để đăng nhập
- Xác thực qua Firebase Authentication
- Bảo mật dữ liệu admin

### 📊 Dashboard Overview

- **Total Teachers**: Tổng số giáo viên đã sử dụng hệ thống
- **Total Classes**: Tổng số buổi dạy hiệu quả
- **Total Amount**: Tổng số tiền tính theo buổi dạy
- **Visitors**: Số lượt truy cập trang web

### 👨‍🏫 Teacher Statistics

- Xem thống kê chi tiết của từng giáo viên
- Phân loại theo loại thống kê (Monthly/Date Range)
- Hiển thị thông tin:
  - Email và số điện thoại giáo viên
  - Loại thống kê (tháng hoặc khoảng thời gian tùy chỉnh)
  - Số buổi dạy hoàn thành
  - Số buổi vắng mặt
  - Số buổi dạy hiệu quả
  - Số tiền tương ứng
  - Thời gian cập nhật cuối

### 🔍 Tìm kiếm và Sắp xếp

- Tìm kiếm theo email, số điện thoại, hoặc tên lớp
- Sắp xếp theo:
  - Ngày (mặc định)
  - Email
  - Số buổi dạy
  - Số tiền
- Thay đổi thứ tự sắp xếp (tăng dần/giảm dần)

### 📈 Visitor Analytics

- Xem số lượt truy cập tổng cộng
- Thời gian cập nhật cuối cùng

### 🚀 Performance Improvements (v3.3)

- **pLimit Integration**: Giới hạn 5 concurrent requests (giống TeacherStats.js)
- **Timeout Handling**: 30-second timeout per request để tránh hanging
- **Graceful Error Handling**: Partial success thay vì complete failure
- **Duplicate Prevention**: Tránh đếm trùng lặp absence records
- **Enhanced Logging**: Clear console messages với emojis

_📋 Xem chi tiết: [ADMIN_DASHBOARD_IMPROVEMENTS.md](./ADMIN_DASHBOARD_IMPROVEMENTS.md)_

## Cách sử dụng

### 1. Truy cập Admin Dashboard

- Vào trang chủ: `/`
- Click vào tab "🔐 Admin Dashboard" hoặc truy cập trực tiếp `/admin`

### 2. Đăng nhập

- Nhập email admin
- Nhập password admin
- Click "Sign in"

### 3. Xem dữ liệu

- **Tab "Teacher Statistics"**: Xem thống kê giáo viên
- **Tab "Visitor Analytics"**: Xem thống kê truy cập

### 4. Tìm kiếm và lọc

- Sử dụng ô tìm kiếm để tìm giáo viên cụ thể
- Chọn tiêu chí sắp xếp từ dropdown
- Click vào mũi tên để thay đổi thứ tự sắp xếp

## Cấu trúc dữ liệu

### Collections Firebase được sử dụng:

1. **teacher_stats**: Thống kê theo tháng
2. **teacher_stats_date_range**: Thống kê theo khoảng thời gian tùy chỉnh
3. **metrics/visitor_count**: Số lượt truy cập

### Dữ liệu hiển thị:

- Thông tin giáo viên (email, phone)
- Thống kê buổi dạy (totalFinishedCount, totalParticipationScore, totalClasses)
- Số tiền (totalMoney)
- Thời gian (timestamp, month, year, startDate, endDate)

## Bảo mật

- Chỉ admin có quyền truy cập dashboard
- Xác thực qua Firebase Authentication
- Dữ liệu được bảo vệ và chỉ hiển thị cho admin đã đăng nhập

## Ghi chú

- Admin Dashboard hoàn toàn độc lập với TeacherStats
- Không ảnh hưởng đến các tính năng hiện có
- Sử dụng cùng Firebase project và cấu hình
- Responsive design cho mobile và desktop

## 🧪 Testing & Monitoring

### **Performance Testing**

1. **Test Monthly Stats**: Sử dụng "Fetch Statistics for Month"
2. **Test Date Range**: Sử dụng "Fetch Statistics for Date Range"
3. **Monitor Console**: Xem enhanced logging với emojis
4. **Check Performance**: So sánh với trước khi cải tiến
5. **Verify Accuracy**: Kiểm tra absence statistics có chính xác không

### **Expected Improvements**

- ✅ **Stability**: Giống như TeacherStats.js đã proven to work
- ✅ **Performance**: Rate limiting prevents server overload
- ✅ **Resilience**: Partial failures don't kill entire process
- ✅ **Debugging**: Clear console logs với emojis
- ✅ **Accuracy**: Duplicate checking ensures correct stats

## 📚 Documentation

- **Performance Improvements**: [ADMIN_DASHBOARD_IMPROVEMENTS.md](./ADMIN_DASHBOARD_IMPROVEMENTS.md)
- **Main System**: [README.md](./README.md)
- **Teacher Stats**: [TeacherStats.js](./src/TeacherStats.js)

## Hỗ trợ

Nếu gặp vấn đề hoặc cần hỗ trợ, vui lòng liên hệ admin hệ thống.
