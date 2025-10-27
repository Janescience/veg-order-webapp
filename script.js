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

  async fetchCustomerData(userId) {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/user-order-history?userId=${encodeURIComponent(userId)}`);
      const data = await response.json();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await response.json();
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

    if (diffDays === 0) return "📦 จัดส่งวันนี้";
    if (diffDays === 1) return "📦 จัดส่งพรุ่งนี้";
    if (diffDays > 1) return `📦 จัดส่งในอีก ${diffDays} วัน`;
    return "⚠️ วันที่จัดส่งย้อนหลัง กรุณาตรวจสอบ";
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
const UI = {
  showLoading(section = "all", text = "กำลังโหลดข้อมูล...") {
    const spinnerHTML = `
      <div class="flex flex-col items-center justify-center py-6 text-gray-500 animate-pulse">
        <svg class="w-8 h-8 mb-2 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
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

  showErrorToast() {
    const toast = document.getElementById("toast-success");
    if (toast) {
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), APP_CONFIG.UI.TOAST_ERROR_DURATION);
    }
  },

  generateCustomerSection() {
    const shops = Array.isArray(AppState.savedCustomerInfo) ? AppState.savedCustomerInfo : [];

    if (shops.length >= 2) {
      const shopRadios = shops.map((c, i) => `
        <label class="flex items-center space-x-2 mb-1">
          <input type="radio" name="customer-choice" value="${c.shop}"
                 class="form-radio h-5 w-5 accent-green-600" id="shop-${i}"
                 ${i === 0 ? "checked" : ""} />
          <span>${c.shop}</span>
        </label>
      `).join("");

      return `
        <div id="customer-section" class="border border-green-600 rounded-lg p-2">
          <label class="block font-medium mb-2 bg-gray-100 border border-gray-300 rounded-lg p-1">🏪 เลือกร้านที่เคยสั่ง</label>
          <div>
            ${shopRadios}
            <label class="flex items-center space-x-2 text-gray-500">
              <input type="radio" name="customer-choice" value="__NEW__"
                     class="form-radio h-5 w-5 accent-green-600" id="shop-new" />
              <span>กรอกร้านใหม่</span>
            </label>
          </div>
          <div id="new-shop-input" class="hidden">
            <input id="customer-new" type="text" placeholder="กรอกร้านใหม่"
                   class="w-full border rounded-md px-4 py-2 shadow-sm" />
          </div>
        </div>
      `;
    } else {
      const defaultShop = shops[0]?.shop || "";
      return `
        <div id="customer-section" class="border border-green-600 rounded-lg p-2">
          <label class="block font-medium mb-1 bg-gray-100 border border-gray-300 rounded-lg p-1">
            🏪 กรอกชื่อร้าน <span class="text-xs text-red-500">*ห้ามว่าง</span>
          </label>
          <input id="customer-new" type="text" placeholder="กรุณากรอกชื่อร้าน"
                 class="w-full border rounded-md px-4 py-2 shadow-sm" value="${defaultShop}" />
        </div>
      `;
    }
  },

  generateVegetablesSection() {
    return AppState.vegetables.map((veg, index) => `
      <div class="py-3 grid grid-cols-12 gap-2 items-center">
        <div class="col-span-2">
          <img src="${veg.image}" alt="Halem Farm Logo" class="w-12 h-12 object-contain" />
        </div>
        <div class="col-span-4">
          <div class="font-medium">${veg.nameTh}</div>
          <div class="text-base text-gray-500">${veg.nameEng}</div>
        </div>
        <div class="col-span-4">
          <input type="number" min="0" step="0.5"
                 data-name="${veg.nameEng}" data-nameth="${veg.nameTh}"
                 data-price="${veg.price}" data-image="${veg.image}"
                 placeholder="จำนวน (กก.)"
                 class="input-box border rounded-md shadow-sm px-3 py-1 w-full text-right"
                 oninput="OrderManager.updateItemTotal(this)" />
          <div class="text-sm text-right">${veg.price} บาท/กก.</div>
        </div>
        <div class="col-span-2 text-right font-semibold">
          <span id="total-${index}" class="font-bold underline">0</span> บาท
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

  async submitOrder(summaryJson, deliveryDate, customer, payMethod) {
    try {
      const summary = JSON.parse(summaryJson);

      const payload = {
        date: new Date().toISOString(),
        deliveryDate: deliveryDate,
        user: customer,
        userLine: AppState.customerName,
        payMethod: payMethod,
        userId: AppState.userId,
        order: summary
      };

      console.log("submitOrder payload:", payload);

      UI.showLoading("all", "กำลังส่งคำสั่งซื้อ... กรุณารออย่าออกจากหน้านี้");

      const data = await ApiService.submitOrder(payload);
      console.log('Order API response:', data);

      this.showOrderReceipt(summary, customer, payMethod, deliveryDate);

    } catch (error) {
      console.error('Order API error:', error);
      UI.showErrorToast();
      UI.hideLoading();
    }
  },

  showOrderReceipt(summary, customer, payMethod, deliveryDate) {
    const thaiDeliveryDate = Utils.formatThaiDate(deliveryDate);
    const thaiToday = Utils.formatThaiDate(new Date());
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const thaiText = Utils.convertNumberToThaiText(totalBaht);

    const html = `
      <div class="max-w-md mx-auto bg-white border rounded-lg shadow p-1 text-sm text-gray-800">
        <h2 class="text-2xl font-bold text-center mb-2 mt-1">ใบสั่งซื้อ</h2>
        <div class="flex items-center gap-2 text-xl font-black justify-center tracking-tight mb-2">
          <img src="logo.png" alt="Halem Farm Logo" class="w-12 h-12 object-contain" />
          <span>HALEM FARM</span>
        </div>

        <div class="grid grid-cols-1 gap-2 mb-2 text-sm">
          <div>
            <div><strong>สั่งโดย:</strong> ${AppState.customerName}</div>
            <div><strong>ชื่อลูกค้า:</strong> ${customer}</div>
            <div><strong>วิธีชำระเงิน:</strong> ${payMethod}</div>
            <div><strong>วันที่สั่งซื้อ:</strong> ${thaiToday}</div>
            <div><strong>วันที่จัดส่ง:</strong> ${thaiDeliveryDate}</div>
          </div>
        </div>

        <table class="w-full border border-gray-300 mb-2 text-sm">
          <thead class="bg-gray-100">
            <tr>
              <th class="border px-2 py-1">ลำดับ</th>
              <th class="border px-2 py-1 text-left">รายการ</th>
              <th class="border px-2 py-1 text-center">จำนวน (กก.)</th>
              <th class="border px-2 py-1 text-right">ราคา/กก.</th>
              <th class="border px-2 py-1 text-right">รวม (บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map((item, i) => `
              <tr>
                <td class="border px-2 py-1 text-center">${i + 1}</td>
                <td class="border px-2 py-1">${item.nameTh || item.name}</td>
                <td class="border px-2 py-1 text-center">${item.amount.toFixed(2)}</td>
                <td class="border px-2 py-1 text-right">${item.price}</td>
                <td class="border px-2 py-1 text-right">${item.subtotal}</td>
              </tr>
            `).join("")}
            <tr class="border-t font-semibold bg-gray-50">
              <td colspan="2" class="px-2 py-2 text-left">รวมทั้งหมด</td>
              <td class="px-2 py-2 text-center">${totalKg.toFixed(2)}</td>
              <td class="px-2 py-2 text-right">-</td>
              <td class="px-2 py-2 text-right">${totalBaht}</td>
            </tr>
          </tbody>
        </table>

        <table class="w-full border border-gray-300 mt-2 text-sm">
          <tbody>
            <tr class="border-t font-semibold">
              <td class="px-2 py-2 text-left" colspan="3">( ${thaiText} )</td>
              <td class="px-2 py-2 text-right">รวมเป็นเงิน</td>
              <td class="px-2 py-2 text-right">${(totalBaht).toFixed(2)}</td>
            </tr>
            <tr class="font-medium">
              <td colspan="3"></td>
              <td class="px-2 py-2 text-right">ภาษีมูลค่าเพิ่ม 7%</td>
              <td class="px-2 py-2 text-right">0.00</td>
            </tr>
            <tr class="font-bold bg-gray-50 border-t">
              <td colspan="3"></td>
              <td class="px-2 py-2 text-right">ยอดสุทธิ</td>
              <td class="px-2 py-2 text-right">${totalBaht.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="text-xs mt-2 text-gray-700 leading-relaxed">
          <div class="font-semibold">เงื่อนไขการชำระเงิน</div>
          ${payMethod === 'โอนเงิน'
            ? `กรุณาโอนชำระเงินภายใน 3 วัน นับจากวันจัดส่งสินค้า<br/>
              เข้าบัญชี <strong>ธนาคารกสิกรไทย</strong><br/>
              เลขที่บัญชี: <strong>113-8-48085-9</strong><br/>
              ชื่อบัญชี: <strong>นายฮาเล็ม เจะมาริกัน</strong>`
            : payMethod === 'เครดิต' ? `กรุณาชำระเงินหลังจากวางบิลภายใน 7 วัน`
            : `กรุณาชำระเงินภายในวันจัดส่งสินค้า`}
        </div>

        <div class="grid grid-cols-2 gap-6 text-sm text-gray-600 mt-10 text-center">
          <div><div class="border-t border-gray-400 pt-2">ลงชื่อฟาร์ม</div></div>
          <div><div class="border-t border-gray-400 pt-2">ลงชื่อลูกค้า</div></div>
        </div>
        <div class="text-center mt-4">สั่งซื้อเรียบร้อยแล้ว ✨ ขอบคุณที่ใช้บริการครับ 🙏</div>
      </div>
    `;

    document.getElementById("form-container").innerHTML = html;
    setTimeout(() => UI.showSuccessToast(), 100);
  }
};

// ==================================================
// 📱 PAGE RENDERING
// ==================================================
const PageRenderer = {
  renderFormClosed() {
    const container = document.getElementById("form-container");
    container.innerHTML = `
      <div class="max-w-lg mx-auto p-2 bg-white shadow-lg rounded-lg text-gray-800">
        <div class="flex items-center gap-2 text-3xl font-black justify-center tracking-tight mb-4">
          <img src="logo.png" alt="Halem Farm Logo" class="w-14 h-14 object-contain" />
          <span>HALEM FARM</span>
        </div>
        <div class="text-center text-xl">
          </br>เนื่องจากสถานการณ์ฟาร์มตอนนี้ผักขาดตลาด  </br> ขออนุญาตปิดรับออร์เดอร์ชั่วคราว </br>
          จะพร้อมส่งในอีก 1 สัปดาห์ </br>
          ขออภัยในความไม่สะดวกครับ 🙏🏻👨🏻‍🌾🥬
        </div>
      </div>
    `;
  },

  renderForm() {
    const container = document.getElementById("form-container");
    const customerSectionHTML = UI.generateCustomerSection();

    container.innerHTML = `
      <div class="max-w-lg mx-auto p-2 bg-white shadow-lg rounded-lg text-gray-800">
        <div class="flex items-center gap-2 text-3xl font-black justify-center tracking-tight mb-4">
          <img src="logo.png" alt="Halem Farm Logo" class="w-14 h-14 object-contain" />
          <span>HALEM FARM</span>
        </div>
        <div class="text-sm mt-2 mb-2 text-center text-gray-600">
          กรุณาสั่งก่อน <span class="font-medium">${String(APP_CONFIG.ORDER_CUTOFF_TIME.HOUR).padStart(2, '0')}:${String(APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE).padStart(2, '0')} น.</span> เพื่อจัดส่งภายในวันนี้ หากเลยเวลานี้จะจัดส่งในวันถัดไป
        </div>

        <div id="customer-section">
          <div class="grid grid-cols-2 gap-2 mb-2">
            ${customerSectionHTML}
            <div class="border border-green-600 rounded-lg p-2">
              <label class="block text-gray-700 font-medium mb-1 bg-gray-100 border border-gray-300 rounded-lg p-1">
                เลือกวิธีชำระเงิน <span class="text-xs text-red-500">*ห้ามว่าง</span>
              </label>
              <select id="pay-method" class="w-full border rounded-md px-4 py-2 shadow-sm">
                <option value="" selected>เลือกวิธีชำระเงิน</option>
                <option value="เงินสด">💵 เงินสดธนบัตร</option>
                <option value="โอนเงิน">📱 เงินสดโอนเงิน</option>
                <option value="เครดิต">💳 เครดิต</option>
              </select>
            </div>
            <div class="border border-green-600 rounded-lg p-2 col-span-2">
              <label for="delivery-date" class="block text-gray-700 font-medium mb-1 bg-gray-100 border border-gray-300 rounded-lg p-1">
                🚛 เลือกวันที่จัดส่ง
              </label>
              <input id="delivery-date" type="date" class="w-full border rounded-md px-4 py-2 shadow-sm" onchange="updateDeliveryDate()" />
            </div>
            <div class="col-span-2 bg-gray-200 border border-gray-200 rounded-lg p-2">
              <span id="formatted-date" class="text-green-700 font-normal"></span>
              <span id="holiday-warning" class="text-red-500 font-normal"></span>
            </div>
          </div>
        </div>

        <div class="divide-y divide-gray-200 mt-4" id="vegetables-section">
          <div class="font-medium text-lg">📋 รายการผัก</div>
          ${UI.generateVegetablesSection()}
        </div>

        <div class="mt-4 flex justify-between font-medium text-lg">
          <div>รวมทั้งหมด:</div>
          <div class="text-right">
            <span id="total-amount">0.0</span> กก. /
            <span id="total-price">0</span> บาท
          </div>
        </div>

        <div class="mt-6">
          <button id="check-order-btn" onclick="confirmOrder()"
                  class="w-full text-white bg-green-600 hover:bg-green-700 py-2 px-4 rounded shadow opacity-50 cursor-not-allowed"
                  disabled>
            ✅ ตรวจสอบคำสั่งซื้อ
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
    let deliveryDate = new Date();
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(APP_CONFIG.ORDER_CUTOFF_TIME.HOUR, APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE, 0, 0);

    if (now.getTime() >= cutoff.getTime()) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

    if (Utils.isFarmClosed(deliveryDateStr)) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    const finalDateStr = deliveryDate.toISOString().split('T')[0];
    document.getElementById("delivery-date").value = finalDateStr;
    document.getElementById("delivery-date").min = finalDateStr;

    // Update delivery date display immediately
    updateDeliveryDate();
  },

  showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice) {
    const container = document.getElementById("form-container");
    const thaiDeliveryDate = Utils.formatThaiDate(deliveryDate);
    const deliveryDayText = Utils.getDeliveryDayText(deliveryDate);

    const rows = summary.map((item, index) => `
      <tr class="border-b">
        <td class="px-2 py-1">${item.nameTh}</td>
        <td class="px-2 text-center py-1">${item.amount.toFixed(2)}</td>
        <td class="px-2 text-center py-1">${item.price}</td>
        <td class="px-2 text-right py-1">${item.subtotal}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="max-w-xl mx-auto bg-white shadow p-2 rounded-lg font-[Kanit] text-lg">
        <h2 class="text-xl font-bold mb-2 text-center">ตรวจสอบคำสั่งซื้อ</h2>

        <table class="w-full border mb-4">
          <thead class="bg-gray-100">
            <tr class="border-b">
              <th class="px-2 py-1 text-left">รายการผัก</th>
              <th class="px-2 py-1 text-center">จำนวน (กก.)</th>
              <th class="px-2 py-1 text-center">ราคา/กก.</th>
              <th class="px-2 py-1 text-right">รวม (บาท)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot class="font-black bg-gray-50 border-t">
            <tr>
              <td class="px-2 py-1">รวม</td>
              <td class="px-2 py-1 text-center">${totalAmount.toFixed(2)}</td>
              <td class="px-2 py-1 text-right" colspan="2">${totalPrice}</td>
            </tr>
          </tfoot>
        </table>

        <div class="grid grid-cols-1 mb-2">
          <div>🏪 ชื่อร้าน : <strong>${customer}</strong></div>
          <div>💳 วิธีชำระเงิน : <strong>${payMethod}</strong></div>
          <div>🚛 วันที่จัดส่ง : <strong>${thaiDeliveryDate}</strong></div>
        </div>

        <div class="border border-yellow-300 rounded px-3 py-2">
          ⚠️ โปรดตรวจสอบและติ้กยืนยันทุกรายการ
          <div class="mt-2 space-y-1">
            <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> ตรวจสอบ "ชื่อร้าน" (${customer})</label><br>
            <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> ตรวจสอบ "วันที่จัดส่ง" (${deliveryDayText})</label><br>
            <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> ตรวจสอบ "รายการผักและยอดรวม" (รวม ${totalAmount} กก./ ${totalPrice} บ.)</label>
          </div>
          <div class="text-red-600 text-base">(*ต้องติ้กครบทุกรายการถึงจะยืนยันการสั่งซื้อได้)</div>
        </div>

        <div class="flex justify-center gap-4 mt-2">
          <button onclick="PageRenderer.renderForm()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            ⬅️ ย้อนกลับ
          </button>
          <button id="confirm-button"
                  onclick='OrderManager.submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}", "${customer}", "${payMethod}")'
                  class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 opacity-50 cursor-not-allowed"
                  disabled>
            ✅ ยืนยันการสั่งซื้อ
          </button>
        </div>
      </div>
    `;

    checkAllConfirmed();
  }
};

// ==================================================
// 🚀 APPLICATION CONTROLLER
// ==================================================
const App = {
  async init() {
    this.initCustomerData();
    await this.fetchInitialData();
  },

  initCustomerData() {
    const params = Utils.getUrlParams();
    const nameFromUrl = params.get("customer");
    const userIdFromUrl = params.get("userId");

    if (nameFromUrl) AppState.customerName = decodeURIComponent(nameFromUrl);
    if (userIdFromUrl) AppState.userId = userIdFromUrl;
  },

  async fetchInitialData() {
    PageRenderer.renderForm();
    UI.showLoading("vegetables", "กำลังโหลดรายการผัก...");
    UI.showLoading("customer", "กำลังโหลดข้อมูลลูกค้า...");

    try {
      const [vegetablesData, scheduleData, customerData] = await Promise.all([
        ApiService.fetchVegetables(),
        ApiService.fetchSchedule(),
        ApiService.fetchCustomerData(AppState.userId)
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

  formattedEl.innerText = !Utils.isFarmClosed(date) ? `${dateTxt} (${Utils.formatThaiDate(date)})` : "";
  warningEl.innerText = Utils.isFarmClosed(date) ? "🚫 วันหยุดฟาร์ม กรุณาเลือกวันอื่น" : "";
  OrderManager.checkEnableConfirmButton();
}

function confirmOrder() {
  try {
    const deliveryDate = document.getElementById("delivery-date").value;
    const customer = OrderManager.getCustomerName();
    const payMethod = document.getElementById("pay-method").value;

    Utils.validateOrderDate(deliveryDate);

    const summary = OrderManager.collectOrderSummary();
    const totalAmount = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalPrice = summary.reduce((sum, item) => sum + item.subtotal, 0);

    PageRenderer.showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice);
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