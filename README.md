# 🥬 Halem Farm - ระบบสั่งซื้อผักออร์แกนิค

ระบบสั่งซื้อผักออร์แกนิคออนไลน์สำหรับ Halem Farm พัฒนาด้วย Vanilla JavaScript, Tailwind CSS และ Modern Web Standards

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-blue.svg)](https://tailwindcss.com/)

## 📋 สารบัญ

- [คุณสมบัติ](#-คุณสมบัติ)
- [สถาปัตยกรรม](#-สถาปัตยกรรม)
- [การติดตั้ง](#-การติดตั้ง)
- [การใช้งาน](#-การใช้งาน)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [การพัฒนา](#-การพัฒนา)
- [API Documentation](#-api-documentation)
- [การปรับแต่ง](#-การปรับแต่ง)
- [การปิดใช้งาน](#-การปิดใช้งาน)
- [License](#-license)

## ✨ คุณสมบัติ

### 🛒 การสั่งซื้อ
- **ระบบสั่งซื้อแบบเรียลไทม์** - อัปเดตราคารวมทันที
- **การจัดการลูกค้า** - เลือกร้านเก่าหรือเพิ่มร้านใหม่
- **วิธีชำระเงิน** - เงินสด, โอนเงิน, เครดิต
- **การเลือกวันจัดส่ง** - ตรวจสอบวันหยุดฟาร์มอัตโนมัติ
- **ตรวจสอบเวลาตัดรอบ** - สั่งก่อน 08:30 น. สำหรับจัดส่งวันเดียวกัน

### 📱 UI/UX
- **Responsive Design** - รองรับทุกขนาดหน้าจอ
- **Thai Typography** - ฟอนต์ Kanit สำหรับภาษาไทย
- **Loading States** - แสดงสถานะโหลดข้อมูล
- **Toast Notifications** - แจ้งเตือนสำเร็จ/ผิดพลาด
- **Form Validation** - ตรวจสอบข้อมูลแบบเรียลไทม์

### 🔧 Technical Features
- **Modern ES6+ JavaScript** - Clean และ maintainable code
- **Modular Architecture** - แบ่งแยกหน้าที่ชัดเจน
- **Error Handling** - จัดการข้อผิดพลาดอย่างครอบคลุม
- **API Integration** - เชื่อมต่อกับ REST API
- **Configuration Management** - จัดการ config แยกตาม environment

## 🏗️ สถาปัตยกรรม

### Frontend Architecture
```
┌─────────────────────────────────────────┐
│                Browser                   │
├─────────────────────────────────────────┤
│              index.html                  │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  config.js  │  │   script.js     │   │
│  │             │  │                 │   │
│  │ • ENV       │  │ • App           │   │
│  │ • CONFIG    │  │ • ApiService    │   │
│  │ • MESSAGES  │  │ • OrderManager  │   │
│  └─────────────┘  │ • UI            │   │
│                   │ • Utils         │   │
│                   └─────────────────┘   │
├─────────────────────────────────────────┤
│               style.css                  │
│                                         │
│ • CSS Variables                         │
│ • Responsive Design                     │
│ • Animations                            │
│ • Accessibility                        │
└─────────────────────────────────────────┘
```

### Code Organization
```
script.js มีการแบ่งหมวดหมู่ดังนี้:

📋 CONFIG & CONSTANTS      - การตั้งค่าและค่าคงที่
📊 APPLICATION STATE       - สถานะของแอปพลิเคชัน
🌐 API SERVICE LAYER       - การเรียก API
🛠️ UTILITY FUNCTIONS       - ฟังก์ชันช่วยเหลือ
🎨 UI COMPONENTS           - ส่วนประกอบ UI
📋 ORDER MANAGEMENT        - การจัดการคำสั่งซื้อ
📱 PAGE RENDERING          - การแสดงผลหน้าจอ
🚀 APPLICATION CONTROLLER  - ตัวควบคุมหลัก
```

## 🚀 การติดตั้ง

### ข้อกำหนดระบบ
- Web Server (Apache, Nginx, หรือ HTTP Server)
- Modern Web Browser (Chrome 90+, Firefox 90+, Safari 14+)
- Internet Connection (สำหรับ Tailwind CDN และ API calls)

### การติดตั้งแบบ Local Development

1. **Clone repository**
   ```bash
   git clone https://github.com/your-username/veg-order-webapp.git
   cd veg-order-webapp
   ```

2. **เปิด local server**
   ```bash
   # ใช้ Python
   python -m http.server 8000

   # หรือใช้ Node.js
   npx http-server

   # หรือใช้ PHP
   php -S localhost:8000
   ```

3. **เปิดในเบราว์เซอร์**
   ```
   http://localhost:8000?customer=TestUser&userId=12345
   ```

### การติดตั้งแบบ Production

1. **Upload ไฟล์ไปยัง web server**
   ```
   index.html
   script.js
   config.js
   style.css
   logo.png
   ```

2. **ปรับแต่ง config.js**
   ```javascript
   const ENV = {
     CURRENT: 'production', // เปลี่ยนเป็น production
     // ...
   };
   ```

3. **ตั้งค่า URL parameters**
   ```
   https://yourdomain.com/?customer=CustomerName&userId=UniqueUserID
   ```

## 📖 การใช้งาน

### พารามิเตอร์ URL
| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `customer` | ชื่อลูกค้า/ผู้สั่ง | ✅ | `customer=JohnDoe` |
| `userId` | ID ลูกค้าในระบบ | ✅ | `userId=U1234567890` |

### ขั้นตอนการสั่งซื้อ

1. **เลือกร้าน** - เลือกร้านเก่าหรือเพิ่มร้านใหม่
2. **เลือกวิธีชำระเงิน** - เงินสด, โอนเงิน, หรือเครดิต
3. **เลือกวันจัดส่ง** - ระบบจะแสดงวันที่เหมาะสม
4. **เลือกผัก** - กรอกจำนวนผักที่ต้องการ (กิโลกรัม)
5. **ตรวจสอบคำสั่งซื้อ** - ยืนยันข้อมูลทั้งหมด
6. **ยืนยันการสั่งซื้อ** - ระบบจะส่งคำสั่งซื้อไปยัง API

### Business Rules

- **เวลาตัดรอบ**: 08:30 น. ทุกวัน
- **การจัดส่ง**: หากสั่งก่อน 08:30 จัดส่งวันเดียวกัน, หากเลยเวลาจัดส่งวันถัดไป
- **วันหยุดฟาร์ม**: ระบบจะตรวจสอบและข้ามวันหยุดอัตโนมัติ
- **จำนวนขั้นต่ำ**: 0.5 กก. ต่อรายการ
- **จำนวนสูงสุด**: 50 กก. ต่อรายการ

## 📁 โครงสร้างโปรเจค

```
veg-order-webapp/
├── 📄 index.html          # หน้าหลักของแอปพลิเคชัน
├── 📄 script.js           # JavaScript หลัก (Modular Architecture)
├── 📄 config.js           # การตั้งค่าและ configuration
├── 📄 style.css           # CSS สไตล์และ responsive design
├── 🖼️ logo.png            # โลโก้ Halem Farm
└── 📖 README.md           # เอกสารประกอบ (ไฟล์นี้)
```

### ไฟล์สำคัญ

#### 📄 script.js - Main Application
```javascript
// 🔧 CONFIG & CONSTANTS - การตั้งค่า
// 📊 APPLICATION STATE - สถานะแอป
// 🌐 API SERVICE LAYER - การเรียก API
// 🛠️ UTILITY FUNCTIONS - ฟังก์ชันช่วย
// 🎨 UI COMPONENTS - ส่วนประกอบ UI
// 📋 ORDER MANAGEMENT - จัดการคำสั่งซื้อ
// 📱 PAGE RENDERING - แสดงผลหน้าจอ
// 🚀 APPLICATION CONTROLLER - ควบคุมหลัก
```

#### 📄 config.js - Configuration Management
```javascript
// Environment settings (dev/prod)
// Feature flags
// Error messages
// Business rules
// API endpoints
```

#### 📄 style.css - Styling & Design System
```css
/* CSS Variables */
/* Base styles */
/* Components */
/* Responsive design */
/* Animations */
/* Accessibility */
```

## 🛠️ การพัฒนา

### Development Environment

1. **เปิด Development Mode**
   ```javascript
   // ใน config.js
   const ENV = {
     CURRENT: 'development',
     // ...
   };
   ```

2. **Debug Logging**
   ```javascript
   // จะเปิด debug logs อัตโนมัติใน development mode
   console.log("Debug info will show in development");
   ```

3. **Local API Server**
   ```
   API calls จะไปที่ http://localhost:3000/api
   ```

### Code Style Guidelines

#### JavaScript
- ใช้ ES6+ features (async/await, destructuring, etc.)
- ใช้ const/let แทน var
- ใช้ template literals สำหรับ strings
- ใช้ arrow functions เมื่อเหมาะสม
- ใส่ comments เป็นภาษาไทยในส่วนที่ซับซ้อน

#### CSS
- ใช้ CSS Variables สำหรับ theming
- ใช้ Mobile-first approach
- ใช้ semantic class names
- รองรับ accessibility

#### HTML
- ใช้ semantic HTML elements
- ใส่ alt attributes สำหรับ images
- ใช้ proper form labels
- รองรับ screen readers

### การเพิ่มฟีเจอร์ใหม่

1. **เพิ่ม Feature Flag**
   ```javascript
   // ใน config.js
   const FEATURE_FLAGS = {
     ENABLE_NEW_FEATURE: true,
     // ...
   };
   ```

2. **เพิ่ม API Endpoint**
   ```javascript
   // ใน CONFIG.API.ENDPOINTS
   NEW_ENDPOINT: '/new-feature'
   ```

3. **เพิ่ม Error Messages**
   ```javascript
   // ใน ERROR_MESSAGES
   NEW_FEATURE: {
     VALIDATION_ERROR: 'ข้อความ error'
   }
   ```

## 🌐 API Documentation

### Base URL
- **Production**: `https://deliback.vercel.app/api`
- **Development**: `http://localhost:3000/api`

### Endpoints

#### GET `/vegetables/available`
ดึงรายการผักที่วางจำหน่าย

**Response:**
```json
[
  {
    "nameEng": "Lettuce",
    "nameTh": "ผักกาดหอม",
    "price": 25,
    "image": "lettuce.jpg"
  }
]
```

#### GET `/holidays/schedule`
ดึงตารางวันหยุดฟาร์ม

**Response:**
```json
{
  "schedule": {
    "อาทิตย์": false,
    "จันทร์": true,
    "อังคาร": true,
    "พุธ": true,
    "พฤหัสบดี": true,
    "ศุกร์": true,
    "เสาร์": true
  }
}
```

#### GET `/user-order-history?userId={userId}`
ดึงประวัติการสั่งซื้อของลูกค้า

**Parameters:**
- `userId` (required): ID ของลูกค้า

**Response:**
```json
{
  "customer": [
    {
      "shop": "ร้านค้าA",
      "method": "โอนเงิน"
    }
  ]
}
```

#### POST `/orders/handle-order`
ส่งคำสั่งซื้อใหม่

**Request Body:**
```json
{
  "date": "2024-01-01T10:00:00.000Z",
  "deliveryDate": "2024-01-02",
  "user": "ร้านค้าA",
  "userLine": "CustomerName",
  "payMethod": "โอนเงิน",
  "userId": "U1234567890",
  "order": [
    {
      "name": "Lettuce",
      "nameTh": "ผักกาดหอม",
      "amount": 2,
      "price": 25,
      "subtotal": 50,
      "image": "lettuce.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORDER123",
  "message": "Order received successfully"
}
```

## ⚙️ การปรับแต่ง

### Environment Configuration

#### Production Setup
```javascript
// config.js
const ENV = {
  CURRENT: 'production',
  PRODUCTION: {
    API_BASE_URL: 'https://your-api-domain.com/api',
    DEBUG: false,
    LOG_LEVEL: 'error'
  }
};
```

#### Development Setup
```javascript
// config.js
const ENV = {
  CURRENT: 'development',
  DEVELOPMENT: {
    API_BASE_URL: 'http://localhost:3000/api',
    DEBUG: true,
    LOG_LEVEL: 'debug'
  }
};
```

### Business Rules Configuration

```javascript
// config.js
const APP_CONFIG = {
  ORDER_CUTOFF_TIME: {
    HOUR: 8,        // เปลี่ยนเวลาตัดรอบ
    MINUTE: 30
  },
  VALIDATION: {
    MIN_ORDER_AMOUNT: 0.5,  // จำนวนขั้นต่ำ
    MAX_ORDER_AMOUNT: 50,   // จำนวนสูงสุด
  }
};
```

### UI Customization

#### สี (Colors)
```css
/* style.css */
:root {
  --primary-green: #16a34a;        /* สีหลัก */
  --primary-green-hover: #15803d;  /* สีเมื่อ hover */
  --secondary-gray: #f3f4f6;       /* สีพื้นหลัง */
}
```

#### ฟอนต์ (Fonts)
```css
/* style.css */
body {
  font-family: 'Kanit', sans-serif; /* เปลี่ยนฟอนต์ */
}
```

### Feature Flags

```javascript
// config.js
const FEATURE_FLAGS = {
  ENABLE_DEBUG_LOGGING: true,    // เปิด/ปิด debug
  ENABLE_ANALYTICS: false,       // เปิด/ปิด analytics
  ENABLE_OFFLINE_MODE: false,    // เปิด/ปิด offline mode
};
```

## 🚫 การปิดใช้งาน

### ปิดฟาร์มชั่วคราว

1. **แก้ไข script.js**
   ```javascript
   // ใน App.fetchInitialData()
   // เปลี่ยนจาก PageRenderer.renderForm() เป็น
   PageRenderer.renderFormClosed();
   ```

2. **หรือใช้ Feature Flag**
   ```javascript
   // ใน config.js
   const FEATURE_FLAGS = {
     ENABLE_ORDERING: false,  // ปิดระบบสั่งซื้อ
   };
   ```

### ปิดฟีเจอร์เฉพาะ

```javascript
// config.js
const FEATURE_FLAGS = {
  ENABLE_CUSTOMER_HISTORY: false,  // ปิดประวัติลูกค้า
  ENABLE_MULTIPLE_PAYMENT: false,  // ปิดหลายวิธีชำระ
  ENABLE_DATE_VALIDATION: false,   // ปิดตรวจสอบวันที่
};
```

## 🧪 การทดสอบ

### Manual Testing Checklist

#### 📱 Responsive Design
- [ ] ทดสอบบนมือถือ (320px - 768px)
- [ ] ทดสอบบนแท็บเล็ต (768px - 1024px)
- [ ] ทดสอบบนเดสก์ท็อป (1024px+)

#### 🛒 การสั่งซื้อ
- [ ] เลือกร้านลูกค้า
- [ ] เลือกวิธีชำระเงิน
- [ ] เลือกวันจัดส่ง
- [ ] เพิ่ม/ลบรายการผัก
- [ ] คำนวณราคารวม
- [ ] ยืนยันคำสั่งซื้อ

#### 🚦 Error Handling
- [ ] ไม่มีการเชื่อมต่ออินเทอร์เน็ต
- [ ] API ส่ง error response
- [ ] ข้อมูลไม่ครบถ้วน
- [ ] เลือกวันหยุดฟาร์ม

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Supported |
| Firefox | 90+ | ✅ Supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Supported |
| IE | All | ❌ Not Supported |

## 🔧 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

#### 1. ไม่สามารถโหลดข้อมูลได้
**อาการ**: หน้าจอค้างที่ "กำลังโหลดระบบ..."

**วิธีแก้**:
```javascript
// ตรวจสอบ Network tab ใน DevTools
// ตรวจสอบ Console errors
// ตรวจสอบ API URL ใน config.js
```

#### 2. การส่งคำสั่งซื้อไม่สำเร็จ
**อาการ**: แสดง error toast หลังกดยืนยัน

**วิธีแก้**:
```javascript
// ตรวจสอบ payload ใน Network tab
// ตรวจสอบ API endpoint
// ตรวจสอบ CORS settings
```

#### 3. Layout เสียบนมือถือ
**อาการ**: Element ซ้อนทับกันหรือล้นออกจอ

**วิธีแก้**:
```css
/* ตรวจสอบ viewport meta tag */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* ตรวจสอบ responsive breakpoints */
@media (max-width: 640px) { /* styles */ }
```

### Debug Mode

```javascript
// เปิด debug mode ใน config.js
const ENV = {
  CURRENT: 'development',
  // หรือ
};

const FEATURE_FLAGS = {
  ENABLE_DEBUG_LOGGING: true,
};
```

## 🚀 การ Deploy

### Static Hosting (แนะนำ)

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
# Drag & drop ไฟล์ไปที่ netlify.com
# หรือเชื่อมต่อ GitHub repository
```

#### GitHub Pages
```bash
# Push ไฟล์ไปยัง GitHub repository
# เปิด GitHub Pages ใน Settings
```

### Traditional Web Hosting

1. **Upload ไฟล์ผ่าน FTP/SFTP**
   ```
   index.html
   script.js
   config.js
   style.css
   logo.png
   ```

2. **ตั้งค่า Web Server**
   ```apache
   # .htaccess สำหรับ Apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(.*)$ index.html [QSA,L]
   ```

### Environment Variables

```javascript
// สำหรับ production
const ENV = {
  CURRENT: 'production',
  PRODUCTION: {
    API_BASE_URL: 'https://api.halemfarm.com',
    DEBUG: false
  }
};
```

## 📈 Performance Optimization

### Code Splitting
```javascript
// แยก config และ utility functions
// ใช้ dynamic imports เมื่อจำเป็น
const utils = await import('./utils.js');
```

### Image Optimization
```html
<!-- ใช้ modern image formats -->
<img src="logo.webp" alt="Halem Farm" loading="lazy">

<!-- ใช้ responsive images -->
<img srcset="logo-small.png 300w, logo-large.png 600w"
     sizes="(max-width: 640px) 300px, 600px">
```

### Caching Strategy
```javascript
// Service Worker สำหรับ offline support
// Cache API responses
// Cache static assets
```

## 📊 Analytics & Monitoring

### การติดตาม (ถ้าต้องการ)

```javascript
// Google Analytics
gtag('config', 'GA_MEASUREMENT_ID');

// Custom events
gtag('event', 'order_submitted', {
  'order_value': totalPrice,
  'payment_method': payMethod
});
```

### Error Monitoring

```javascript
// Sentry.io
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
});
```

## 🤝 การร่วมพัฒนา

### Git Workflow

1. **Fork repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Commit changes**
   ```bash
   git commit -m "feat: add new feature"
   ```
4. **Push to branch**
   ```bash
   git push origin feature/new-feature
   ```
5. **Create Pull Request**

### Commit Message Convention

```
feat: เพิ่มฟีเจอร์ใหม่
fix: แก้ไขบัก
docs: อัปเดตเอกสาร
style: แก้ไข code style
refactor: ปรับปรุงโครงสร้างโค้ด
test: เพิ่มการทดสอบ
chore: งานบำรุงรักษา
```

## 📞 การติดต่อ

- **Developer**: [Your Name]
- **Email**: [your.email@example.com]
- **GitHub**: [https://github.com/your-username]
- **Issues**: [https://github.com/your-username/veg-order-webapp/issues]

## 📄 License

MIT License - ดูรายละเอียดใน [LICENSE](LICENSE) file

---

**Made with ❤️ for Halem Farm**

> ระบบนี้พัฒนาขึ้นเพื่อสนับสนุนเกษตรกรไทยและการบริโภคผักออร์แกนิค 🌱

---

### 📚 เอกสารเพิ่มเติม

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)