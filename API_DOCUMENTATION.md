# 🚀 **API Documentation - Teacher Tracking System**

## 📋 **Overview**

Tài liệu này mô tả các API endpoints được sử dụng trong Teacher Tracking System, bao gồm response format, cấu trúc dữ liệu, và cách sử dụng.

---

## 🔗 **Base URL**

```
https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher
```

---

## 🔐 **Authentication**

Tất cả API calls đều yêu cầu **Bearer Token** trong header:

```bash
Authorization: Bearer <JWT_TOKEN>
```

### **Token Format**

- **Type**: JWT (JSON Web Token)
- **Structure**: 3 parts separated by dots (header.payload.signature)
- **Example**: `QN2gIwmeTIkjYcvKru9_uPQm0HPOAtzB2m-_oQ36xMfSLhRE5Wr7k`

---

## 📚 **API Endpoints**

### **1. Products API**

#### **Endpoint**

```
GET /products?page=SCHEDULE
```

#### **Purpose**

Lấy danh sách tất cả các khóa học (products) có sẵn để lên lịch.

#### **Headers**

```bash
accept: */*
accept-language: en,vi;q=0.9
authorization: Bearer <JWT_TOKEN>
content-type: application/json
```

#### **Response Format**

```json
{
  "data": [
    {
      "code": "ESP24FAMX",
      "name": "Core Easy Speak For Adults Mix",
      "status": "ACTIVE",
      "id": 1708
    }
  ]
}
```

#### **Response Fields**

| Field    | Type   | Description              | Example                          |
| -------- | ------ | ------------------------ | -------------------------------- |
| `code`   | string | Mã khóa học              | "ESP24FAMX"                      |
| `name`   | string | Tên khóa học             | "Core Easy Speak For Adults Mix" |
| `status` | string | Trạng thái khóa học      | "ACTIVE"                         |
| `id`     | number | ID duy nhất của khóa học | 1708                             |

#### **Product Categories**

1. **Easy Speak For Adults** - Khóa học cho người lớn
2. **Easy Speak For Teens** - Khóa học cho thanh thiếu niên
3. **Speak Well** - Khóa học tiếng Anh cơ bản
4. **Freetalk** - Khóa học giao tiếp tự do
5. **Let's Go** - Khóa học tiếng Anh trẻ em

---

### **2. Shifts API**

#### **Endpoint**

```
GET /shifts?status[]=ACTIVE&fromDate=<START_DATE>&toDate=<END_DATE>&product_ids[]=<ID1>&product_ids[]=<ID2>
```

#### **Purpose**

Lấy danh sách các ca học (shifts) trong khoảng thời gian cụ thể.

#### **Query Parameters**

| Parameter       | Type   | Required | Description                                     |
| --------------- | ------ | -------- | ----------------------------------------------- |
| `status[]`      | string | Yes      | Trạng thái ca học (ACTIVE, FINISHED, CANCELLED) |
| `fromDate`      | string | Yes      | Ngày bắt đầu (ISO 8601 format)                  |
| `toDate`        | string | Yes      | Ngày kết thúc (ISO 8601 format)                 |
| `product_ids[]` | number | Yes      | Array các ID khóa học                           |

#### **Response Format**

```json
{
  "data": [
    {
      "status": "ACTIVE",
      "startTimeLeave": "",
      "endTimeLeave": "",
      "leaveNote": "",
      "fromShiftTime": "",
      "toShiftTime": "",
      "days": [],
      "classId": 163987,
      "className": "Nguyễn Bảo Nam 18",
      "fromDate": "2025-08-29T15:05:05.997Z",
      "toDate": "2025-08-29T15:35:05.997Z",
      "classStartDate": "2024-10-04T17:00:00.000Z",
      "classType": "OFFICIAL",
      "classStatus": "UN_START",
      "fromTime": {
        "hours": 15,
        "minutes": 5
      },
      "toTime": {
        "hours": 15,
        "minutes": 35
      },
      "productId": 1,
      "productName": "Core SPEAKWELL - GV Việt Nam 1:1",
      "classInId": 947047027,
      "liveUrl": "https://www.eeo.cn/live.php?lessonKey=96577bce5457042b",
      "classSessionId": 9935037,
      "curriculumId": 113,
      "curriculumName": "Kid's Box - Movers",
      "courseId": 12,
      "courseName": "Kid's Box",
      "courseStatus": "ACTIVE",
      "courseFullName": "Kid's Box",
      "linkLms": "https://beta.moodle.speakup.vn/course/view.php?id=",
      "lmsId": 0,
      "sessionName": "Nguyễn Bảo Nam 18 91",
      "daysLeave": [],
      "lessonId": 5712,
      "lessonName": "Unit 13 - Health matters - Lesson 61",
      "rtmp": "rtmp://liveplay.eeo.cn/eeolive/378610321ecac58bd5ac?txSecret=0934ac88c510da761166aadf2aa5ef95&txTime=7d8d37cd",
      "hls": "https://liveplay.eeo.cn/eeolive/378610321ecac58bd5ac.m3u8?txSecret=0934ac88c510da761166aadf2aa5ef95&txTime=7d8d37cd",
      "flv": "https://liveplay.eeo.cn/eeolive/378610321ecac58bd5ac.flv?txSecret=0934ac88c510da761166aadf2aa5ef95&txTime=7d8d37cd",
      "classInClassId": 947047027,
      "classInCourseId": 268740403,
      "schoolId": "7680090",
      "acceptanceStatus": "",
      "teacherAcceptanceStatus": ""
    }
  ]
}
```

#### **Response Fields**

| Field             | Type   | Description                       | Example                                     |
| ----------------- | ------ | --------------------------------- | ------------------------------------------- |
| `status`          | string | Trạng thái ca học                 | "ACTIVE"                                    |
| `classId`         | number | ID duy nhất của lớp               | 163987                                      |
| `className`       | string | Tên lớp (thường là tên học viên)  | "Nguyễn Bảo Nam 18"                         |
| `fromDate`        | string | Thời gian bắt đầu lớp (ISO 8601)  | "2025-08-29T15:05:05.997Z"                  |
| `toDate`          | string | Thời gian kết thúc lớp (ISO 8601) | "2025-08-29T15:35:05.997Z"                  |
| `classStartDate`  | string | Ngày bắt đầu khóa học             | "2024-10-04T17:00:00.000Z"                  |
| `classType`       | string | Loại lớp                          | "OFFICIAL"                                  |
| `classStatus`     | string | Trạng thái lớp                    | "UN_START", "FINISHED", "CANCELLED"         |
| `fromTime`        | object | Thời gian bắt đầu (giờ:phút)      | `{"hours": 15, "minutes": 5}`               |
| `toTime`          | object | Thời gian kết thúc (giờ:phút)     | `{"hours": 15, "minutes": 35}`              |
| `productId`       | number | ID khóa học                       | 1                                           |
| `productName`     | string | Tên khóa học                      | "Core SPEAKWELL - GV Việt Nam 1:1"          |
| `classSessionId`  | number | ID phiên học (dùng cho Diary API) | 9935037                                     |
| `curriculumId`    | number | ID chương trình học               | 113                                         |
| `curriculumName`  | string | Tên chương trình học              | "Kid's Box - Movers"                        |
| `courseId`        | number | ID khóa học                       | 12                                          |
| `courseName`      | string | Tên khóa học                      | "Kid's Box"                                 |
| `courseStatus`    | string | Trạng thái khóa học               | "ACTIVE"                                    |
| `sessionName`     | string | Tên phiên học                     | "Nguyễn Bảo Nam 18 91"                      |
| `lessonId`        | number | ID bài học                        | 5712                                        |
| `lessonName`      | string | Tên bài học                       | "Unit 13 - Health matters - Lesson 61"      |
| `liveUrl`         | string | URL trực tiếp                     | "https://www.eeo.cn/live.php?lessonKey=..." |
| `rtmp`            | string | Stream RTMP                       | "rtmp://liveplay.eeo.cn/eeolive/..."        |
| `hls`             | string | Stream HLS                        | "https://liveplay.eeo.cn/eeolive/...m3u8"   |
| `flv`             | string | Stream FLV                        | "https://liveplay.eeo.cn/eeolive/...flv"    |
| `schoolId`        | string | ID trường học                     | "7680090"                                   |
| `classInId`       | number | ID ClassIn                        | 947047027                                   |
| `classInCourseId` | number | ID khóa học ClassIn               | 268740403                                   |

#### **Class Status Values**

| Status      | Description        | Usage in Statistics    |
| ----------- | ------------------ | ---------------------- |
| `UN_START`  | Lớp chưa bắt đầu   | ❌ Không tính          |
| `FINISHED`  | Lớp đã hoàn thành  | ✅ Tính vào statistics |
| `CANCELLED` | Lớp bị hủy         | ❌ Không tính          |
| `ACTIVE`    | Lớp đang hoạt động | ❌ Không tính          |

#### **Product Types & Class Sizes**

| Product ID | Product Name                       | Class Size | Description                  |
| ---------- | ---------------------------------- | ---------- | ---------------------------- |
| 1          | Core SPEAKWELL - GV Việt Nam 1:1   | 1:1        | Lớp 1 giáo viên, 1 học viên  |
| 2          | Core SPEAKWELL - GV Việt Nam 1:2   | 1:2        | Lớp 1 giáo viên, 2 học viên  |
| 3          | Core SPEAKWELL - GV Việt Nam 1:3   | 1:3        | Lớp 1 giáo viên, 3 học viên  |
| 1708       | Core Easy Speak For Adults Mix     | 1:1        | Lớp người lớn, giáo viên mix |
| 1705       | Core Easy Speak For Teens 1:1 - VN | 1:1        | Lớp thanh thiếu niên, GV VN  |

#### **Curriculum Levels**

| Curriculum ID | Curriculum Name       | Level      | Target Age |
| ------------- | --------------------- | ---------- | ---------- |
| 111           | Kid's Box - Starters  | Beginners  | 6-7 tuổi   |
| 112           | Kid's Box - Beginners | Beginners+ | 7-8 tuổi   |
| 113           | Kid's Box - Movers    | Elementary | 8-9 tuổi   |
| 114           | Kid's Box - Flyers    | Pre-Int    | 9-10 tuổi  |
| 13            | Solutions Elementary  | Elementary | 10+ tuổi   |

---

### **3. Diary API**

#### **Endpoint**

```
GET /diary/<CLASS_SESSION_ID>
```

#### **Purpose**

Lấy chi tiết về buổi học, bao gồm danh sách học viên và trạng thái tham gia.

#### **Response Format**

```json
{
  "data": {
    "generalInfo": {
      "page": 0,
      "lesson": "Unit 6 - Fit and well - Lesson 25",
      "curriculumId": 113,
      "curriculumName": "Kid's Box - Movers",
      "lessonId": 5638,
      "feedback": "",
      "notes": "done"
    },
    "details": [
      {
        "studentId": 118843,
        "studentName": "Lê Văn Gia Khánh",
        "studentCode": "ST118843",
        "isParticipated": true,
        "detail": {
          "reading": "",
          "readingPoint": 0,
          "listening": "",
          "listeningPoint": 0,
          "speaking": "",
          "speakingPoint": 0,
          "writing": "",
          "writingPoint": 0,
          "feedback": ""
        },
        "rating": 0
      }
    ]
  }
}
```

#### **Response Fields**

##### **General Info Section**

| Field            | Type   | Description          | Example                             |
| ---------------- | ------ | -------------------- | ----------------------------------- |
| `page`           | number | Số trang             | 0                                   |
| `lesson`         | string | Tên bài học          | "Unit 6 - Fit and well - Lesson 25" |
| `curriculumId`   | number | ID chương trình học  | 113                                 |
| `curriculumName` | string | Tên chương trình học | "Kid's Box - Movers"                |
| `lessonId`       | number | ID bài học           | 5638                                |
| `feedback`       | string | Feedback chung       | ""                                  |
| `notes`          | string | Ghi chú              | "done"                              |

##### **Student Details Section**

| Field            | Type    | Description                                       | Example            |
| ---------------- | ------- | ------------------------------------------------- | ------------------ |
| `studentId`      | number  | ID duy nhất của học viên                          | 118843             |
| `studentName`    | string  | Tên học viên                                      | "Lê Văn Gia Khánh" |
| `studentCode`    | string  | Mã học viên                                       | "ST118843"         |
| `isParticipated` | boolean | Trạng thái tham gia (true = có mặt, false = vắng) | true               |
| `rating`         | number  | Đánh giá (0-5)                                    | 0                  |

##### **Student Detail Subsection**

| Field            | Type   | Description                 | Example |
| ---------------- | ------ | --------------------------- | ------- |
| `reading`        | string | Ghi chú về kỹ năng đọc      | ""      |
| `readingPoint`   | number | Điểm đọc (0-10)             | 0       |
| `listening`      | string | Ghi chú về kỹ năng nghe     | ""      |
| `listeningPoint` | number | Điểm nghe (0-10)            | 0       |
| `speaking`       | string | Ghi chú về kỹ năng nói      | ""      |
| `speakingPoint`  | number | Điểm nói (0-10)             | 0       |
| `writing`        | string | Ghi chú về kỹ năng viết     | ""      |
| `writingPoint`   | number | Điểm viết (0-10)            | 0       |
| `feedback`       | string | Feedback riêng cho học viên | ""      |

---

## 📊 **Data Processing Logic**

### **1. Date Range Generation**

#### **Monthly Processing**

```javascript
// Tạo date ranges cho tháng cụ thể
const startDate = new Date(Date.UTC(year, month - 1, 1)); // 00:00:00
const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // 23:59:59

// Chia thành các chunks 7 ngày
while (currentDate <= endDate) {
  const toDate = new Date(currentDate);
  toDate.setUTCDate(toDate.getUTCDate() + 6);

  if (toDate > endDate) {
    toDate.setTime(endDate.getTime()); // Sử dụng end date với 23:59:59
  } else {
    toDate.setUTCHours(23, 59, 59, 999);
  }

  dateRanges.push({
    from: currentDate.toISOString(),
    to: toDate.toISOString(),
  });

  currentDate = new Date(toDate);
  currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  currentDate.setUTCHours(0, 0, 0, 0);
}
```

#### **Custom Date Range Processing**

```javascript
// Tạo date ranges cho khoảng thời gian tùy chỉnh
const start = new Date(startDate);
start.setHours(0, 0, 0, 0); // Bắt đầu ngày

const end = new Date(endDate);
end.setHours(23, 59, 59, 999); // Kết thúc ngày

// Chia thành các chunks 7 ngày
while (currentDate <= end) {
  const toDate = new Date(currentDate);
  toDate.setDate(toDate.getDate() + 6);

  if (toDate > end) {
    toDate.setTime(end.getTime()); // Sử dụng end date với 23:59:59
  } else {
    toDate.setHours(23, 59, 59, 999);
  }

  dateRanges.push({
    from: currentDate.toISOString(),
    to: toDate.toISOString(),
  });

  currentDate = new Date(toDate);
  currentDate.setDate(currentDate.getDate() + 1);
  currentDate.setHours(0, 0, 0, 0);
}
```

### **2. Statistics Calculation**

#### **Participation Score**

```javascript
// Tính điểm tham gia (vắng = 0.5 điểm)
let totalParticipationScore = 0;

diaryResults.forEach((diaryData, index) => {
  if (diaryData && diaryData.data && diaryData.data.details) {
    const details = diaryData.data.details;

    if (details.length > 1) {
      // Lớp có nhiều học viên
      const absentDetails = details.filter(
        (detail) => detail.isParticipated === false
      );

      if (absentDetails.length === 2) {
        totalParticipationScore += 0.5;
      }
    } else {
      // Lớp 1:1
      details.forEach((detail) => {
        if (detail.isParticipated === false) {
          totalParticipationScore += 0.5;
        }
      });
    }
  }
});

// Số lớp hiệu quả = Tổng lớp - Điểm vắng
const totalClasses = totalFinishedCount - totalParticipationScore;
```

#### **Diary Data Processing**

```javascript
// Xử lý Diary API response để lấy thông tin học viên
const processDiaryData = (diaryResponse) => {
  if (!diaryResponse?.data?.details) {
    return { absentStudents: [], participationScore: 0 };
  }

  const details = diaryResponse.data.details;
  const absentStudents = [];
  let participationScore = 0;

  details.forEach((student) => {
    if (!student.isParticipated) {
      // Học viên vắng
      participationScore += 0.5;

      absentStudents.push({
        studentId: student.studentId,
        studentName: student.studentName,
        studentCode: student.studentCode,
        lesson: diaryResponse.data.generalInfo.lesson,
        curriculum: diaryResponse.data.generalInfo.curriculumName,
      });
    }
  });

  return { absentStudents, participationScore };
};

// Sử dụng trong vòng lặp chính
diaryResults.forEach((diaryData, index) => {
  const { absentStudents, participationScore } = processDiaryData(diaryData);

  totalParticipationScore += participationScore;
  if (absentStudents.length > 0) {
    allAbsentStudents.push(...absentStudents);
  }
});
```

---

## ⚠️ **Error Handling**

### **Common HTTP Status Codes**

| Status | Meaning           | Action                                      |
| ------ | ----------------- | ------------------------------------------- |
| 200    | Success           | Process data normally                       |
| 401    | Unauthorized      | Token expired/invalid - Ask user to refresh |
| 403    | Forbidden         | Access denied - Check permissions           |
| 404    | Not Found         | Diary/class not found - Skip gracefully     |
| 429    | Too Many Requests | Rate limited - Wait and retry               |
| 500+   | Server Error      | Server issue - Try again later              |

### **Network Errors**

- **Timeout**: Request takes too long (>30s)
- **CORS**: Cross-origin request blocked
- **Failed to fetch**: Network connection issue

---

## 🔧 **Performance Optimizations**

### **1. Rate Limiting**

```javascript
import pLimit from "p-limit";

const limit = pLimit(5); // Giới hạn 5 concurrent requests
const diaryPromises = finishedClasses.map((classItem) =>
  limit(() => fetchDiaryDetails(classItem.classSessionId))
);
```

### **2. Request Timeout**

```javascript
// Timeout cho individual requests
signal: AbortSignal.timeout(30000); // 30 seconds

// Timeout cho initial API check
signal: AbortSignal.timeout(15000); // 15 seconds
```

### **3. Graceful Error Handling**

```javascript
// Xử lý 404 gracefully
if (response.status === 404) {
  console.warn(`📭 Diary not found: ${classSessionId}`);
  return null; // Skip, don't throw error
}

// Xử lý server errors gracefully
if (response.status >= 500) {
  console.warn(`⚠️ Server error: ${response.status}`);
  return null; // Skip, don't throw error
}
```

---

## 📱 **Usage Examples**

### **1. Fetch Products**

```bash
curl 'https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher/products?page=SCHEDULE' \
  -H 'authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'content-type: application/json'
```

### **2. Fetch Shifts for Date Range**

#### **Basic Example**

```bash
curl 'https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher/shifts?status[]=ACTIVE&fromDate=2025-01-01T00:00:00Z&toDate=2025-01-31T23:59:59Z&product_ids[]=1708&product_ids[]=1705' \
  -H 'authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'content-type: application/json'
```

#### **Real Example with All Product IDs**

```bash
curl 'https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/teacher/shifts?status%5B%5D=ACTIVE&fromDate=2025-08-29T00%3A00%3A00.000Z&toDate=2025-08-31T23%3A59%3A59.999Z&product_ids[]=1708&product_ids[]=1705&product_ids[]=23&product_ids[]=1&product_ids[]=2&product_ids[]=3&product_ids[]=2876&product_ids[]=1421&product_ids[]=1424&product_ids[]=1376&product_ids[]=1423&product_ids[]=1422&product_ids[]=1762&product_ids[]=1765&product_ids[]=1750&product_ids[]=1753&product_ids[]=1759&product_ids[]=1756&product_ids[]=1794&product_ids[]=1795&product_ids[]=1799&product_ids[]=1770&product_ids[]=1792&product_ids[]=1793&product_ids[]=1773&product_ids[]=1774&product_ids[]=1778&product_ids[]=1771&product_ids[]=1772&product_ids[]=18&product_ids[]=1697&product_ids[]=1701&product_ids[]=1617&product_ids[]=1621&product_ids[]=1593&product_ids[]=1597&product_ids[]=1577&product_ids[]=1581&product_ids[]=1641&product_ids[]=1645&product_ids[]=1633&product_ids[]=1637&product_ids[]=1625&product_ids[]=1629&product_ids[]=1743&product_ids[]=1744&product_ids[]=1745&product_ids[]=1786&product_ids[]=1808&product_ids[]=1809&product_ids[]=1810&product_ids[]=1807&product_ids[]=1863&product_ids[]=1857&product_ids[]=1859&product_ids[]=1865&product_ids[]=1867&product_ids[]=1860&product_ids[]=1665&product_ids[]=1669&product_ids[]=1657&product_ids[]=1661&product_ids[]=1649&product_ids[]=1653&product_ids[]=1601&product_ids[]=1605&product_ids[]=1689&product_ids[]=1693&product_ids[]=1681&product_ids[]=1685&product_ids[]=1673&product_ids[]=1677&product_ids[]=1609&product_ids[]=1613&product_ids[]=1585&product_ids[]=1589' \
  -H 'accept: */*' \
  -H 'accept-language: en,vi;q=0.9' \
  -H 'authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'content-type: application/json'
```

**Note**: URL encoding cho special characters:

- `[` → `%5B`
- `]` → `%5D`
- `:` → `%3A`

### **3. Fetch Diary Details**

#### **Basic Example**

```bash
curl 'https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/diary/12345' \
  -H 'authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'content-type: application/json'
```

#### **Real Example with Complete Headers**

```bash
curl 'https://api-teacher-ican.vercel.app/api/teacher/api/v1/api/diary/9894523' \
  -H 'accept: */*' \
  -H 'accept-language: en,vi;q=0.9' \
  -H 'authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'content-type: application/json' \
  -H 'dnt: 1' \
  -H 'origin: http://localhost:3000' \
  -H 'referer: http://localhost:3000/' \
  -H 'sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
```

**Note**:

- `classSessionId` từ Shifts API response
- Headers tối thiểu: `authorization` và `content-type`
- Các headers khác là optional cho browser compatibility

---

## 📝 **Notes**

1. **Date Format**: Sử dụng ISO 8601 format cho tất cả dates
2. **Time Handling**:
   - Start time: 00:00:00 (beginning of day)
   - End time: 23:59:59 (end of day)
3. **Product IDs**: Lấy từ products API response
4. **Class Status**: Chỉ xử lý classes có status "FINISHED"
5. **Duplicate Prevention**: Kiểm tra duplicate để tránh đếm trùng lặp

---

## 🔄 **Version History**

- **v1.0**: Initial API documentation
- **v1.1**: Added error handling and performance optimizations
- **v1.2**: Added data processing logic and examples
- **v1.3**: Enhanced Shifts API documentation with real response format, class status values, product types, and curriculum levels
- **v1.4**: Enhanced Diary API documentation with complete response structure, detailed field descriptions, and advanced data processing examples

---

**📅 Last Updated**: 2025-01-27  
**👨‍💻 Maintained by**: Teacher Tracking System Team
