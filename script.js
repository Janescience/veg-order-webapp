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
  showLoading("กำลังโหลดรายการผักวันนี้...");
  const url = `${GOOGLE_SCRIPT_URL}?action=getCustomerInfo&name=${encodeURIComponent(customerName)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.name === customerName) {
      savedCustomerInfo = data;
    }
    fetchVegetables();
  } catch (e) {
    console.error("ไม่สามารถดึงข้อมูลลูกค้าได้:", e);
  }
}



async function fetchVegetables() {
  const res = await fetch(GOOGLE_SCRIPT_URL);
  const data = await res.json();
  vegetables.splice(0, vegetables.length, ...data.vegetables);
  farmSchedule = data.schedule;
  renderForm();
  setInterval(updateRealtimeClock, 1000);
  updateRealtimeClock();
}

function showLoading(text = "กำลังโหลดข้อมูล...") {
  const container = document.getElementById("form-container");
  container.innerHTML = `<div class="text-center text-gray-500 py-8">${text}</div>`;
}

function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = `
    <div class="max-w-lg mx-auto p-4 bg-white shadow-md rounded-lg text-gray-800">
      <div class="flex justify-between items-center mb-4">
        <div class="text-2xl font-bold tracking-tight">HALEM FARM</div>
        <div id="realtime-clock" class="text-right text-sm text-gray-500">ขณะนี้: ...</div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-gray-700 font-medium mb-1">🏪 ชื่อร้าน </label>
          <input id="customer" type="text" class="w-full border rounded-md px-4 py-2 shadow-sm text-sm" placeholder="กรุณากรอกชื่อร้าน">
        </div>
        <div>
          <label class="block text-gray-700 font-medium mb-1">💳 วิธีชำระเงิน</label>
          <select id="pay-method" class="w-full border rounded-md px-4 py-2 shadow-sm text-sm">
          <option value="" selected>กรุณาเลือกวิธีชำระเงิน</option>
            <option value="เงินสด" >เงินสด</option>
            <option value="โอนเงิน">โอนเงิน</option>
            <option value="เครดิต">เครดิต</option>
          </select>
        </div>
      </div>

      <div class="mb-4">
        <label for="delivery-date" class="block text-gray-700 font-medium mb-1">📦 วันที่จัดส่ง</label>
        <input id="delivery-date" type="date" class="w-full border rounded-md px-4 py-2 shadow-sm text-sm" onchange="updateDeliveryDate()" />
        <p id="formatted-date" class="text-sm text-green-700 mt-1"></p>
        <p id="holiday-warning" class="text-sm text-red-500 mt-1"></p>
      </div>

      <div class="divide-y divide-gray-200">
        ${vegetables.map((veg, index) => `
          <div class="py-3 grid grid-cols-12 gap-2 items-center">
            <div class="col-span-6">
              <div class="font-medium">${veg.nameTh}</div>
              <div class="font-medium">${veg.nameEng}</div>
              <div class="text-xs text-gray-500">(${veg.price} บาท/กก.)</div>
            </div>
            <div class="col-span-4">
              <input type="number" min="0" step="0.5" data-name="${veg.nameEng}" data-nameth="${veg.nameTh}" data-price="${veg.price}" placeholder="จำนวน (กก.)" class="input-box border rounded-md shadow-sm px-3 py-1 w-full text-right text-sm" oninput="updateItemTotal(this)" />
            </div>
            <div class="col-span-2 text-right font-semibold">
              <span id="total-${index}">0</span> บาท
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

      <div class="text-sm mt-4 text-gray-600">
        ⏰ กรุณาสั่งก่อน <span class="font-medium">08:30 น.</span> เพื่อจัดส่งภายในวันนี้ หากเลยเวลานี้จะจัดส่งในวันถัดไป
      </div>

      <div class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
        <div class="font-semibold text-red-700 mb-1">📌 วันหยุดฟาร์ม</div>
        <ul class="list-disc list-inside text-red-600">
          ${Object.entries(farmSchedule).filter(([_, isOpen]) => !isOpen).map(([day]) => `<li>วัน${day}</li>`).join("")}
        </ul>
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

  const deliveryDateStr = deliveryDate.toISOString().split("T")[0];
  document.getElementById("delivery-date").value = deliveryDateStr;
  document.getElementById("delivery-date").min = deliveryDateStr;
  document.getElementById("customer").value = savedCustomerInfo.shop || "";
  document.getElementById("pay-method").value = savedCustomerInfo.method || "";

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
      summary.push({ name: input.dataset.name,nameTh:input.dataset.nameth, amount, price, subtotal: price * amount });
      totalAmount += amount;
      totalPrice += price * amount;
    }
  });
  showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice);
}

function showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice) {
  const container = document.getElementById("form-container");
  const formattedDate = formatFullThaiDate(deliveryDate);
  const rows = summary.map(item => `
    <tr class="border-t">
      <td class="px-3 py-2 text-left">${item.nameTh} (${item.name})</td>
      <td class="px-3 py-2 text-center">${item.amount.toFixed(1)}</td>
      <td class="px-3 py-2 text-center">${item.price}</td>
      <td class="px-3 py-2 text-right">${item.subtotal}</td>
    </tr>
  `).join('');
  const summaryRow = `
    <tr class="border-t bg-gray-50 font-medium">
      <td class="px-3 py-2 text-left">รวมทั้งหมด</td>
      <td class="px-3 py-2 text-center">${totalAmount.toFixed(1)}</td>
      <td class="px-3 py-2 text-center"></td>
      <td class="px-3 py-2 text-right">${totalPrice}</td>
    </tr>
  `;
  container.innerHTML = `
    <h3 class="text-lg font-semibold mb-4">🔍 ตรวจสอบคำสั่งซื้อ</h3>
    <div class="overflow-x-auto">
      <table class="w-full border border-gray-300 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-3 py-2 text-left">รายการผัก</th>
            <th class="px-3 py-2 text-center">จำนวน (กก.)</th>
            <th class="px-3 py-2 text-center">ราคา/กก.</th>
            <th class="px-3 py-2 text-right">รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${summaryRow}
        </tbody>
      </table>
    </div>

    <div class="mt-6 flex flex-col items-end space-y-2">
      <div>🏪 ชื่อร้าน: <strong>${customer}</strong></div>
      <div>💳 วิธีชำระเงิน: <strong>${payMethod}</strong></div>
      <div>🚚 จัดส่ง: <strong>${formattedDate}</strong></div>
      <div class="flex gap-3 mt-2">
        <button onclick="renderForm()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">❌ ย้อนกลับ</button>
        <button onclick='submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}", "${customer}", "${payMethod}")' class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">✅ ยืนยันการสั่งซื้อ</button>
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

  showLoading("กำลังส่งคำสั่งซื้อ...");
  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(() => {
    const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsHtml = summary.map(item => `
      <tr class="border-t text-sm">
        <td class="px-2 py-1">${item.nameTh} (${item.name})</td>
        <td class="px-2 py-1 text-center">${item.amount.toFixed(1)}</td>
        <td class="px-2 py-1 text-right">${item.price}</td>
        <td class="px-2 py-1 text-right">${item.subtotal}</td>
      </tr>
    `).join('');
    const html = `
      <div class="max-w-md mx-auto bg-white border rounded-lg shadow p-1 text-sm text-gray-800">
        <h2 class="text-xl font-bold text-center mb-4">🧾 ใบสั่งสินค้า</h2>
        <div class="mb-4">
          <div><strong>👤 ลูกค้า:</strong> ${customer}</div>
          <div><strong>💳 ชำระเงิน:</strong> ${payMethod}</div>
          <div><strong>🚚 วันที่จัดส่ง:</strong> ${thaiDeliveryDate}</div>
        </div>
        <table class="w-full border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-2 py-1 text-left">รายการผัก</th>
              <th class="px-2 py-1 text-center">จำนวน(กก.)</th>
              <th class="px-2 py-1 text-right">ราคา/กก.</th>
              <th class="px-2 py-1 text-right">รวม(บาท)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="border-t font-semibold bg-green-50">
              <td class="px-2 py-2 text-left">รวมทั้งหมด</td>
              <td class="px-2 py-2 text-center">${totalKg.toFixed(1)}</td>
              <td class="px-2 py-2 text-right"></td>
              <td class="px-2 py-2 text-right">${totalBaht}</td>
            </tr>
          </tbody>
        </table>
        <div class="text-center font-medium mt-2">✅ สั่งซื้อเรียบร้อยแล้ว ขอบคุณที่ใช้บริการค่ะ</div>
      </div>
    `;
    document.getElementById("form-container").innerHTML = html;
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
  if (!date) return;
  formattedEl.innerText = formatFullThaiDate(date);
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
  document.getElementById("realtime-clock").innerText = fullText;
}

initCustomerName();
fetchCustomerInfo();
