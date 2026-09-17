// ==================================================
// 🔧 CONFIGURATION & CONSTANTS
// ==================================================
// Configuration is now loaded from config.js
// Access via: APP_CONFIG, FEATURE_FLAGS, THAI_LOCALE, ERROR_MESSAGES, etc.

// ==================================================
// 📊 APPLICATION STATE
// ==================================================
const AppState = {
  vegetables: [],
  farmSchedule: {},
  customerName: "Unknown",
  userId: null,
  savedCustomerInfo: []
};

// ==================================================
// 🌐 API SERVICE LAYER
// ==================================================
const ApiService = {
  async fetchVegetables() {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/vegetables/available`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch vegetables:', error);
      throw new Error(ERROR_MESSAGES.NETWORK.FETCH_FAILED);
    }
  },

  async fetchSchedule() {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/holidays/schedule`);
      const data = await response.json();
      return data.schedule;
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      throw new Error(ERROR_MESSAGES.NETWORK.FETCH_FAILED);
    }
  },

  // Backend identifies the customer from this LINE token, not from userId in the request
  authHeaders() {
    return { Authorization: `Bearer ${liff.getAccessToken()}` };
  },

  async fetchCustomerData() {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/user-order-history`, {
        headers: this.authHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data.customer;
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      throw new Error(ERROR_MESSAGES.NETWORK.FETCH_FAILED);
    }
  },

  async submitOrder(payload) {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/orders/handle-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message);
      return data;
    } catch (error) {
      console.error('Failed to submit order:', error);
      throw new Error(ERROR_MESSAGES.NETWORK.SERVER_ERROR);
    }
  }
};

// ==================================================
// 🛠️ UTILITY FUNCTIONS
// ==================================================
const Utils = {
  getUrlParams() {
    return new URLSearchParams(window.location.search);
  },

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  formatMoney(amount) {
    return Number(amount).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatThaiShortDate(dateStr) {
    const date = new Date(dateStr);
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  },

  formatThaiDate(dateStr) {
    const date = new Date(dateStr);
    const day = THAI_LOCALE.DAYS[date.getDay()];
    const dayNum = date.getDate();
    const month = THAI_LOCALE.MONTHS[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day}ที่ ${dayNum} ${month} ${year}`;
  },

  isFarmClosed(dateStr) {
    const dayName = THAI_LOCALE.DAYS[new Date(dateStr).getDay()];
    return AppState.farmSchedule[dayName] === false;
  },

  getDeliveryDayText(deliveryDate) {
    const today = new Date();
    const delivery = new Date(deliveryDate);

    today.setHours(0,0,0,0);
    delivery.setHours(0,0,0,0);

    const diffTime = delivery - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "จัดส่งวันนี้";
    if (diffDays === 1) return "จัดส่งพรุ่งนี้";
    if (diffDays > 1) return `จัดส่งในอีก ${diffDays} วัน`;
    return "วันที่จัดส่งย้อนหลัง กรุณาตรวจสอบ";
  },

  convertNumberToThaiText(amount) {
    const readNumber = (num) => {
      let result = "";
      const numStr = num.toString();
      const len = numStr.length;

      for (let i = 0; i < len; i++) {
        const digit = parseInt(numStr[i]);
        if (digit !== 0) {
          if (i === len - 1 && digit === 1 && len > 1) {
            result += "เอ็ด";
          } else if (i === len - 2 && digit === 2) {
            result += "ยี่";
          } else if (i === len - 2 && digit === 1) {
            result += "";
          } else {
            result += THAI_LOCALE.NUMBERS[digit];
          }
          result += THAI_LOCALE.UNITS[len - i - 1];
        }
      }
      return result;
    };

    const parts = amount.toFixed(2).split(".");
    const baht = parseInt(parts[0]);
    const satang = parseInt(parts[1]);

    let text = "";
    if (baht > 0) text += readNumber(baht) + "บาท";
    if (satang > 0) text += readNumber(satang) + "สตางค์";
    else text += "ถ้วน";

    return text;
  },

  validateOrderDate(deliveryDate) {
    const now = new Date();
    const selectedDate = new Date(deliveryDate);
    const todayStr = now.toISOString().split("T")[0];
    const selectedStr = selectedDate.toISOString().split("T")[0];

    if (selectedStr < todayStr) {
      throw new Error(ERROR_MESSAGES.BUSINESS.PAST_DATE_SELECTED);
    }

    if (selectedStr === todayStr) {
      if (now.getHours() > APP_CONFIG.ORDER_CUTOFF_TIME.HOUR ||
         (now.getHours() === APP_CONFIG.ORDER_CUTOFF_TIME.HOUR && now.getMinutes() >= APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE)) {
        throw new Error(ERROR_MESSAGES.BUSINESS.ORDER_CUTOFF_PASSED);
      }
    }
  }
};

// ==================================================
// 🎨 UI COMPONENTS & DOM MANIPULATION
// ==================================================
// Inline Lucide icons (only the ones this app uses) so no icon library is loaded
const ICON_PATHS = {
  "arrow-left": '<path d="m12 19-7-7 7-7" /> <path d="M19 12H5" />',
  "arrow-right": '<path d="M5 12h14" /> <path d="m12 5 7 7-7 7" />',
  "calendar-days": '<path d="M8 2v4" /> <path d="M16 2v4" /> <rect width="18" height="18" x="3" y="4" rx="2" /> <path d="M3 10h18" /> <path d="M8 14h.01" /> <path d="M12 14h.01" /> <path d="M16 14h.01" /> <path d="M8 18h.01" /> <path d="M12 18h.01" /> <path d="M16 18h.01" />',
  "check": '<path d="M20 6 9 17l-5-5" />',
  "chevron-down": '<path d="m6 9 6 6 6-6" />',
  "circle-alert": '<circle cx="12" cy="12" r="10" /> <line x1="12" x2="12" y1="8" y2="12" /> <line x1="12" x2="12.01" y1="16" y2="16" />',
  "clock": '<path d="M12 6v6l4 2" /> <circle cx="12" cy="12" r="10" />',
  "download": '<path d="M12 15V3" /> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> <path d="m7 10 5 5 5-5" />',
  "image-down": '<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" /> <path d="m14 19 3 3v-5.5" /> <path d="m17 22 3-3" /> <circle cx="9" cy="9" r="2" />',
  "leaf": '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /> <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />',
  "list-checks": '<path d="m3 17 2 2 4-4" /> <path d="m3 7 2 2 4-4" /> <path d="M13 6h8" /> <path d="M13 12h8" /> <path d="M13 18h8" />',
  "loader-circle": '<path d="M21 12a9 9 0 1 1-6.219-8.56" />',
  "message-circle": '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />',
  "plus": '<path d="M5 12h14" /> <path d="M12 5v14" />',
  "pointer": '<path d="M22 14a8 8 0 0 1-8 8" /> <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /> <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" /> <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" /> <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />',
  "share-2": '<circle cx="18" cy="5" r="3" /> <circle cx="6" cy="12" r="3" /> <circle cx="18" cy="19" r="3" /> <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /> <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />',
  "sprout": '<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" /> <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" /> <path d="M5 21h14" />',
  "store": '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /> <path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /> <path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" />',
  "truck": '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /> <path d="M15 18H9" /> <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /> <circle cx="17" cy="18" r="2" /> <circle cx="7" cy="18" r="2" />',
  "user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <circle cx="9" cy="7" r="4" /> <line x1="19" x2="19" y1="8" y2="14" /> <line x1="22" x2="16" y1="11" y2="11" />',
  "wallet": '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /> <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />',
  "x": '<path d="M18 6 6 18" /> <path d="m6 6 12 12" />',
};

const ICON_SVG_ATTRS = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const UI = {
  icon(name, className = "w-4 h-4") {
    return `<svg ${ICON_SVG_ATTRS} class="${className}">${ICON_PATHS[name] || ""}</svg>`;
  },

  header() {
    return `
      <header class="flex items-center justify-center gap-3">
        <img src="logo.png" alt="Halem Farm Logo" width="48" height="48" class="w-12 h-12 object-contain" />
        <div class="leading-tight">
          <div class="text-2xl font-medium tracking-wide text-gray-900">HALEM FARM</div>
          <div class="text-sm text-gray-600">สั่งผักออร์แกนิคจากฟาร์ม</div>
        </div>
      </header>
    `;
  },

  sectionLabel(icon, text, extra = "") {
    return `
      <div class="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
        ${this.icon(icon, "w-4 h-4 shrink-0 text-gray-500")}
        <span class="truncate">${text}</span>
        ${extra}
      </div>
    `;
  },

  bottomBarClass: "fixed inset-x-0 bottom-0 z-40 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent",

  showLoading(section = "all", text = "กำลังโหลดข้อมูล...") {
    const spinnerHTML = `
      <div class="flex flex-col items-center justify-center py-8 text-gray-500">
        ${this.icon("loader-circle", "w-7 h-7 mb-2 text-green-600 animate-spin")}
        <span class="text-sm">${text}</span>
      </div>
    `;

    const sectionMapping = {
      customer: "customer-section",
      vegetables: "vegetables-section",
      holidays: "holidays-section"
    };

    const targetId = sectionMapping[section] || "form-container";
    const element = document.getElementById(targetId);
    if (element) element.innerHTML = spinnerHTML;
  },

  hideLoading(section = "all") {
    const sectionMapping = {
      customer: "customer-section",
      vegetables: "vegetables-section",
      holidays: "holidays-section"
    };

    const targetId = sectionMapping[section] || "form-container";
    const element = document.getElementById(targetId);

    if (!element) return;

    element.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => {
      element.innerHTML = "";
      element.classList.remove("opacity-0");
    }, APP_CONFIG.UI.LOADING_DELAY);
  },

  showSuccessToast() {
    const toast = document.getElementById("toast-success");
    if (toast) {
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), APP_CONFIG.UI.TOAST_SUCCESS_DURATION);
    }
  },

  showErrorToast(message) {
    const toast = document.getElementById("toast-error");
    if (toast) {
      const messageEl = document.getElementById("toast-error-message");
      if (messageEl && message) messageEl.innerText = message;
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), APP_CONFIG.UI.TOAST_ERROR_DURATION);
    }
  },

  generateCustomerSection() {
    const shops = Array.isArray(AppState.savedCustomerInfo) ? AppState.savedCustomerInfo : [];
    const esc = Utils.escapeHtml;

    if (shops.length >= 2) {
      const chipClass = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-stone-100 px-4 py-2 text-base text-gray-800 transition peer-checked:bg-green-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/40";
      const shopChips = shops.map((c, i) => `
        <label class="cursor-pointer shrink-0">
          <input type="radio" name="customer-choice" value="${esc(c.shop)}"
                 class="peer sr-only" id="shop-${i}" ${i === 0 ? "checked" : ""} />
          <span class="${chipClass}">${esc(c.shop)}</span>
        </label>
      `).join("");

      return `
        ${this.sectionLabel("store", "ร้าน")}
        <div class="-mx-4 px-4 pb-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          ${shopChips}
          <label class="cursor-pointer shrink-0">
            <input type="radio" name="customer-choice" value="__NEW__" class="peer sr-only" id="shop-new" />
            <span class="${chipClass}">${this.icon("plus", "w-4 h-4")} ร้านใหม่</span>
          </label>
        </div>
        <div id="new-shop-input" class="hidden mt-2">
          <input id="customer-new" type="text" placeholder="กรอกชื่อร้านใหม่"
                 class="w-full rounded-full bg-stone-100 px-4 py-2.5 text-base text-gray-900 placeholder-gray-500" />
        </div>
      `;
    }

    const defaultShop = shops[0]?.shop || "";
    return `
      ${this.sectionLabel("store", "ชื่อร้าน", '<span class="ml-auto text-sm text-red-600">จำเป็น</span>')}
      <input id="customer-new" type="text" placeholder="กรุณากรอกชื่อร้าน"
             class="w-full rounded-full bg-stone-100 px-4 py-2.5 text-base text-gray-900 placeholder-gray-500" value="${esc(defaultShop)}" />
    `;
  },

  generateVegetablesSection() {
    const esc = Utils.escapeHtml;
    return AppState.vegetables.map((veg, index) => `
      <div class="flex items-center gap-3 py-3">
        <div class="w-16 h-16 shrink-0 rounded-2xl bg-stone-50 flex items-center justify-center overflow-hidden">
          <img src="${esc(veg.image)}" alt="${esc(veg.nameTh)}" loading="lazy" decoding="async" width="48" height="48" class="w-12 h-12 object-contain" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-lg text-gray-900 font-normal leading-snug truncate">${esc(veg.nameTh)}</div>
          <div class="text-sm text-gray-500 truncate">${esc(veg.nameEng)}</div>
          <div class="text-base text-green-700 font-medium">${veg.price} บ./กก.</div>
        </div>
        <div class="w-28 shrink-0 text-right">
          <div class="relative">
            <input type="number" min="0" step="0.5" inputmode="decimal"
                   data-name="${esc(veg.nameEng)}" data-nameth="${esc(veg.nameTh)}"
                   data-price="${veg.price}" data-image="${esc(veg.image)}"
                   placeholder="0"
                   class="input-box w-full rounded-full bg-stone-100 pl-3 pr-10 py-2.5 text-right text-lg text-gray-900 placeholder-gray-400"
                   oninput="OrderManager.updateItemTotal(this)" />
            <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">กก.</span>
          </div>
          <div class="text-sm text-gray-600 mt-1"><span id="total-${index}" class="text-base text-gray-900 font-medium">0</span> บ.</div>
        </div>
      </div>
    `).join('');
  }
};

// ==================================================
// 📋 ORDER MANAGEMENT
// ==================================================
const OrderManager = {
  updateItemTotal(input) {
    const price = parseFloat(input.dataset.price);
    const amount = parseFloat(input.value);
    const index = [...document.querySelectorAll('input[data-name]')].indexOf(input);
    const total = !isNaN(price * amount) ? (price * amount) : "0";

    document.getElementById(`total-${index}`).innerText = total;
    this.updateSummaryTotal();
    this.checkEnableConfirmButton();
  },

  updateSummaryTotal() {
    const inputs = document.querySelectorAll('input[data-name]');
    let totalAmount = 0;
    let totalPrice = 0;

    inputs.forEach(input => {
      const amount = parseFloat(input.value);
      const price = parseFloat(input.dataset.price);
      if (!isNaN(amount) && amount > 0) {
        totalAmount += amount;
        totalPrice += price * amount;
      }
    });

    document.getElementById("total-amount").innerText = totalAmount.toFixed(1);
    document.getElementById("total-price").innerText = totalPrice;
  },

  checkEnableConfirmButton() {
    const inputs = document.querySelectorAll('input[data-name]');
    const date = document.getElementById("delivery-date").value;
    const hasOld = !!document.querySelector('input[name="customer-choice"]:not([value="__NEW__"]):checked');
    const hasNewRadio = document.getElementById('shop-new')?.checked;
    const hasNewText = !!document.getElementById('customer-new')?.value.trim();
    const hasCustomer = hasOld || (hasNewRadio && hasNewText) || (!hasNewRadio && hasNewText);
    const payMethod = document.getElementById("pay-method").value;
    const btn = document.getElementById("check-order-btn");

    const hasPayMethod = payMethod.trim() !== "";
    const hasOrder = Array.from(inputs).some(input => {
      const amount = parseFloat(input.value);
      return !isNaN(amount) && amount > 0;
    });
    const isClosed = Utils.isFarmClosed(date);

    if (hasOrder && !isClosed && hasCustomer && hasPayMethod) {
      btn.disabled = false;
      btn.classList.remove("opacity-50", "cursor-not-allowed");
    } else {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    }
  },

  getCustomerName() {
    const chosen = document.querySelector('input[name="customer-choice"]:checked');
    if (chosen) {
      return chosen.value === "__NEW__"
        ? document.getElementById("customer-new").value.trim()
        : chosen.value;
    }
    return document.getElementById("customer-new").value.trim();
  },

  collectOrderSummary() {
    const inputs = document.querySelectorAll('input[data-name]');
    const summary = [];

    inputs.forEach(input => {
      const amount = parseFloat(input.value);
      const price = parseFloat(input.dataset.price);
      if (!isNaN(amount) && amount > 0) {
        summary.push({
          name: input.dataset.name,
          nameTh: input.dataset.nameth,
          amount,
          price,
          subtotal: price * amount,
          image: input.dataset.image
        });
      }
    });

    return summary;
  },

  async submitOrder() {
    const pending = AppState.pendingOrder;
    if (!pending) return;

    try {
      const { summary, customer, payMethod, deliveryDate } = pending;

      const payload = {
        date: new Date().toISOString(),
        deliveryDate: deliveryDate,
        user: customer,
        payMethod: payMethod,
        order: summary
      };

      console.log("submitOrder payload:", payload);

      UI.showLoading("all", "กำลังส่งคำสั่งซื้อ... กรุณารออย่าออกจากหน้านี้");

      const data = await ApiService.submitOrder(payload);
      console.log('Order API response:', data);

      this.showOrderReceipt({ ...pending, orderId: data.orderId, isReplacement: data.isReplacement, orderedAt: new Date() });

    } catch (error) {
      console.error('Order API error:', error);
      UI.showErrorToast();
      // Go back to the confirm page so the customer can retry without losing the order
      PageRenderer.showConfirmPage(pending);
    }
  },

  showOrderReceipt(receipt) {
    const { summary, customer, payMethod, deliveryDate, orderId, isReplacement, orderedAt } = receipt;
    const esc = Utils.escapeHtml;
    const money = Utils.formatMoney;
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const reference = orderId ? String(orderId).slice(-6).toUpperCase() : "-";
    const orderedTime = `${String(orderedAt.getHours()).padStart(2, "0")}:${String(orderedAt.getMinutes()).padStart(2, "0")} น.`;

    AppState.lastReceipt = { ...receipt, reference, totalKg, totalBaht };

    const infoRow = (label, value) => `
      <div class="flex justify-between gap-4 py-1">
        <span class="text-gray-500 shrink-0">${label}</span>
        <span class="text-gray-900 text-right">${value}</span>
      </div>
    `;
    const divider = `<div class="my-4 border-t border-dashed border-gray-300"></div>`;

    const paymentTerms = payMethod === 'โอนเงิน'
      ? `กรุณาโอนชำระเงินภายใน 3 วัน นับจากวันจัดส่งสินค้า<br/>
         ธนาคารกสิกรไทย เลขที่บัญชี <span class="text-gray-900 font-medium tabular-nums">113-8-48085-9</span><br/>
         ชื่อบัญชี นายฮาเล็ม เจะมาริกัน`
      : payMethod === 'เครดิต'
        ? `กรุณาชำระเงินหลังจากวางบิลภายใน 7 วัน`
        : `กรุณาชำระเงินภายในวันจัดส่งสินค้า`;

    const html = `
      <div class="w-full max-w-lg mx-auto px-2 pt-3 pb-40 animate-fade-in">
        <div class="flex items-center justify-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-green-600 text-white shadow-float flex items-center justify-center">
            ${UI.icon("check", "w-6 h-6")}
          </div>
          <div class="leading-tight">
            <div class="text-lg text-gray-900 font-normal">สั่งซื้อเรียบร้อยแล้ว</div>
            <div class="text-sm text-gray-600">บันทึกหรือแชร์ใบสั่งซื้อเก็บไว้ได้</div>
          </div>
        </div>

        <div id="receipt" class="bg-white rounded-3xl shadow-float px-4 py-5 text-base font-light text-gray-700">
          <div class="flex flex-col items-center text-center">
            <img src="logo.png" alt="Halem Farm Logo" width="64" height="64" class="w-16 h-16 object-contain mb-1" />
            <div class="text-xl font-medium tracking-wide text-gray-900">HALEM FARM</div>
            <div class="text-sm text-gray-500">ผักออร์แกนิคจากฟาร์ม</div>
            <div class="mt-3 rounded-full bg-stone-100 px-4 py-1 text-sm tracking-wide text-gray-700">ใบสั่งซื้อ</div>
            ${isReplacement ? `<div class="mt-2 text-sm text-amber-700">แก้ไขคำสั่งซื้อเดิมของวันจัดส่งนี้</div>` : ""}
          </div>

          ${divider}

          ${infoRow("เลขที่อ้างอิง", `<span class="tabular-nums">#${reference}</span>`)}
          ${infoRow("วันที่สั่ง", `${Utils.formatThaiShortDate(orderedAt)} ${orderedTime}`)}
          ${infoRow("ร้าน", `<span class="font-medium">${esc(customer)}</span>`)}
          ${infoRow("สั่งโดย", esc(AppState.customerName))}
          ${infoRow("ชำระเงิน", esc(payMethod))}
          <div class="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-green-50 px-3 py-2.5">
            <span class="flex items-center gap-1.5 text-green-800">${UI.icon("truck", "w-5 h-5")} วันที่จัดส่ง</span>
            <span class="text-green-800 font-medium text-right">${Utils.formatThaiDate(deliveryDate)}</span>
          </div>

          ${divider}

          <div class="flex justify-between text-sm text-gray-500 mb-1">
            <span>รายการ</span>
            <span>จำนวนเงิน (บาท)</span>
          </div>
          ${summary.map((item) => `
            <div class="py-2">
              <div class="flex justify-between gap-4">
                <span class="text-gray-900">${esc(item.nameTh || item.name)}</span>
                <span class="text-gray-900 font-medium tabular-nums">${money(item.subtotal)}</span>
              </div>
              <div class="text-sm text-gray-600 tabular-nums">${item.amount.toFixed(2)} กก. × ${money(item.price)}</div>
            </div>
          `).join("")}

          ${divider}

          ${infoRow("จำนวนรายการ", `${summary.length} รายการ`)}
          ${infoRow("น้ำหนักรวม", `<span class="tabular-nums">${totalKg.toFixed(2)}</span> กก.`)}
          <div class="flex justify-between items-baseline gap-4 mt-3">
            <span class="text-lg text-gray-900 font-normal">ยอดสุทธิ</span>
            <span class="text-3xl text-gray-900 font-medium tabular-nums">${money(totalBaht)}</span>
          </div>
          <div class="text-sm text-gray-600 text-right">(${Utils.convertNumberToThaiText(totalBaht)})</div>

          ${divider}

          <div class="text-sm leading-relaxed text-gray-700">
            <div class="text-base text-gray-900 mb-1">เงื่อนไขการชำระเงิน</div>
            ${paymentTerms}
          </div>

          ${divider}

          <div class="text-center text-sm text-gray-500">
            ขอบคุณที่ใช้บริการ Halem Farm
          </div>
        </div>

        <button onclick="ReceiptActions.close()" class="no-print mt-4 mx-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-base text-gray-600 bg-transparent">
          ${UI.icon("x", "w-5 h-5")} ปิดหน้านี้
        </button>

        <div class="no-print ${UI.bottomBarClass}">
          <div class="max-w-lg mx-auto flex gap-3">
            <button id="save-receipt-btn" onclick="ReceiptActions.save()"
                    class="flex-1 flex items-center justify-center gap-2 rounded-full bg-white text-gray-900 text-base shadow-float-lg px-5 py-4">
              ${UI.icon("image-down", "w-5 h-5")} บันทึกรูป
            </button>
            <button id="share-receipt-btn" onclick="ReceiptActions.share()"
                    class="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 text-white text-base shadow-float-lg px-5 py-4">
              ${UI.icon("share-2", "w-5 h-5")} แชร์
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("form-container").innerHTML = html;
    window.scrollTo(0, 0);
    setTimeout(() => UI.showSuccessToast(), 100);
  }
};

// ==================================================
// 🧾 RECEIPT SAVE / SHARE
// ==================================================
const ReceiptActions = {
  fileName() {
    return `halem-farm-${AppState.lastReceipt?.reference || "order"}.png`;
  },

  // The image library is only needed when someone saves or shares, so load it on demand
  async loadImageLibrary() {
    if (window.htmlToImage) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("ไม่สามารถโหลดตัวสร้างรูปได้"));
      document.head.appendChild(script);
    });
  },

  async toBlob() {
    await this.loadImageLibrary();
    const node = document.getElementById("receipt");
    const options = {
      pixelRatio: 3,
      backgroundColor: "#ffffff",
      style: { boxShadow: "none", borderRadius: "0", margin: "0" }
    };
    // First pass warms up fonts/images; Safari often misses them on the first render
    await htmlToImage.toBlob(node, options);
    return htmlToImage.toBlob(node, options);
  },

  async withBusy(buttonId, text, task) {
    const button = document.getElementById(buttonId);
    const original = button?.innerHTML;
    if (button) {
      button.disabled = true;
      button.innerHTML = `${UI.icon("loader-circle", "w-5 h-5 animate-spin")} ${text}`;
    }
    try {
      await task();
    } catch (error) {
      console.error("Receipt action failed:", error);
      UI.showErrorToast("ไม่สามารถสร้างรูปใบสั่งซื้อได้ กรุณาแคปหน้าจอแทน");
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = original;
      }
    }
  },

  // Returns true when the native share sheet was shown (it includes "Save Image" on phones)
  async shareFile(blob) {
    const file = new File([blob], this.fileName(), { type: "image/png" });
    if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
    try {
      await navigator.share({ files: [file], title: "ใบสั่งซื้อ Halem Farm" });
    } catch (error) {
      if (error.name === "AbortError") return true;
      // Some browsers drop the tap permission while the image is being generated
      if (error.name === "NotAllowedError") return false;
      throw error;
    }
    return true;
  },

  save() {
    return this.withBusy("save-receipt-btn", "กำลังสร้างรูป", async () => {
      const blob = await this.toBlob();
      if (await this.shareFile(blob)) return;
      this.showPreview(blob);
    });
  },

  share() {
    return this.withBusy("share-receipt-btn", "กำลังเตรียม", async () => {
      // Share to LINE friends/groups when the LIFF app allows it
      if (window.liff && liff.isApiAvailable && liff.isApiAvailable("shareTargetPicker")) {
        await liff.shareTargetPicker([this.buildFlexMessage()]);
        return;
      }
      const blob = await this.toBlob();
      if (await this.shareFile(blob)) return;
      this.showPreview(blob);
    });
  },

  // Fallback for in-app browsers without file sharing: show the image to long-press save
  showPreview(blob) {
    const url = URL.createObjectURL(blob);
    const overlay = document.createElement("div");
    overlay.id = "receipt-preview";
    overlay.className = "no-print fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in";
    overlay.innerHTML = `
      <img src="${url}" alt="ใบสั่งซื้อ" class="max-h-[68vh] w-auto rounded-2xl bg-white shadow-float-lg" />
      <p class="mt-4 flex items-center gap-2 text-sm text-white/90">
        ${UI.icon("pointer", "w-4 h-4")} กดค้างที่รูปเพื่อบันทึกรูปภาพ
      </p>
      <div class="mt-4 flex gap-3">
        <a href="${url}" download="${this.fileName()}"
           class="flex items-center gap-2 rounded-full bg-white text-gray-800 shadow-float-lg px-5 py-3 text-sm">
          ${UI.icon("download", "w-4 h-4")} ดาวน์โหลด
        </a>
        <button id="close-preview-btn" class="flex items-center gap-2 rounded-full bg-white/15 text-white px-5 py-3 text-sm">
          ${UI.icon("x", "w-4 h-4")} ปิด
        </button>
      </div>
    `;
    const close = () => {
      overlay.remove();
      URL.revokeObjectURL(url);
    };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("#close-preview-btn")) close();
    });
    document.body.appendChild(overlay);
  },

  buildFlexMessage() {
    const r = AppState.lastReceipt;
    const money = Utils.formatMoney;
    const row = (left, right, options = {}) => ({
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: left, size: "sm", color: options.leftColor || "#888888", flex: 5, wrap: true },
        { type: "text", text: right, size: "sm", color: "#111111", align: "end", flex: 4, weight: options.bold ? "bold" : "regular", wrap: true }
      ]
    });

    return {
      type: "flex",
      altText: `ใบสั่งซื้อ Halem Farm #${r.reference}`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: "HALEM FARM", weight: "bold", size: "md", color: "#111111" },
            { type: "text", text: `ใบสั่งซื้อ #${r.reference}`, size: "xs", color: "#888888" },
            { type: "separator", margin: "md" },
            row("ร้าน", r.customer),
            row("วันที่จัดส่ง", Utils.formatThaiDate(r.deliveryDate)),
            row("ชำระเงิน", r.payMethod),
            { type: "separator", margin: "md" },
            ...r.summary.map((item) => row(`${item.nameTh || item.name} ${item.amount.toFixed(2)} กก.`, money(item.subtotal), { leftColor: "#111111" })),
            { type: "separator", margin: "md" },
            row("ยอดสุทธิ", `${money(r.totalBaht)} บาท`, { leftColor: "#111111", bold: true })
          ]
        }
      }
    };
  },

  close() {
    if (window.liff && liff.isInClient && liff.isInClient()) {
      liff.closeWindow();
    } else {
      window.close();
    }
  }
};

// ==================================================
// 📱 PAGE RENDERING
// ==================================================
const PageRenderer = {
  renderFormClosed() {
    const container = document.getElementById("form-container");
    container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-6 space-y-4">
        ${UI.header()}
        <section class="bg-white rounded-3xl shadow-float p-6 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            ${UI.icon("sprout", "w-6 h-6")}
          </div>
          <div class="text-gray-900 mb-2">ปิดรับออร์เดอร์ชั่วคราว</div>
          <p class="text-sm text-gray-500 leading-relaxed">
            เนื่องจากสถานการณ์ฟาร์มตอนนี้ผักขาดตลาด<br/>
            จะพร้อมส่งในอีก 1 สัปดาห์<br/>
            ขออภัยในความไม่สะดวกครับ
          </p>
        </section>
      </div>
    `;
  },

  renderForm() {
    const container = document.getElementById("form-container");
    const cutoff = `${String(APP_CONFIG.ORDER_CUTOFF_TIME.HOUR).padStart(2, '0')}:${String(APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="w-full max-w-lg mx-auto px-3 pt-3 pb-36">
        ${UI.header()}

        <div class="flex justify-center mt-2">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-white shadow-float px-3 py-1.5 text-sm text-gray-700">
            ${UI.icon("clock", "w-4 h-4 text-gray-500")}
            สั่งก่อน ${cutoff} น. ส่งวันนี้ หลังจากนั้นส่งวันถัดไป
          </div>
        </div>

        <!-- Order details stay pinned while the vegetable list scrolls -->
        <div class="sticky top-0 z-30 -mx-3 px-3 pt-3 pb-2 bg-stone-100">
          <section class="bg-white rounded-3xl shadow-float p-4">
            <div id="customer-section">
              ${UI.generateCustomerSection()}
            </div>

            <div class="grid grid-cols-2 gap-3 mt-3">
              <div class="min-w-0">
                ${UI.sectionLabel("wallet", "วิธีชำระเงิน")}
                <div class="relative">
                  <select id="pay-method" class="w-full min-h-[46px] rounded-full bg-stone-100 pl-4 pr-9 py-2.5 text-base text-gray-900">
                    <option value="" selected>เลือก</option>
                    <option value="เงินสด">เงินสดธนบัตร</option>
                    <option value="โอนเงิน">เงินสดโอนเงิน</option>
                    <option value="เครดิต">เครดิต</option>
                  </select>
                  ${UI.icon("chevron-down", "w-4 h-4 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none")}
                </div>
              </div>
              <div class="min-w-0">
                ${UI.sectionLabel("calendar-days", "วันที่จัดส่ง")}
                <input id="delivery-date" type="date" onchange="updateDeliveryDate()"
                       class="w-full min-h-[46px] rounded-full bg-stone-100 px-4 py-2.5 text-left text-base text-gray-900" />
              </div>
            </div>

            <div id="delivery-info" class="mt-3">
              <span id="formatted-date"></span>
              <span id="holiday-warning"></span>
            </div>
          </section>
        </div>

        <section class="bg-white rounded-3xl shadow-float px-4 pt-3 pb-1 mt-1">
          ${UI.sectionLabel("leaf", "รายการผัก")}
          <div id="vegetables-section" class="divide-y divide-stone-100">
            ${UI.generateVegetablesSection()}
          </div>
        </section>
      </div>

      <div class="${UI.bottomBarClass}">
        <div class="max-w-lg mx-auto flex items-center justify-between gap-3 rounded-full bg-white shadow-float-lg py-2 pl-5 pr-2">
          <div class="leading-tight min-w-0">
            <div class="text-sm text-gray-600">รวมทั้งหมด</div>
            <div class="text-lg text-gray-900 font-medium tabular-nums whitespace-nowrap">
              <span id="total-amount">0.0</span> กก. · <span id="total-price">0</span> บ.
            </div>
          </div>
          <button id="check-order-btn" onclick="confirmOrder()" disabled
                  class="shrink-0 flex items-center gap-2 rounded-full bg-green-600 text-white text-base px-6 py-3.5 shadow-float opacity-50 cursor-not-allowed">
            ตรวจสอบ ${UI.icon("arrow-right", "w-5 h-5")}
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.setDefaultDeliveryDate();
  },

  setupEventListeners() {
    const shops = Array.isArray(AppState.savedCustomerInfo) ? AppState.savedCustomerInfo : [];

    // Set default payment method
    if (shops.length >= 2) {
      document.getElementById('pay-method').value = shops[0].method;
    } else if (shops[0]?.method) {
      document.getElementById('pay-method').value = shops[0].method;
    }

    // Customer choice radio listeners
    const radios = document.querySelectorAll('input[name="customer-choice"]');
    const paySelect = document.getElementById('pay-method');
    const newInputDiv = document.getElementById('new-shop-input');
    const newInput = document.getElementById('customer-new');

    radios.forEach(radio => {
      radio.addEventListener('change', e => {
        const chosen = e.target.value;

        if (chosen === "__NEW__") {
          newInputDiv?.classList.remove('hidden');
          if (newInput) newInput.value = "";
          paySelect.value = "";
        } else {
          newInputDiv?.classList.add('hidden');
          if (newInput) newInput.value = "";
          const shopObj = shops.find(s => s.shop === chosen);
          paySelect.value = shopObj?.method || "";
        }

        OrderManager.checkEnableConfirmButton();
      });
    });

    // New input listener
    if (newInput) {
      newInput.addEventListener('input', () => {
        radios.forEach(r => r.checked = false);
        const shopNewRadio = document.getElementById('shop-new');
        if (shopNewRadio) shopNewRadio.checked = !!newInput.value.trim();
        OrderManager.checkEnableConfirmButton();
      });
    }

    // Payment method listener
    document.getElementById("pay-method").addEventListener("change", OrderManager.checkEnableConfirmButton);
  },

  setDefaultDeliveryDate() {
    // ใช้เวลาไทย (UTC+7)
    const now = new Date();
    const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // เพิ่ม 7 ชั่วโมง

    // สร้าง cutoff time สำหรับวันนี้ในเวลาไทย
    const cutoff = new Date(thaiTime);
    cutoff.setHours(APP_CONFIG.ORDER_CUTOFF_TIME.HOUR, APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE, 0, 0);

    // ตั้งวันที่จัดส่งเริ่มต้น
    let deliveryDate = new Date(thaiTime);

    // DEBUG: แสดงข้อมูลเวลาต่างๆ
    console.log('=== DEBUG: setDefaultDeliveryDate ===');
    console.log('Browser Time (now):', now.toString());
    console.log('Thai Time (UTC+7):', thaiTime.toString());
    console.log('Thai Date:', thaiTime.getDate());
    console.log('Thai Day:', THAI_LOCALE.DAYS[thaiTime.getDay()]);
    console.log('Thai Hours:', thaiTime.getHours());
    console.log('Thai Minutes:', thaiTime.getMinutes());
    console.log('Cutoff Time:', cutoff.toString());
    console.log('Is past cutoff?:', thaiTime.getTime() >= cutoff.getTime());

    // หากเลยเวลา cutoff แล้ว ให้จัดส่งวันถัดไป
    if (thaiTime.getTime() >= cutoff.getTime()) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      console.log('Past cutoff - delivery moved to next day');
    }

    // แปลงเป็น local date string สำหรับ input date
    let deliveryDateStr = deliveryDate.getFullYear() + '-' +
                         String(deliveryDate.getMonth() + 1).padStart(2, '0') + '-' +
                         String(deliveryDate.getDate()).padStart(2, '0');

    console.log('Initial delivery date:', deliveryDateStr);

    // ตรวจสอบว่าฟาร์มปิดหรือไม่
    if (Utils.isFarmClosed(deliveryDateStr)) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      deliveryDateStr = deliveryDate.getFullYear() + '-' +
                       String(deliveryDate.getMonth() + 1).padStart(2, '0') + '-' +
                       String(deliveryDate.getDate()).padStart(2, '0');
      console.log('Farm closed - delivery moved to:', deliveryDateStr);
    }

    console.log('Final delivery date:', deliveryDateStr);
    console.log('Final delivery day:', THAI_LOCALE.DAYS[deliveryDate.getDay()]);
    console.log('=====================================');

    document.getElementById("delivery-date").value = deliveryDateStr;
    document.getElementById("delivery-date").min = deliveryDateStr;

    // Update delivery date display immediately
    updateDeliveryDate();
  },

  showConfirmPage(order) {
    AppState.pendingOrder = order;
    const { summary, customer, payMethod, deliveryDate } = order;
    const totalAmount = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalPrice = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const container = document.getElementById("form-container");
    const esc = Utils.escapeHtml;
    const money = Utils.formatMoney;
    const deliveryDayText = Utils.getDeliveryDayText(deliveryDate);

    const infoRow = (icon, label, value) => `
      <div class="flex items-center gap-3 py-2">
        <div class="w-10 h-10 shrink-0 rounded-full bg-stone-100 text-gray-600 flex items-center justify-center">
          ${UI.icon(icon, "w-5 h-5")}
        </div>
        <div class="leading-snug min-w-0">
          <div class="text-sm text-gray-600">${label}</div>
          <div class="text-lg text-gray-900 break-words">${value}</div>
        </div>
      </div>
    `;

    const checkRow = (text) => `
      <label class="flex items-center gap-3 rounded-2xl bg-stone-100 px-4 py-3.5 cursor-pointer">
        <input type="checkbox" class="check-confirm w-6 h-6 shrink-0 accent-green-600" onchange="checkAllConfirmed()">
        <span class="text-base text-gray-800">${text}</span>
      </label>
    `;

    container.innerHTML = `
      <div class="w-full max-w-lg mx-auto px-3 pt-3 pb-40 space-y-3 animate-fade-in">
        <div class="text-center">
          <div class="text-xl text-gray-900 font-normal">ตรวจสอบคำสั่งซื้อ</div>
          <div class="text-base text-gray-600">โปรดตรวจสอบข้อมูลก่อนยืนยัน</div>
        </div>

        <section class="bg-white rounded-3xl shadow-float p-4">
          ${infoRow("store", "ชื่อร้าน", esc(customer))}
          ${infoRow("wallet", "วิธีชำระเงิน", esc(payMethod))}
          <div class="mt-2 flex items-center gap-3 rounded-2xl bg-green-50 p-3">
            <div class="w-10 h-10 shrink-0 rounded-full bg-green-600 text-white flex items-center justify-center">
              ${UI.icon("truck", "w-5 h-5")}
            </div>
            <div class="leading-snug min-w-0">
              <div class="text-sm text-green-800">วันที่จัดส่ง · ${deliveryDayText}</div>
              <div class="text-lg text-green-900 font-medium">${Utils.formatThaiDate(deliveryDate)}</div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4">
          ${UI.sectionLabel("leaf", "รายการผัก")}
          <div class="divide-y divide-stone-100">
            ${summary.map((item) => `
              <div class="flex justify-between gap-4 py-2.5">
                <div class="min-w-0">
                  <div class="text-lg text-gray-900">${esc(item.nameTh)}</div>
                  <div class="text-sm text-gray-600 tabular-nums">${item.amount.toFixed(2)} กก. × ${money(item.price)}</div>
                </div>
                <div class="text-lg text-gray-900 font-medium tabular-nums">${money(item.subtotal)}</div>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between items-baseline mt-2 pt-3 border-t border-stone-200">
            <span class="text-base text-gray-700">รวม ${totalAmount.toFixed(2)} กก.</span>
            <span class="text-2xl text-green-700 font-medium tabular-nums">${money(totalPrice)} บ.</span>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4 space-y-2">
          ${UI.sectionLabel("list-checks", "ติ๊กยืนยันทุกรายการ")}
          ${checkRow(`ชื่อร้านถูกต้อง (${esc(customer)})`)}
          ${checkRow(`วันที่จัดส่งถูกต้อง (${deliveryDayText})`)}
          ${checkRow(`รายการผักและยอดรวมถูกต้อง (${totalAmount.toFixed(2)} กก. / ${money(totalPrice)} บ.)`)}
          <div class="flex items-center gap-1.5 px-1 pt-1 text-sm text-gray-600">
            ${UI.icon("circle-alert", "w-4 h-4 shrink-0")} ต้องติ๊กครบทุกรายการจึงจะยืนยันการสั่งซื้อได้
          </div>
        </section>
      </div>

      <div class="${UI.bottomBarClass}">
        <div class="max-w-lg mx-auto flex gap-3">
          <button onclick="PageRenderer.renderForm()"
                  class="flex items-center justify-center gap-2 rounded-full bg-white text-gray-800 text-base shadow-float-lg px-5 py-4">
            ${UI.icon("arrow-left", "w-5 h-5")} แก้ไข
          </button>
          <button id="confirm-button" onclick="OrderManager.submitOrder()" disabled
                  class="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 text-white text-base shadow-float-lg px-5 py-4 opacity-50 cursor-not-allowed">
            ${UI.icon("check", "w-5 h-5")} ยืนยันการสั่งซื้อ
          </button>
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
    checkAllConfirmed();
  }
};

// ==================================================
// 🚀 APPLICATION CONTROLLER
// ==================================================
const App = {
  async init() {
    const ready = await this.initCustomerData();
    if (!ready) return;
    await this.fetchInitialData();
  },

  showOpenFromLineMessage() {
    const container = document.getElementById("form-container");
    if (!container) return;
    container.innerHTML = `
      <div class="w-full max-w-sm mx-auto px-4 py-10 space-y-4">
        ${UI.header()}
        <section class="bg-white rounded-3xl shadow-float p-6 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            ${UI.icon("message-circle", "w-6 h-6")}
          </div>
          <div class="text-gray-900 mb-1">กรุณาสั่งผักผ่าน LINE OA</div>
          <p class="text-sm text-gray-500">เปิด LINE OA ของ Halem Farm <span class="whitespace-nowrap">(LINE ID: <span class="text-gray-900">@halemfarm</span>)</span> แล้วกดเมนูสั่งผักที่ Rich menu</p>
          <a href="https://line.me/R/ti/p/@halemfarm"
             class="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600 text-white shadow-float-lg px-5 py-3 text-sm">
            ${UI.icon("user-plus", "w-4 h-4")} เพิ่มเพื่อน @halemfarm
          </a>
        </section>
      </div>
    `;
  },

  // Orders are allowed only from the LIFF app opened inside LINE
  async initCustomerData() {
    try {
      await liff.init({ liffId: "2009829839-v3RobfXt" });

      if (!liff.isInClient()) {
        this.showOpenFromLineMessage();
        return false;
      }

      if (!liff.isLoggedIn()) {
        liff.login();
        return false;
      }

      const profile = await liff.getProfile();
      AppState.customerName = profile.displayName;
      AppState.userId = profile.userId;
      return true;

    } catch (error) {
      console.error("LIFF init failed:", error);
      this.showOpenFromLineMessage();
      return false;
    }
  },

  async fetchInitialData() {
    PageRenderer.renderForm();
    UI.showLoading("vegetables", "กำลังโหลดรายการผัก...");
    UI.showLoading("customer", "กำลังโหลดข้อมูลลูกค้า...");

    try {
      const [vegetablesData, scheduleData, customerData] = await Promise.all([
        ApiService.fetchVegetables(),
        ApiService.fetchSchedule(),
        ApiService.fetchCustomerData()
      ]);

      AppState.vegetables.splice(0, AppState.vegetables.length, ...vegetablesData);
      AppState.farmSchedule = scheduleData;
      AppState.savedCustomerInfo = customerData;

      PageRenderer.renderForm();
    } catch (error) {
      console.error("ไม่สามารถดึงข้อมูลได้:", error);
      UI.showErrorToast();
    }
  }
};

// ==================================================
// 🔗 GLOBAL FUNCTIONS (for backward compatibility)
// ==================================================
function updateDeliveryDate() {
  const date = document.getElementById("delivery-date").value;
  const formattedEl = document.getElementById("formatted-date");
  const warningEl = document.getElementById("holiday-warning");
  const dateTxt = Utils.getDeliveryDayText(date);

  if (!date) {
    formattedEl.innerText = "";
    warningEl.innerText = "";
    return;
  }

  const closed = Utils.isFarmClosed(date);
  formattedEl.innerHTML = !closed
    ? `<div class="flex items-center gap-2 rounded-2xl bg-green-50 px-3 py-2 text-green-800">
         ${UI.icon("truck", "w-5 h-5 shrink-0")}
         <span class="text-base"><span class="font-medium">${dateTxt}</span> · ${Utils.formatThaiDate(date)}</span>
       </div>`
    : "";
  warningEl.innerHTML = closed
    ? `<div class="flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-red-700">
         ${UI.icon("circle-alert", "w-5 h-5 shrink-0")}
         <span class="text-base font-medium">วันหยุดฟาร์ม กรุณาเลือกวันอื่น</span>
       </div>`
    : "";
  OrderManager.checkEnableConfirmButton();
}

function confirmOrder() {
  try {
    const deliveryDate = document.getElementById("delivery-date").value;
    const customer = OrderManager.getCustomerName();
    const payMethod = document.getElementById("pay-method").value;

    Utils.validateOrderDate(deliveryDate);

    const summary = OrderManager.collectOrderSummary();

    PageRenderer.showConfirmPage({ summary, customer, payMethod, deliveryDate });
  } catch (error) {
    alert(error.message);
  }
}

function checkAllConfirmed() {
  const checkboxes = document.querySelectorAll('.check-confirm');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  const confirmBtn = document.getElementById("confirm-button");

  if (allChecked) {
    confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
    confirmBtn.disabled = false;
  } else {
    confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
    confirmBtn.disabled = true;
  }
}

// ==================================================
// 🎯 APPLICATION STARTUP
// ==================================================
App.init();