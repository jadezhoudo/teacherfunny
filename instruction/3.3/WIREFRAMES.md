# 🎨 Teacher Tracking System - Wireframes

## 📱 Tổng Quan Wireframes

Wireframes này mô tả giao diện người dùng của Teacher Tracking System, bao gồm:

- **Teacher Stats Page**: Trang chính cho giáo viên
- **Admin Dashboard**: Trang quản trị cho admin
- **Navigation System**: Hệ thống điều hướng

---

## 🏠 Teacher Stats Page (Trang Chính)

### **Layout Tổng Thể**

```
┌─────────────────────────────────────────────────────────────┐
│                    Teacher Tracking System                  │
├─────────────────────────────────────────────────────────────┤
│ [☀ Light Mode] [🌙 Dark Mode]                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ⭐ Teacher Statistics                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────────────────────────────┐ │
│ │   By Month  │ │            By Date Range               │ │
│ └─────────────┘ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Month: [January ▼]  Year: [2025 ▼]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              Calculate Statistics                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ From Date: [2025-01-01]                                │ │
│ │ To Date:   [2025-01-31]                                │ │
│ │                                                         │ │
│ │ Selected Date Range: 01/01/2025 00:00 → 31/01/2025 23:59│
│ │ Total: 31 days (from start of first day to end of last) │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              Calculate Statistics for Date Range        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Use Manual Code: [⚪] [●]                               │
│ │                                                         │
│ │ [Enter code here                    ] [Save Code]       │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Processed count: 25                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📊 Statistics Summary                │ │
│ │                                                         │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
│ │ │   25    │ │   2.5   │ │  22.5   │ │1,125,000│       │ │
│ │ │ Total   │ │Absences │ │Effective│ │  Total  │       │ │
│ │ │Classes  │ │         │ │ Classes │ │ Amount  │       │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │ │
│ │                                                         │ │
│ │ Period: 01/01/2025 00:00 - 31/01/2025 23:59            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    - Absent Students -                  │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Class: Math 101                                     │ │
│ │ │ Monday, January 20, 2025                            │ │
│ │ │ Student: John Doe                                   │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              Support the Project ❤️                     │ │
│ │ If you find this tool helpful, consider buying me a    │ │
│ │ coffee!                                                │ │
│ │                                                         │ │
│ │ TP Bank: 0377 3935 368                                │ │
│ │                                                         │ │
│ │                    [QR Code Image]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ • Ver 3.3 • ©2025 Châu Đỗ. All rights reserved. • 👀 Visitors: 1234 │
└─────────────────────────────────────────────────────────────┘
```

### **Mobile Layout**

```
┌─────────────────────────┐
│   Teacher Tracking      │
│      System             │
├─────────────────────────┤
│ [☀] [🌙]               │
├─────────────────────────┤
│   ⭐ Teacher Statistics │
├─────────────────────────┤
│ ┌─────┐ ┌─────────────┐ │
│ │Month│ │Date Range   │ │
│ └─────┘ └─────────────┘ │
├─────────────────────────┤
│ Month: [January ▼]      │
│ Year:  [2025 ▼]         │
│                         │
│ [Calculate Statistics]  │
│                         │
│ From: [2025-01-01]      │
│ To:   [2025-01-31]      │
│                         │
│ [Calculate Date Range]  │
│                         │
│ [📊 Statistics Summary] │
│ ┌─────┐ ┌─────┐        │
│ │ 25  │ │2.5  │        │
│ │Total│ │Abs  │        │
│ └─────┘ └─────┘        │
│ ┌─────┐ ┌─────────────┐ │
│ │22.5 │ │1,125,000    │ │
│ │Eff  │ │Amount       │ │
│ └─────┘ └─────────────┘ │
└─────────────────────────┘
```

---

## 🔐 Admin Dashboard

### **Login Screen**

```
┌─────────────────────────────────────────────────────────────┐
│                    🔐 Admin Dashboard                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Please Login                            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Email:                                                  │
│ │ [admin@example.com                    ]                 │
│ │                                                         │
│ │ Password:                                               │
│ │ [••••••••••••••••••••••••••••••••••••]                 │
│ │                                                         │
│ │                    [Login]                              │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Main Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│                    🔐 Admin Dashboard                      │
├─────────────────────────────────────────────────────────────┤
│ Hello, admin@example.com                    [Logout]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📊 Overview                          │
│ │                                                         │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
│ │ │   25    │ │  150    │ │7,500,000│ │  1234   │       │ │
│ │ │Teachers │ │ Classes │ │ Amount  │ │Visitors │       │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │ │
│ │ │Details  │ │Teacher  │ │Visitor  │                    │ │
│ │ │ User    │ │Statistics│ │Analytics│                    │ │
│ │ └─────────┘ └─────────┘ └─────────┘                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📋 User List                         │
│ │                                                         │
│ │ Search: [Search by email...] [Refresh]                  │
│ │                                                         │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ Email           │ Phone      │ Last Login │ Actions │ │ │
│ │ ├─────────────────────────────────────────────────────┤ │ │
│ │ │teacher1@...     │0123456789  │2025-01-20  │[📊View] │ │ │
│ │ │teacher2@...     │0987654321  │2025-01-19  │[📊View] │ │ │
│ │ │teacher3@...     │1122334455  │2025-01-18  │[📊View] │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **User Statistics Modal**

```
┌─────────────────────────────────────────────────────────────┐
│                    📊 User Statistics                      │
│                                                             │
│ User: teacher1@example.com                                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📅 Select Date Range or Month/Year                      │
│ │                                                         │
│ │ ○ Monthly    ● Date Range                               │
│ │                                                         │
│ │ Month: [January ▼]  Year: [2025 ▼]                     │
│ │                                                         │
│ │ From Date: [2025-01-01]  To Date: [2025-01-31]         │
│ │                                                         │
│ │ Selected Date Range: 01/01/2025 00:00 → 31/01/2025 23:59│
│ │ Total: 31 days (from start of first day to end of last) │
│ │                                                         │
│ │ [📊 Fetch Statistics for Date Range]                    │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    📊 Statistics Result                  │
│ │ (Date Range: 01/01/2025 00:00 → 31/01/2025 23:59)      │
│ │                                                         │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │
│ │ │   25    │ │   2.5   │ │  22.5   │ │1,125,000│       │ │
│ │ │ Total   │ │Absences │ │Effective│ │  Total  │       │ │
│ │ │Classes  │ │         │ │ Classes │ │ Amount  │       │ │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │ │
│ │                                                         │ │
│ │ Debug Info:                                              │ │
│ │ • Processed Diaries: 25                                 │ │
│ │ • Skipped Diaries: 0                                     │ │
│ │ • Total Diaries: 25                                      │ │
│ │ • Success Rate: 100%                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Close]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧭 Navigation System

### **Top Navigation Bar**

```
┌─────────────────────────────────────────────────────────────┐
│ Teacher Tracking System                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐                           │
│ │ 👨‍🏫 Teacher Stats │ 🔐 Admin Dashboard │               │
│ └─────────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### **Active State Navigation**

```
┌─────────────────────────────────────────────────────────────┐
│ Teacher Tracking System                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐                           │
│ │ 👨‍🏫 Teacher Stats │ 🔐 Admin Dashboard │               │
│ │ [ACTIVE]    │              │                           │
│ └─────────────┘ └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Design Breakpoints

### **Desktop (1024px+)**

- Full layout với sidebar navigation
- Multi-column statistics display
- Hover effects và advanced interactions

### **Tablet (768px - 1023px)**

- Condensed layout
- Stacked statistics cards
- Touch-friendly buttons

### **Mobile (320px - 767px)**

- Single column layout
- Collapsible sections
- Swipe gestures cho navigation

---

## 🎨 Design System

### **Color Palette**

```
Primary: #3B82F6 (Blue-600)
Secondary: #10B981 (Green-500)
Success: #059669 (Green-600)
Warning: #F59E0B (Yellow-500)
Error: #EF4444 (Red-500)
Info: #06B6D4 (Cyan-500)
```

### **Typography**

```
Heading 1: 2.25rem (36px) - Font-bold
Heading 2: 1.875rem (30px) - Font-semibold
Heading 3: 1.5rem (24px) - Font-medium
Body: 1rem (16px) - Font-normal
Small: 0.875rem (14px) - Font-normal
```

### **Spacing System**

```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
2xl: 3rem (48px)
```

### **Component States**

```
Default: bg-gray-100 text-gray-900
Hover: bg-gray-200 text-gray-900
Active: bg-blue-600 text-white
Disabled: bg-gray-300 text-gray-500
Loading: bg-blue-500 text-white animate-pulse
```

---

## 🔄 Interactive Elements

### **Buttons**

```
Primary: bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded
Secondary: bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded
Danger: bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded
Success: bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded
```

### **Form Elements**

```
Input: border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500
Select: border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500
Checkbox: w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500
Radio: w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500
```

### **Cards & Containers**

```
Card: bg-white border border-gray-200 rounded-lg shadow-sm p-6
Modal: bg-white border border-gray-200 rounded-lg shadow-xl p-6 max-w-2xl mx-auto
Alert: bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800
```

---

## 📊 Data Visualization

### **Statistics Cards**

```
┌─────────────────────────────────────────┐
│                   25                    │
│              Total Classes              │
│              [Icon/Color]               │
└─────────────────────────────────────────┘
```

### **Progress Indicators**

```
Loading: [🔄 Fetching Stats...]
Progress: [████████░░ 80%]
Status: [✅ Success] [❌ Error] [⚠️ Warning]
```

### **Data Tables**

```
┌─────────────────────────────────────────────────────────┐
│ Header 1 │ Header 2 │ Header 3 │ Actions               │
├─────────────────────────────────────────────────────────┤
│ Data 1   │ Data 2   │ Data 3   │ [Button] [Button]    │
│ Data 4   │ Data 5   │ Data 6   │ [Button] [Button]    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 User Experience Guidelines

### **Loading States**

- Skeleton screens cho content loading
- Progress bars cho long operations
- Disabled states cho buttons during processing

### **Error Handling**

- Clear error messages với suggested solutions
- Retry buttons cho failed operations
- Graceful degradation cho partial failures

### **Success Feedback**

- Confirmation messages
- Visual indicators (checkmarks, green colors)
- Auto-dismiss notifications

### **Accessibility**

- High contrast colors
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators

---

## 🔧 Implementation Notes

### **CSS Framework**

- **Tailwind CSS** cho styling
- **Responsive utilities** cho mobile-first design
- **Custom components** cho specific UI elements

### **State Management**

- **React useState** cho local state
- **Firebase onSnapshot** cho real-time updates
- **Local storage** cho user preferences

### **Animation & Transitions**

- **CSS transitions** cho hover effects
- **Loading spinners** cho async operations
- **Smooth scrolling** cho navigation

---

**Version**: 1.0  
**Last Updated**: January 2025  
**Designer**: Châu Đỗ  
**Framework**: Tailwind CSS + React
