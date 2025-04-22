const vegetables = [];
let farmSchedule = {};
let customerName = "B";
let userId = null;
let savedCustomerInfo = {};

function initCustomerName() {
  const params = new URLSearchParams(window.location.search);
  const nameFromUrl = params.get("customer");
  if (nameFromUrl) {
    customerName = decodeURIComponent(nameFromUrl);
  }
  const userIdUrl = params.get("userId");
  if (userIdUrl) {
    userId = userIdUrl;
  }
}


async function fetchCustomerInfo() {
  renderForm();
  setInterval(updateRealtimeClock, 1000);
  updateRealtimeClock();
  showLoading("customer", "กำลังโหลดข้อมูลลูกค้า...");
  showLoading("vegetables", "กำลังโหลดรายการผัก...");
  showLoading("holidays", "กำลังโหลดรายการวันหยุด...");

  // showLoading("all", "กำลังโหลดข้อมูล...");
  const url = `${GOOGLE_SCRIPT_URL}?action=getCustomerInfo&userId=${encodeURIComponent(userId)}`;
  try {
    
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.id === userId) {
      savedCustomerInfo = data;
    }
    hideLoading("customer")
    renderForm();
    showLoading("vegetables", "กำลังโหลดรายการผัก...");
    showLoading("holidays", "กำลังโหลดรายการวันหยุด...");
    fetchVegetables(); // แล้วค่อยโหลดผัก
  } catch (e) {
    console.error("ไม่สามารถดึงข้อมูลลูกค้าได้:", e);
    renderForm(); // 💡 ตอนนี้ sections ถูกสร้างแล้ว
  }
}



async function fetchVegetables() {
  const res = await fetch(GOOGLE_SCRIPT_URL);
  const data = await res.json();
  vegetables.splice(0, vegetables.length, ...data.vegetables);
  farmSchedule = data.schedule;
  hideLoading("vegetables")
  hideLoading("holidays")
  renderForm();
}


function hideLoading(section = "all") {
  const id = section === "customer" ? "customer-section" :
             section === "vegetables" ? "vegetables-section" :
             section === "holidays" ? "holidays-section" :

             "form-container";

  const el = document.getElementById(id);
  if (!el) return;

  el.classList.add("opacity-0", "transition-opacity", "duration-300");
  setTimeout(() => {
    el.innerHTML = "";
    el.classList.remove("opacity-0");
  }, 300);
}

function showLoading(section = "all", text = "กำลังโหลดข้อมูล...") {
  const spinnerHTML = `
    <div class="flex flex-col items-center justify-center py-6 text-gray-500 animate-pulse">
      <svg class="w-8 h-8 mb-2 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z">
        </path>
      </svg>
      <span class="text-sm">${text}</span>
    </div>
  `;

  if (section === "customer") {
    const customerSection = document.getElementById("customer-section");
    if (customerSection) customerSection.innerHTML = spinnerHTML;
  } else if (section === "vegetables") {
    const vegSection = document.getElementById("vegetables-section");
    if (vegSection) vegSection.innerHTML = spinnerHTML;
  }  else if (section === "holidays") {
    const holidaySection = document.getElementById("holidays-section");
    if (holidaySection) holidaySection.innerHTML = spinnerHTML;
  } else {
    const container = document.getElementById("form-container");
    container.innerHTML = spinnerHTML;
  }
}

function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = `
    <div class="max-w-lg mx-auto p-2 bg-white shadow-lg rounded-lg text-gray-800">
      <div class="flex items-center gap-2 text-3xl font-black justify-center tracking-tight mb-4">
        <img src="logo.png" alt="Halem Farm Logo" class="w-14 h-14 object-contain" />
        <span>HALEM FARM</span>
      </div>
      <div class="flex justify-center items-center mb-4">
        <div id="realtime-clock" class="text-center text-sm text-gray-500">ขณะนี้: ...</div>
      </div>

      <div class=" mt-2 mb-2 text-center text-gray-600">
        ** กรุณาสั่งก่อน <span class="font-medium">08:30 น.</span> เพื่อจัดส่งภายในวันนี้ หากเลยเวลานี้จะจัดส่งในวันถัดไป **
      </div>

      <div id="customer-section">
        <div class="grid grid-cols-2 gap-4 mb-2" >
          <div>
            <label class="block text-gray-700 font-medium mb-1">🏪 ชื่อร้าน <span class="text-xs text-red-500">*ห้ามว่าง</span>
            </label>
            <input id="customer" type="text" class="w-full border rounded-md px-4 py-2 shadow-sm" placeholder="กรุณากรอกชื่อร้าน">
          </div>
          <div>
            <label class="block text-gray-700 font-medium mb-1">💳 วิธีชำระเงิน <span class="text-xs text-red-500">*ห้ามว่าง</span></label>
            <select id="pay-method" class="w-full border rounded-md px-4 py-2 shadow-sm">
            <option value="" selected>เลือกวิธีชำระเงิน</option>
              <option value="เงินสด" >เงินสด</option>
              <option value="โอนเงิน">โอนเงิน</option>
              <option value="เครดิต">เครดิต</option>
            </select>
          </div>
          <div class="col-span-2">
            <label for="delivery-date" class="block text-gray-700 font-medium mb-1">
            🚛 วันที่จัดส่ง
            <span id="formatted-date" class="text-green-700 font-normal"></span>
            <span id="holiday-warning" class="text-red-500 font-normal"></span>
            </label>
            <input id="delivery-date" type="date" class="w-full border rounded-md px-4 py-2 shadow-sm " onchange="updateDeliveryDate()" />
          </div>
        </div>
      </div>
      

      <div class="bg-red-50 border border-red-200 rounded-lg p-2" id="holidays-section">
        <div class="font-semibold text-red-700 mb-1">📌 วันหยุดฟาร์ม</div>
        <ul class="list-disc list-inside text-red-600">
          ${Object.entries(farmSchedule).filter(([_, isOpen]) => !isOpen).map(([day]) => `<li>วัน${day}</li>`).join("")}
        </ul>
      </div>

      <div class="divide-y divide-gray-200 mt-4" id="vegetables-section">
      <div class="font-medium text-lg">📋 รายการผัก</div>
        ${vegetables.map((veg, index) => `
          <div class="py-3 grid grid-cols-12 gap-2 items-center">
            <div class="col-span-2" >
              <img src="${veg.image}" alt="Halem Farm Logo" class="w-12 h-12 object-contain" />
            </div>
            <div class="col-span-4">
              <div class="font-medium">${veg.nameTh}</div>
              <div class="text-base text-gray-500">${veg.nameEng}</div>
            </div>
            <div class="col-span-4">
              <input type="number" min="0" step="0.5" data-name="${veg.nameEng}" data-nameth="${veg.nameTh}" data-price="${veg.price}" data-image="${veg.image}" placeholder="จำนวน (กก.)" class="input-box border rounded-md shadow-sm px-3 py-1 w-full text-right" oninput="updateItemTotal(this)" />
              <div class="text-sm text-right">${veg.price} บาท/กก.</div>
            </div>
            <div class="col-span-2 text-right font-semibold">
              <span id="total-${index}" class="font-bold underline">0</span> บาท
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-4 flex justify-between font-medium text-lg">
        <div>รวมทั้งหมด:</div>
        <div class="text-right">
          <span id="total-amount">0.0</span> กก. /
          <span id="total-price">0</span> บาท
        </div>
      </div>

      <div class="mt-6">
        <button id="check-order-btn" onclick="confirmOrder()" class="w-full text-white bg-green-600 hover:bg-green-700 py-2 px-4 rounded shadow opacity-50 cursor-not-allowed" disabled>
          ✅ ตรวจสอบคำสั่งซื้อ
        </button>
      </div>



    </div>
  `;

  let deliveryDate = new Date();
  const cutoffHour = 8;
  const cutoffMinute = 30;

  if (deliveryDate.getHours() > cutoffHour || (deliveryDate.getHours() === cutoffHour && deliveryDate.getMinutes() >= cutoffMinute)) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  while (isFarmClosed(deliveryDate.toISOString().split("T")[0])) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  const deliveryDateStr = deliveryDate.toLocaleDateString("sv-SE");
  document.getElementById("delivery-date").value = deliveryDateStr;
  document.getElementById("delivery-date").min = deliveryDateStr;
  document.getElementById("customer").value = savedCustomerInfo.shop || "";
  document.getElementById("pay-method").value = savedCustomerInfo.method || "";
  document.getElementById("customer").addEventListener("input", checkEnableConfirmButton);
  document.getElementById("pay-method").addEventListener("change", checkEnableConfirmButton);

  updateDeliveryDate();
}

function updateItemTotal(input) {
  const price = parseFloat(input.dataset.price);
  const amount = parseFloat(input.value);
  const index = [...document.querySelectorAll('input[data-name]')].indexOf(input);
  const total = !isNaN(price * amount) ? (price * amount) : "0";
  document.getElementById(`total-${index}`).innerText = total;
  updateSummaryTotal();
  checkEnableConfirmButton();
}

function updateSummaryTotal() {
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
}

function checkEnableConfirmButton() {
  const inputs = document.querySelectorAll('input[data-name]');
  const date = document.getElementById("delivery-date").value;
  const customer = document.getElementById("customer").value;
  const payMethod = document.getElementById("pay-method").value;
  const btn = document.getElementById("check-order-btn");

  const hasPayMethod = payMethod.trim() !== "";
  const hasCustomer = customer.trim() !== "";
  const hasOrder = Array.from(inputs).some(input => {
    const amount = parseFloat(input.value);
    return !isNaN(amount) && amount > 0;
  });
  const isClosed = isFarmClosed(date);
  if (hasOrder && !isClosed && hasCustomer && hasPayMethod) {
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");
  }
}

function confirmOrder() {
  const inputs = document.querySelectorAll('input[data-name]');
  const deliveryDate = document.getElementById("delivery-date").value;
  const customer = document.getElementById("customer").value;
  const payMethod = document.getElementById("pay-method").value;
  const summary = [];
  let totalAmount = 0;
  let totalPrice = 0;
  inputs.forEach(input => {
    const amount = parseFloat(input.value);
    const price = parseFloat(input.dataset.price);
    if (!isNaN(amount) && amount > 0) {
      summary.push({ name: input.dataset.name,nameTh:input.dataset.nameth, amount, price, subtotal: price * amount,image:input.dataset.image });
      totalAmount += amount;
      totalPrice += price * amount;
    }
  });
  showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice);
}

function showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice) {
  const container = document.getElementById("form-container");

  const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
  const thaiToday = formatFullThaiDate(new Date());

  const rows = summary.map((item, index) => `
    <tr class="border-b">
      <td class="px-2 py-1">
      <img src="${item.image}" alt="Vegetable" class="w-8 h-8 object-contain" /></td>
      <td class="px-2 py-1">${item.nameTh}</td>
      <td class="px-2 text-center py-1">${item.amount.toFixed(2)}</td>
      <td class="px-2 text-center py-1">${item.price}</td>
      <td class="px-2 text-right py-1">${item.subtotal}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="max-w-xl mx-auto bg-white shadow p-2 rounded-lg font-[Kanit] ">
      <h2 class="text-xl font-bold mb-2 text-center"> ตรวจสอบคำสั่งซื้อ</h2>
      
      <div class="grid grid-cols-1 gap-4  mb-4">
        <div class="col-span-2 font-thin">สั่งซื้อ: <strong>${thaiToday}</strong> </div>
        <div>ชื่อลูกค้า: <strong>${customer}</strong> </div>
        <div class="text-right">วิธีชำระเงิน: <strong>${payMethod}</strong> </div>
      </div>

      <table class="w-full border mb-4 text-sm">
        <thead class="bg-gray-100">
          <tr class="border-b">
            <th colspan="2" class="px-2 py-1 text-left">รายการผัก</th>
            <th class="px-2 py-1 text-center">จำนวน (กก.)</th>
            <th class="px-2 py-1 text-center">ราคา/กก.</th>
            <th class="px-2 py-1 text-right">รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot class="font-black bg-gray-50 border-t">
          <tr>
            <td class="px-2 py-1" colspan="2">รวมทั้งหมด</td>
            <td class="px-2 py-1  text-center">${totalAmount.toFixed(2)}</td>
            <td></td>
            <td class="px-2 py-1  text-right">${totalPrice}</td>
          </tr>
        </tfoot>
      </table>
      <div class="grid grid-cols-1 gap-4  mb-4">
        <div class="text-right">จัดส่ง <strong>${thaiDeliveryDate}</strong></div>
      </div>
      <div class="bg-yellow-50 border border-yellow-300 rounded px-3 py-2 mb-4 text-yellow-800 ">
        ⚠️ โปรดตรวจสอบรายการให้ถูกต้องก่อนกดยืนยัน หากต้องการแก้ไข กรุณากดย้อนกลับ
      </div>
      <div class="flex justify-center gap-4 mt-6">
        <button onclick="renderForm()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          ⬅️ ย้อนกลับ
        </button>
        <button 
          onclick='submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}", "${customer}", "${payMethod}")' 
          class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ✅ ยืนยันการสั่งซื้อ
        </button>
      </div>
    </div>
  `;
}



function submitOrder(summaryJson, deliveryDate, customer, payMethod) {
  const summary = JSON.parse(summaryJson);
  const payload = {
    date: new Date().toISOString(),
    deliveryDate: deliveryDate,
    user: customer,
    userLine : customerName,
    payMethod: payMethod,
    userId: userId,
    order: summary
  };

  console.log("submitOrder payload : ",payload)

  showLoading("all","กำลังส่งคำสั่งซื้อ...");
  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(() => {
    const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
    const thaiToday = formatFullThaiDate(new Date());
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const thaiText = convertNumberToThaiText(totalBaht);
    const vat = (totalBaht * 7) / 107; // VAT ที่รวมอยู่แล้ว
    const net = totalBaht;
    const itemsHtml = summary.map(item => `
      <tr class="border-t text-sm">
        <td class="px-2 py-1">${item.nameTh} (${item.name})</td>
        <td class="px-2 py-1 text-center">${item.amount.toFixed(2)}</td>
        <td class="px-2 py-1 text-right">${item.price}</td>
        <td class="px-2 py-1 text-right">${item.subtotal}</td>
      </tr>
    `).join('');
    const html = `
      <div class="max-w-md mx-auto bg-white border rounded-lg shadow p-1 text-sm text-gray-800">
        <h2 class="text-2xl font-bold text-center mb-2 mt-1">ใบสั่งซื้อ</h2>
          <div class="flex items-center gap-2 text-xl font-black justify-center tracking-tight mb-2">
            <img src="logo.png" alt="Halem Farm Logo" class="w-12 h-12 object-contain" />
            <span>HALEM FARM</span>
          </div>

          <div class="grid grid-cols-1 gap-2 mb-2 text-sm">
            <div>
              <div><strong>สั่งโดย:</strong> ${customerName}</div>
              <div><strong>ชื่อลูกค้า:</strong> ${customer}</div>
              <div><strong>วิธีชำระเงิน:</strong> ${payMethod}</div>
              <div><strong>วันที่สั่งซื้อ:</strong> ${thaiToday}</div>
              <div><strong>วันที่จัดส่ง:</strong> ${thaiDeliveryDate}</div>
            </div>
            <div class="text-right">
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
                <td class="px-2 py-2 text-left" colspan="3">
                  ( ${thaiText} )
                </td>
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
              : payMethod === 'เครดิต' ? `กรุณาชำระเงินหลังจากวางบิลภายใน 7 วัน` : `กรุณาชำระเงินภายในวันจัดส่งสินค้า`}
          </div>

          <div class="grid grid-cols-2 gap-6 text-sm text-gray-600 mt-10 text-center">
            <div>
              <div class="border-t border-gray-400 pt-2">ลงชื่อฟาร์ม</div>
            </div>
            <div>
              <div class="border-t border-gray-400 pt-2">ลงชื่อลูกค้า</div>
            </div>
          </div>
        <div class="text-center mt-4">สั่งซื้อเรียบร้อยแล้ว ✨ ขอบคุณที่ใช้บริการครับ 🙏</div>
      </div>
    `;
    document.getElementById("form-container").innerHTML = html;
    setTimeout(() => {
      showSuccessToast();
    }, 100);
    
  });
}

function formatFullThaiDate(dateStr) {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const date = new Date(dateStr);
  const day = days[date.getDay()];
  const dayNum = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `วัน${day}ที่ ${dayNum} ${month} พ.ศ. ${year}`;
}

function isFarmClosed(dateStr) {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const dayName = days[new Date(dateStr).getDay()];
  return farmSchedule[dayName] === false;
}

function updateDeliveryDate() {
  const date = document.getElementById("delivery-date").value;
  const formattedEl = document.getElementById("formatted-date");
  const warningEl = document.getElementById("holiday-warning");
  if (!date) {
    formattedEl.innerText = "";
    warningEl.innerText = "";
    return;
  }
  formattedEl.innerText = !isFarmClosed(date) ? `(${formatFullThaiDate(date)})` : "";
  warningEl.innerText = isFarmClosed(date) ? "🚫 วันหยุดฟาร์ม กรุณาเลือกวันอื่น" : "";
  checkEnableConfirmButton();
}

function updateRealtimeClock() {
  const now = new Date();
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const day = days[now.getDay()];
  const date = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear() + 543;
  const time = now.toLocaleTimeString('th-TH', { hour12: false });
  const fullText = `วัน${day}ที่ ${date} ${month} พ.ศ. ${year}\n เวลา ${time}`;
  const element = document.getElementById("realtime-clock");
  if (!element) return; // ✅ ป้องกัน error ถ้า element ไม่เจอ
  element.innerText = fullText;
}

function convertNumberToThaiText(amount) {
  const numberText = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const unitText = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  function readNumber(num) {
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
          result += numberText[digit];
        }
        result += unitText[len - i - 1];
      }
    }

    return result;
  }

  const parts = amount.toFixed(2).split(".");
  const baht = parseInt(parts[0]);
  const satang = parseInt(parts[1]);

  let text = "";

  if (baht > 0) {
    text += readNumber(baht) + "บาท";
  }

  if (satang > 0) {
    text += readNumber(satang) + "สตางค์";
  } else {
    text += "ถ้วน";
  }

  return text;
}


function showSuccessToast() {
  const toast = document.getElementById("toast-success");
  if (toast) {
    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
}


initCustomerName();
fetchCustomerInfo();
