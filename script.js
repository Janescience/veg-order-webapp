const vegetables = [];
let farmSchedule = {};

async function fetchVegetables() {
  showLoading("กำลังโหลดรายการผักวันนี้...");
  const res = await fetch(GOOGLE_SCRIPT_URL);
  const data = await res.json();

  // ดึงข้อมูลผัก
  vegetables.splice(0, vegetables.length, ...data.vegetables);

  // ดึงตารางวันเปิด-ปิดฟาร์ม
  farmSchedule = data.schedule;

  renderForm();
}


function showLoading(text = "กำลังโหลดข้อมูล...") {
  const container = document.getElementById("form-container");
  container.innerHTML = `<div class="text-center text-gray-500 py-8">${text}</div>`;
}

function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = `
    <div class="mb-4">
      <label class="block mb-1 font-medium text-lg text-gray-700 flex items-center gap-2">
        🧺 เลือกผักที่ต้องการ 🥬
      </label>
      <div class="text-right">
        <div class="inline-flex items-center gap-2">
          <label for="delivery-date" class="whitespace-nowrap  text-gray-600">🚚 วันที่จัดส่ง </label>
          <input 
            id="delivery-date" 
            type="date" 
            class="border rounded-md px-3 py-2 shadow-sm text-sm cursor-pointer"
            onchange="updateDeliveryDate()" 
          />
        </div>
        <p id="formatted-date" class="font-medium mt-1 text-gray-700"></p>
        <p id="holiday-warning" class="font-medium mt-1 text-red-600"></p>
      </div>
    </div>
    <div class="space-y-4">
      ${vegetables.map((veg, index) => `
        <div class="grid grid-cols-12 items-center gap-2">
          <div class="col-span-5 text-sm font-medium text-gray-800 leading-snug">
            ${veg.name}
            <div class="text-xs text-gray-500">(${veg.price} บาท/กก.)</div>
          </div>
          <div class="col-span-4">
            <input 
              type="number" 
              min="0" 
              step="0.5" 
              data-name="${veg.name}" 
              data-price="${veg.price}"
              placeholder="จำนวน (กก.)" 
              class="input-box border rounded-md shadow-sm px-3 py-1 w-full text-right text-sm"
              oninput="updateItemTotal(this)"
            />
          </div>
          <div class="col-span-3 text-right text-sm font-semibold text-gray-700">
            <span id="total-${index}">0</span> บาท
          </div>
        </div>
      `).join('')}
    </div>
    <div class="mt-4 text-right  font-medium text-gray-700">
      รวมทั้งหมด: <span id="total-amount">0.0</span> กก. /
      <span id="total-price">0</span> บาท
    </div>
    <div class="text-center mt-6">
      <button 
        id="check-order-btn"
        onclick="confirmOrder()" 
        class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow opacity-50 cursor-not-allowed"
        disabled
      >
        ตรวจสอบคำสั่งซื้อ
      </button>
    </div>
  `;

  const closedDaysHtml = `
  <div class="mt-6 text-sm text-gray-600">
    <div class="bg-red-50 border border-red-200 rounded-lg p-3">
      <div class="font-medium text-red-700 mb-1">📌 วันหยุดฟาร์ม</div>
      <ul class="list-disc list-inside text-red-600">
        ${Object.entries(farmSchedule)
          .filter(([_, isOpen]) => !isOpen)
          .map(([day]) => `<li>วัน${day}</li>`)
          .join("")}
      </ul>
    </div>
  </div>
`;
container.innerHTML += closedDaysHtml;

  // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("delivery-date");
  dateInput.value = today;
  dateInput.min = today;
  updateDeliveryDate();

  // (Optional) เปิด calendar เมื่อคลิก
  dateInput.addEventListener("click", () => dateInput.showPicker?.());
}

function updateItemTotal(input) {
  const price = parseFloat(input.dataset.price);
  const amount = parseFloat(input.value);
  const index = [...document.querySelectorAll('input[data-name]')].indexOf(input);
  const total = !isNaN(price * amount) ? (price * amount) : "0";
  document.getElementById(`total-${index}`).innerText = total;

  updateSummaryTotal(); // อัปเดตรวม กก. และ บาท
  checkEnableConfirmButton();
}



function updateSubtotal(input, index) {
  const price = parseFloat(input.dataset.price);
  const amount = parseFloat(input.value);
  const subtotal = (!isNaN(amount) && amount > 0) ? (amount * price) : 0;
  document.getElementById(`subtotal-${index}`).innerText = `${subtotal} บาท`;
}

function confirmOrder() {
  const inputs = document.querySelectorAll('input[data-name]');
  const deliveryDate = document.getElementById("delivery-date").value;
  const summary = [];
  let totalAmount = 0;
  let totalPrice = 0;

  inputs.forEach(input => {
    const amount = parseFloat(input.value);
    const price = parseFloat(input.dataset.price);
    if (!isNaN(amount) && amount > 0) {
      summary.push({
        name: input.dataset.name,
        amount,
        price,
        subtotal: price * amount
      });
      totalAmount += amount;
      totalPrice += price * amount;
    }
  });

  if (summary.length === 0) {
    alert('กรุณาเลือกผักอย่างน้อย 1 รายการ');
    return;
  }

  showConfirmPage(summary, deliveryDate, totalAmount, totalPrice);
}

function showConfirmPage(summary, deliveryDate, totalAmount, totalPrice) {
  const container = document.getElementById("form-container");
  const formattedDate = formatFullThaiDate(deliveryDate);

  const rows = summary.map(item => `
    <tr class="border-t">
      <td class="px-3 py-2 text-left">${item.name}</td>
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

    <div class="mt-6 flex flex-col items-end space-y-4">
      <div class="text-gray-700 text-right">
        🚚 จัดส่ง <strong>${formattedDate}</strong>
      </div>
      <div class="flex gap-3">
        <button onclick="renderForm()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">❌ ย้อนกลับ</button>
        <button onclick='submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}")' class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">✅ ยืนยันการสั่งซื้อ</button>
      </div>
    </div>
  `;
}

const randomUserNames = [
  "คุณสายเขียว",
  "แม่ค้าคนเก่ง",
  "ลูกค้าประจำ",
  "FC ฟาร์มสด",
  "นักกินผักมือโปร",
  "พี่จ๋าสายสุขภาพ",
  "สายออร์แกนิก",
  "เด็กกินคลีน",
  "คุณผักสด",
  "สายคะน้า"
];

function getRandomUserName() {
  const index = Math.floor(Math.random() * randomUserNames.length);
  return randomUserNames[index];
}



function submitOrder(summaryJson, deliveryDate) {
  const summary = JSON.parse(summaryJson);
  const payload = {
    date: new Date().toISOString(),
    deliveryDate: deliveryDate,
    user: getRandomUserName(),
    order: summary
  };

  showLoading("กำลังส่งคำสั่งซื้อ...");

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(result => {
    const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
    const orderDate = formatFullThaiDate(new Date().toISOString());
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);

    // รายการสินค้า
    const itemsHtml = summary.map(item => `
      <tr class="border-t text-sm">
        <td class="px-2 py-1">${item.name}</td>
        <td class="px-2 py-1 text-center">${item.amount.toFixed(1)}</td>
        <td class="px-2 py-1 text-right">${item.price}</td>
        <td class="px-2 py-1 text-right">${item.subtotal}</td>
      </tr>
    `).join('');

    // ✅ สร้าง HTML แบบใบสั่งสินค้า
    const html = `
      <div class="max-w-md mx-auto bg-white border rounded-lg shadow p-1 text-sm text-gray-800">
        <h2 class="text-xl font-bold text-center mb-4">🧾 ใบสั่งสินค้า</h2>

        <div class="mb-4">
          <div class="mb-1"><strong>👤 ลูกค้า:</strong> ${payload.user}</div>
          <div class="mb-1"><strong>🗓️ วันที่สั่งซื้อ:</strong> ${orderDate}</div>
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

        <div class="text-center font-medium mt-2">
          ✅ สั่งซื้อเรียบร้อยแล้ว ขอบคุณที่ใช้บริการค่ะ
        </div>
      </div>
    `;

    document.getElementById("form-container").innerHTML = html;

    const summaryText = summary.map(item => `- ${item.name} ${item.amount} กก.`).join('\n');
    const message = 
    `✅ สั่งซื้อสำเร็จ
    🗓️ วันที่จัดส่ง: ${thaiDeliveryDate}

    ${summaryText}

    📦 รวมทั้งหมด: ${totalKg.toFixed(1)} กก. / ${totalBaht} บาท`;

    sendLineMessage(message);
  });
}

function sendLineMessage(msg) {
  if (window.liff && liff.sendMessages) {
    liff.sendMessages([
      {
        type: "text",
        text: msg
      }
    ]).catch(err => console.error("ส่งข้อความเข้าไลน์ไม่สำเร็จ:", err));
  }
}

function formatFullThaiDate(dateStr) {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

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

  if (isFarmClosed(date)) {
    warningEl.innerText = "🚫 วันหยุดฟาร์ม กรุณาเลือกวันอื่น";
  } else {
    warningEl.innerText = "";
  }

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
  const btn = document.getElementById("check-order-btn");

  const hasOrder = Array.from(inputs).some(input => {
    const amount = parseFloat(input.value);
    return !isNaN(amount) && amount > 0;
  });

  const isClosed = isFarmClosed(date);

  if (hasOrder && !isClosed) {
    btn.disabled = false;
    btn.classList.remove("opacity-50", "cursor-not-allowed");
  } else {
    btn.disabled = true;
    btn.classList.add("opacity-50", "cursor-not-allowed");
  }
}





fetchVegetables();
