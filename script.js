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
const UI = {
  icon(name, className = "w-4 h-4") {
    return `<i data-lucide="${name}" class="${className}"></i>`;
  },

  // Replace <i data-lucide> placeholders with SVG icons after each render
  renderIcons() {
    if (window.lucide) lucide.createIcons();
  },

  header() {
    return `
      <header class="flex items-center justify-center gap-3 pt-2 pb-1">
        <img src="logo.png" alt="Halem Farm Logo" class="w-11 h-11 object-contain" />
        <div class="leading-tight">
          <div class="text-xl font-medium tracking-wide text-gray-900">HALEM FARM</div>
          <div class="text-xs text-gray-500">สั่งผักออร์แกนิคจากฟาร์ม</div>
        </div>
      </header>
    `;
  },

  sectionLabel(icon, text, extra = "") {
    return `
      <div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
        ${this.icon(icon, "w-4 h-4 text-gray-400")}
        <span>${text}</span>
        ${extra}
      </div>
    `;
  },

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
    this.renderIcons();
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
      this.renderIcons();
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), APP_CONFIG.UI.TOAST_SUCCESS_DURATION);
    }
  },

  showErrorToast(message) {
    const toast = document.getElementById("toast-error");
    if (toast) {
      const messageEl = document.getElementById("toast-error-message");
      if (messageEl && message) messageEl.innerText = message;
      this.renderIcons();
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), APP_CONFIG.UI.TOAST_ERROR_DURATION);
    }
  },

  generateCustomerSection() {
    const shops = Array.isArray(AppState.savedCustomerInfo) ? AppState.savedCustomerInfo : [];
    const esc = Utils.escapeHtml;

    if (shops.length >= 2) {
      const chipClass = "inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-4 py-2 text-sm text-gray-700 transition peer-checked:bg-green-600 peer-checked:text-white peer-checked:shadow-float peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/40";
      const shopChips = shops.map((c, i) => `
        <label class="cursor-pointer">
          <input type="radio" name="customer-choice" value="${esc(c.shop)}"
                 class="peer sr-only" id="shop-${i}" ${i === 0 ? "checked" : ""} />
          <span class="${chipClass}">${esc(c.shop)}</span>
        </label>
      `).join("");

      return `
        ${this.sectionLabel("store", "เลือกร้านที่เคยสั่ง")}
        <div class="flex flex-wrap gap-2">
          ${shopChips}
          <label class="cursor-pointer">
            <input type="radio" name="customer-choice" value="__NEW__" class="peer sr-only" id="shop-new" />
            <span class="${chipClass}">${this.icon("plus", "w-3.5 h-3.5")} ร้านใหม่</span>
          </label>
        </div>
        <div id="new-shop-input" class="hidden mt-3">
          <input id="customer-new" type="text" placeholder="กรอกชื่อร้านใหม่"
                 class="w-full rounded-full bg-stone-100 px-4 py-2.5 text-gray-900 placeholder-gray-400" />
        </div>
      `;
    }

    const defaultShop = shops[0]?.shop || "";
    return `
      ${this.sectionLabel("store", "ชื่อร้าน", '<span class="ml-auto text-xs text-red-500">จำเป็น</span>')}
      <input id="customer-new" type="text" placeholder="กรุณากรอกชื่อร้าน"
             class="w-full rounded-full bg-stone-100 px-4 py-2.5 text-gray-900 placeholder-gray-400" value="${esc(defaultShop)}" />
    `;
  },

  generateVegetablesSection() {
    const esc = Utils.escapeHtml;
    return AppState.vegetables.map((veg, index) => `
      <div class="flex items-center gap-3 py-2.5">
        <div class="w-14 h-14 shrink-0 rounded-2xl bg-stone-50 flex items-center justify-center overflow-hidden">
          <img src="${esc(veg.image)}" alt="${esc(veg.nameTh)}" loading="lazy" class="w-11 h-11 object-contain" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-gray-900 font-normal truncate">${esc(veg.nameTh)}</div>
          <div class="text-xs text-gray-400 truncate">${esc(veg.nameEng)}</div>
          <div class="text-xs text-gray-500">${veg.price} บ./กก.</div>
        </div>
        <div class="w-28 shrink-0 text-right">
          <div class="relative">
            <input type="number" min="0" step="0.5" inputmode="decimal"
                   data-name="${esc(veg.nameEng)}" data-nameth="${esc(veg.nameTh)}"
                   data-price="${veg.price}" data-image="${esc(veg.image)}"
                   placeholder="0"
                   class="input-box w-full rounded-full bg-stone-100 pl-3 pr-9 py-2 text-right text-gray-900 placeholder-gray-400"
                   oninput="OrderManager.updateItemTotal(this)" />
            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">กก.</span>
          </div>
          <div class="text-xs text-gray-500 mt-1"><span id="total-${index}" class="text-gray-900">0</span> บ.</div>
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
      <div class="flex justify-between gap-4 py-0.5">
        <span class="text-gray-400 shrink-0">${label}</span>
        <span class="text-gray-900 text-right">${value}</span>
      </div>
    `;
    const divider = `<div class="my-4 border-t border-dashed border-gray-300"></div>`;

    const paymentTerms = payMethod === 'โอนเงิน'
      ? `กรุณาโอนชำระเงินภายใน 3 วัน นับจากวันจัดส่งสินค้า<br/>
         ธนาคารกสิกรไทย เลขที่บัญชี <span class="text-gray-900 tabular-nums">113-8-48085-9</span><br/>
         ชื่อบัญชี นายฮาเล็ม เจะมาริกัน`
      : payMethod === 'เครดิต'
        ? `กรุณาชำระเงินหลังจากวางบิลภายใน 7 วัน`
        : `กรุณาชำระเงินภายในวันจัดส่งสินค้า`;

    const html = `
      <div class="max-w-md mx-auto px-4 pt-6 pb-36 animate-fade-in">
        <div class="flex flex-col items-center text-center mb-5">
          <div class="w-14 h-14 rounded-full bg-green-600 text-white shadow-float-lg flex items-center justify-center mb-3">
            ${UI.icon("check", "w-7 h-7")}
          </div>
          <div class="text-lg text-gray-900 font-normal">สั่งซื้อเรียบร้อยแล้ว</div>
          <div class="text-sm text-gray-500">บันทึกหรือแชร์ใบสั่งซื้อเก็บไว้เป็นหลักฐานได้</div>
        </div>

        <div id="receipt" class="bg-white rounded-3xl shadow-float px-5 py-6 text-sm font-light text-gray-600">
          <div class="flex flex-col items-center text-center">
            <img src="logo.png" alt="Halem Farm Logo" class="w-14 h-14 object-contain mb-1" />
            <div class="text-base font-medium tracking-wide text-gray-900">HALEM FARM</div>
            <div class="text-xs text-gray-400">ผักออร์แกนิคจากฟาร์ม</div>
            <div class="mt-3 rounded-full bg-stone-100 px-4 py-1 text-xs tracking-wide text-gray-600">ใบสั่งซื้อ</div>
            ${isReplacement ? `<div class="mt-2 text-xs text-amber-600">แก้ไขคำสั่งซื้อเดิมของวันจัดส่งนี้</div>` : ""}
          </div>

          ${divider}

          ${infoRow("เลขที่อ้างอิง", `<span class="tabular-nums">#${reference}</span>`)}
          ${infoRow("วันที่สั่ง", `${Utils.formatThaiDate(orderedAt)} ${orderedTime}`)}
          ${infoRow("วันที่จัดส่ง", Utils.formatThaiDate(deliveryDate))}
          ${infoRow("ร้าน", esc(customer))}
          ${infoRow("สั่งโดย", esc(AppState.customerName))}
          ${infoRow("ชำระเงิน", esc(payMethod))}

          ${divider}

          <div class="flex justify-between text-xs text-gray-400 mb-2">
            <span>รายการ</span>
            <span>จำนวนเงิน (บาท)</span>
          </div>
          ${summary.map((item) => `
            <div class="py-1.5">
              <div class="flex justify-between gap-4">
                <span class="text-gray-900">${esc(item.nameTh || item.name)}</span>
                <span class="text-gray-900 tabular-nums">${money(item.subtotal)}</span>
              </div>
              <div class="text-xs text-gray-400 tabular-nums">${item.amount.toFixed(2)} กก. × ${money(item.price)}</div>
            </div>
          `).join("")}

          ${divider}

          ${infoRow("จำนวนรายการ", `${summary.length} รายการ`)}
          ${infoRow("น้ำหนักรวม", `<span class="tabular-nums">${totalKg.toFixed(2)}</span> กก.`)}
          <div class="flex justify-between items-baseline gap-4 mt-2">
            <span class="text-gray-900 font-normal">ยอดสุทธิ</span>
            <span class="text-2xl text-gray-900 font-medium tabular-nums">${money(totalBaht)}</span>
          </div>
          <div class="text-xs text-gray-400 text-right">(${Utils.convertNumberToThaiText(totalBaht)})</div>

          ${divider}

          <div class="text-xs leading-relaxed">
            <div class="text-gray-900 mb-1">เงื่อนไขการชำระเงิน</div>
            ${paymentTerms}
          </div>

          ${divider}

          <div class="text-center text-xs text-gray-400">
            ขอบคุณที่ใช้บริการ Halem Farm
          </div>
        </div>

        <button onclick="ReceiptActions.close()" class="no-print mt-5 mx-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-gray-500 bg-transparent">
          ${UI.icon("x", "w-4 h-4")} ปิดหน้านี้
        </button>

        <div class="no-print fixed inset-x-0 bottom-0 px-4 pb-5 pt-2">
          <div class="max-w-md mx-auto flex gap-3">
            <button id="save-receipt-btn" onclick="ReceiptActions.save()"
                    class="flex-1 flex items-center justify-center gap-2 rounded-full bg-white text-gray-800 shadow-float-lg px-5 py-3.5">
              ${UI.icon("image-down", "w-5 h-5")} บันทึกรูป
            </button>
            <button id="share-receipt-btn" onclick="ReceiptActions.share()"
                    class="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 text-white shadow-float-lg px-5 py-3.5">
              ${UI.icon("share-2", "w-5 h-5")} แชร์
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("form-container").innerHTML = html;
    window.scrollTo(0, 0);
    UI.renderIcons();
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

  async toBlob() {
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
      UI.renderIcons();
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
        UI.renderIcons();
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
    UI.renderIcons();
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
    UI.renderIcons();
  },

  renderForm() {
    const container = document.getElementById("form-container");
    const cutoff = `${String(APP_CONFIG.ORDER_CUTOFF_TIME.HOUR).padStart(2, '0')}:${String(APP_CONFIG.ORDER_CUTOFF_TIME.MINUTE).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="w-full max-w-lg mx-auto px-4 pt-4 pb-32 space-y-3">
        ${UI.header()}

        <div class="flex justify-center">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-white shadow-float px-3 py-1.5 text-xs text-gray-600">
            ${UI.icon("clock", "w-3.5 h-3.5 text-gray-400")}
            สั่งก่อน ${cutoff} น. จัดส่งภายในวันนี้ หลังจากนั้นส่งวันถัดไป
          </div>
        </div>

        <section id="customer-section" class="bg-white rounded-3xl shadow-float p-4">
          ${UI.generateCustomerSection()}
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4 space-y-4">
          <div>
            ${UI.sectionLabel("wallet", "วิธีชำระเงิน", '<span class="ml-auto text-xs text-red-500">จำเป็น</span>')}
            <div class="relative">
              <select id="pay-method" class="w-full rounded-full bg-stone-100 pl-4 pr-10 py-2.5 text-gray-900">
                <option value="" selected>เลือกวิธีชำระเงิน</option>
                <option value="เงินสด">เงินสดธนบัตร</option>
                <option value="โอนเงิน">เงินสดโอนเงิน</option>
                <option value="เครดิต">เครดิต</option>
              </select>
              ${UI.icon("chevron-down", "w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none")}
            </div>
          </div>

          <div>
            ${UI.sectionLabel("calendar-days", "วันที่จัดส่ง")}
            <input id="delivery-date" type="date" onchange="updateDeliveryDate()"
                   class="w-full min-h-[44px] rounded-full bg-stone-100 px-4 py-2.5 text-left text-gray-900" />
            <div id="delivery-info" class="mt-2 px-1 text-sm">
              <span id="formatted-date" class="text-green-700"></span>
              <span id="holiday-warning" class="text-red-500"></span>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4">
          ${UI.sectionLabel("leaf", "รายการผัก")}
          <div id="vegetables-section" class="divide-y divide-stone-100">
            ${UI.generateVegetablesSection()}
          </div>
        </section>
      </div>

      <div class="fixed inset-x-0 bottom-0 px-4 pb-5 pt-2 z-40">
        <div class="max-w-lg mx-auto flex items-center justify-between gap-3 rounded-full bg-white/95 backdrop-blur shadow-float-lg py-2 pl-5 pr-2">
          <div class="leading-tight">
            <div class="text-xs text-gray-400">รวมทั้งหมด</div>
            <div class="text-gray-900 tabular-nums">
              <span id="total-amount">0.0</span> กก. · <span id="total-price">0</span> บ.
            </div>
          </div>
          <button id="check-order-btn" onclick="confirmOrder()" disabled
                  class="flex items-center gap-2 rounded-full bg-green-600 text-white px-5 py-3 shadow-float opacity-50 cursor-not-allowed">
            ตรวจสอบ ${UI.icon("arrow-right", "w-4 h-4")}
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.setDefaultDeliveryDate();
    UI.renderIcons();
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
      <div class="flex items-center gap-3 py-1.5">
        <div class="w-9 h-9 shrink-0 rounded-full bg-stone-100 text-gray-500 flex items-center justify-center">
          ${UI.icon(icon, "w-4 h-4")}
        </div>
        <div class="leading-tight min-w-0">
          <div class="text-xs text-gray-400">${label}</div>
          <div class="text-gray-900 break-words">${value}</div>
        </div>
      </div>
    `;

    const checkRow = (text) => `
      <label class="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 cursor-pointer">
        <input type="checkbox" class="check-confirm w-5 h-5 shrink-0 accent-green-600" onchange="checkAllConfirmed()">
        <span class="text-sm text-gray-700">${text}</span>
      </label>
    `;

    container.innerHTML = `
      <div class="w-full max-w-lg mx-auto px-4 pt-4 pb-32 space-y-3 animate-fade-in">
        <div class="text-center pt-2 pb-1">
          <div class="text-lg text-gray-900 font-normal">ตรวจสอบคำสั่งซื้อ</div>
          <div class="text-sm text-gray-500">โปรดตรวจสอบข้อมูลก่อนยืนยัน</div>
        </div>

        <section class="bg-white rounded-3xl shadow-float p-4">
          ${infoRow("store", "ชื่อร้าน", esc(customer))}
          ${infoRow("wallet", "วิธีชำระเงิน", esc(payMethod))}
          ${infoRow("truck", "วันที่จัดส่ง", `${Utils.formatThaiDate(deliveryDate)}<span class="text-xs text-gray-400"> · ${deliveryDayText}</span>`)}
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4">
          ${UI.sectionLabel("leaf", "รายการผัก")}
          <div class="divide-y divide-stone-100">
            ${summary.map((item) => `
              <div class="flex justify-between gap-4 py-2">
                <div class="min-w-0">
                  <div class="text-gray-900">${esc(item.nameTh)}</div>
                  <div class="text-xs text-gray-400 tabular-nums">${item.amount.toFixed(2)} กก. × ${money(item.price)}</div>
                </div>
                <div class="text-gray-900 tabular-nums">${money(item.subtotal)}</div>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between items-baseline mt-3 pt-3 border-t border-stone-100">
            <span class="text-gray-500 text-sm">รวม ${totalAmount.toFixed(2)} กก.</span>
            <span class="text-xl text-gray-900 font-medium tabular-nums">${money(totalPrice)} บ.</span>
          </div>
        </section>

        <section class="bg-white rounded-3xl shadow-float p-4 space-y-2">
          ${UI.sectionLabel("list-checks", "ติ๊กยืนยันทุกรายการ")}
          ${checkRow(`ชื่อร้านถูกต้อง (${esc(customer)})`)}
          ${checkRow(`วันที่จัดส่งถูกต้อง (${deliveryDayText})`)}
          ${checkRow(`รายการผักและยอดรวมถูกต้อง (${totalAmount.toFixed(2)} กก. / ${money(totalPrice)} บ.)`)}
          <div class="flex items-center gap-1.5 px-1 pt-1 text-xs text-gray-400">
            ${UI.icon("circle-alert", "w-3.5 h-3.5")} ต้องติ๊กครบทุกรายการจึงจะยืนยันการสั่งซื้อได้
          </div>
        </section>
      </div>

      <div class="fixed inset-x-0 bottom-0 px-4 pb-5 pt-2 z-40">
        <div class="max-w-lg mx-auto flex gap-3">
          <button onclick="PageRenderer.renderForm()"
                  class="flex items-center justify-center gap-2 rounded-full bg-white text-gray-700 shadow-float-lg px-5 py-3.5">
            ${UI.icon("arrow-left", "w-4 h-4")} แก้ไข
          </button>
          <button id="confirm-button" onclick="OrderManager.submitOrder()" disabled
                  class="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 text-white shadow-float-lg px-5 py-3.5 opacity-50 cursor-not-allowed">
            ${UI.icon("check", "w-5 h-5")} ยืนยันการสั่งซื้อ
          </button>
        </div>
      </div>
    `;

    window.scrollTo(0, 0);
    UI.renderIcons();
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
    UI.renderIcons();
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
    ? `<span class="inline-flex items-center gap-1.5">${UI.icon("truck", "w-4 h-4")} ${dateTxt} (${Utils.formatThaiDate(date)})</span>`
    : "";
  warningEl.innerHTML = closed
    ? `<span class="inline-flex items-center gap-1.5">${UI.icon("circle-alert", "w-4 h-4")} วันหยุดฟาร์ม กรุณาเลือกวันอื่น</span>`
    : "";
  UI.renderIcons();
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