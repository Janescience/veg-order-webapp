// =====================================================
// 🔧 HALEM FARM CONFIGURATION
// =====================================================

/**
 * Environment Configuration
 * Switch between development and production environments
 */
const ENV = {
  // Current environment: 'development' | 'production'
  CURRENT: 'production',

  // Development settings
  DEVELOPMENT: {
    API_BASE_URL: 'http://localhost:3000/api',
    DEBUG: true,
    LOG_LEVEL: 'debug'
  },

  // Production settings
  PRODUCTION: {
    API_BASE_URL: 'https://deliback.vercel.app/api',
    DEBUG: false,
    LOG_LEVEL: 'error'
  }
};

/**
 * Legacy Google Apps Script URLs
 * @deprecated These are kept for backward compatibility
 * Will be removed in future versions
 */
const LEGACY_CONFIG = {
  // Production GAS URL
  GOOGLE_SCRIPT_URL_PROD: "https://script.google.com/macros/s/AKfycbw3zWzBDyaPL9DJ6Tby2hS443_8azGsFVccwmpbWM-HFzK7XjD90pRp9HRIP6VsLtwB3A/exec",

  // Development GAS URL
  GOOGLE_SCRIPT_URL_DEV: "https://script.google.com/macros/s/AKfycbw3Psnrrs_kFL_D8klO-opp_5gxdKs0jUqN3DU8hchGAGxatVw2qSjvlU8U_01j5YVp/exec"
};

/**
 * Application Configuration
 * Settings that control app behavior
 */
const APP_CONFIG = {
  // Business rules
  ORDER_CUTOFF_TIME: {
    HOUR: 8,
    MINUTE: 30
  },

  // UI settings
  UI: {
    LOADING_DELAY: 300,
    TOAST_SUCCESS_DURATION: 3000,
    TOAST_ERROR_DURATION: 5000,
    ANIMATION_DURATION: 200
  },

  // API settings
  API: {
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
  },

  // Form validation
  VALIDATION: {
    MIN_ORDER_AMOUNT: 0.5, // minimum kg per item
    MAX_ORDER_AMOUNT: 50,   // maximum kg per item
    MAX_CUSTOMER_NAME_LENGTH: 100,
    MIN_CUSTOMER_NAME_LENGTH: 2
  }
};

/**
 * Feature Flags
 * Enable/disable features for testing or gradual rollout
 */
const FEATURE_FLAGS = {
  ENABLE_DEBUG_LOGGING: ENV.CURRENT === 'development',
  ENABLE_ANALYTICS: ENV.CURRENT === 'production',
  ENABLE_ERROR_REPORTING: true,
  ENABLE_OFFLINE_MODE: false,
  ENABLE_PWA_FEATURES: false
};

/**
 * Thai Localization Data
 * Moved from main script for better organization
 */
const THAI_LOCALE = {
  MONTHS: [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ],

  DAYS: [
    "อาทิตย์", "จันทร์", "อังคาร", "พุธ",
    "พฤหัสบดี", "ศุกร์", "เสาร์"
  ],

  NUMBERS: [
    "ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่",
    "ห้า", "หก", "เจ็ด", "แปด", "เก้า"
  ],

  UNITS: ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"]
};

/**
 * Error Messages
 * Centralized error message configuration
 */
const ERROR_MESSAGES = {
  NETWORK: {
    FETCH_FAILED: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    TIMEOUT: 'การเชื่อมต่อล่าช้า กรุณาลองใหม่อีกครั้ง',
    SERVER_ERROR: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ'
  },

  VALIDATION: {
    CUSTOMER_NAME_REQUIRED: 'กรุณากรอกชื่อร้าน',
    CUSTOMER_NAME_TOO_SHORT: 'ชื่อร้านต้องมีอย่างน้อย 2 ตัวอักษร',
    CUSTOMER_NAME_TOO_LONG: 'ชื่อร้านยาวเกินไป (สูงสุด 100 ตัวอักษร)',
    PAYMENT_METHOD_REQUIRED: 'กรุณาเลือกวิธีชำระเงิน',
    DELIVERY_DATE_REQUIRED: 'กรุณาเลือกวันที่จัดส่ง',
    ORDER_ITEMS_REQUIRED: 'กรุณาเลือกรายการผักอย่างน้อย 1 รายการ',
    INVALID_AMOUNT: 'จำนวนไม่ถูกต้อง กรุณากรอกตัวเลขที่มากกว่า 0',
    AMOUNT_TOO_LARGE: 'จำนวนสั่งซื้อเกินขีดจำกัด (สูงสุด 50 กก. ต่อรายการ)'
  },

  BUSINESS: {
    FARM_CLOSED: 'วันหยุดฟาร์ม กรุณาเลือกวันอื่น',
    ORDER_CUTOFF_PASSED: 'เลยเวลาสั่งของวันนี้ (08:30 น.) แล้ว กรุณาเลือกวันจัดส่งเป็นวันถัดไป',
    PAST_DATE_SELECTED: 'ไม่สามารถสั่งสินค้าย้อนหลังได้ กรุณาเลือกวันที่จัดส่งใหม่'
  }
};

/**
 * Success Messages
 * Centralized success message configuration
 */
const SUCCESS_MESSAGES = {
  ORDER_SUBMITTED: 'สั่งซื้อสำเร็จ! ทางฟาร์มได้รับคำสั่งซื้อเรียบร้อยแล้ว',
  DATA_LOADED: 'โหลดข้อมูลเรียบร้อย',
  FORM_VALIDATED: 'ข้อมูลถูกต้อง'
};

/**
 * Get current environment configuration
 * @returns {Object} Current environment config
 */
function getCurrentConfig() {
  return ENV.CURRENT === 'development' ? ENV.DEVELOPMENT : ENV.PRODUCTION;
}

/**
 * Get API base URL for current environment
 * @returns {string} API base URL
 */
function getApiBaseUrl() {
  return getCurrentConfig().API_BASE_URL;
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} Debug mode status
 */
function isDebugMode() {
  return getCurrentConfig().DEBUG || FEATURE_FLAGS.ENABLE_DEBUG_LOGGING;
}

/**
 * Legacy support - get Google Script URL
 * @deprecated Use getApiBaseUrl() instead
 * @returns {string} Google Script URL
 */
function getGoogleScriptUrl() {
  console.warn('getGoogleScriptUrl() is deprecated. Use getApiBaseUrl() instead.');
  return ENV.CURRENT === 'development'
    ? LEGACY_CONFIG.GOOGLE_SCRIPT_URL_DEV
    : LEGACY_CONFIG.GOOGLE_SCRIPT_URL_PROD;
}

// Legacy global variable for backward compatibility
// @deprecated Will be removed in future versions
const GOOGLE_SCRIPT_URL = getGoogleScriptUrl();

// Export configuration objects for use in other scripts
if (typeof window !== 'undefined') {
  window.APP_CONFIG = APP_CONFIG;
  window.FEATURE_FLAGS = FEATURE_FLAGS;
  window.THAI_LOCALE = THAI_LOCALE;
  window.ERROR_MESSAGES = ERROR_MESSAGES;
  window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
  window.getCurrentConfig = getCurrentConfig;
  window.getApiBaseUrl = getApiBaseUrl;
  window.isDebugMode = isDebugMode;
}