const vegetables = [];
let farmSchedule = {};
let savedCustomerInfo = [];
let userId = null;
let isAdmin = true;


function initCustomerName() {
  const params = new URLSearchParams(window.location.search);
  const userIdUrl = params.get("userId");
  if (userIdUrl) {
    userId = userIdUrl;
  }
  const keyUrl = params.get("key");
  isAdmin = keyUrl === 'halemfarm-secret-key-1989'
}

async function fetchDefaultData() {
  const url = `${GOOGLE_SCRIPT_URL}?userId=${encodeURIComponent(userId)}`;
  try{
    const res = await fetch(url);
    const data = await res.json();

    vegetables.splice(0, vegetables.length, ...data.vegetables);
    farmSchedule = data.schedule;
    savedCustomerInfo = data.customer

    renderForm();
  }catch(e){
    console.error("ไม่สามารถดึงข้อมูลลูกค้าได้:", e);
  }
}

function renderForm() {
  const shops = Array.isArray(savedCustomerInfo) ? savedCustomerInfo : [];

  let customerSectionHTML = `
    <div id="customer-section" class="border border-green-600 rounded-lg p-2">
      <label class="block font-medium mb-2 bg-gray-100 border border-gray-300 rounded-lg p-1">
      👨🏽👩🏽 ลูกค้า
      </label>
      <select id="shop-select" name="customer-choice" autocomplete="off" class="w-full rounded-lg shadow-sm accent-green-600">
        ${savedCustomerInfo.map(c => `<option value="${c.shop}">${c.shop}</option>`).join("")}
      </select>
    </div>
  `;
  
  const container = document.getElementById("form-container");
  if(!isAdmin){
    container.innerHTML = `
    <h1>NO ADMIN</h1>
    `;
  }else{
    container.innerHTML = `
      <div class="max-w-lg mx-auto p-2 bg-white shadow-md rounded-lg text-gray-800">
        <div class="flex items-center gap-2 text-3xl font-black justify-center tracking-tight mb-4">
          <span>HALEM FARM ADMIN</span>
        </div>

        <div id="customer-section">
          <div class="grid grid-cols-2 gap-4 mb-2" >
            ${customerSectionHTML}
            <div class="border border-green-600 rounded-lg p-2">
            <label class="block text-gray-700 font-medium mb-1 bg-gray-100 border border-gray-300 rounded-lg p-1 ">💳 การชำระเงิน </label>
            <select id="pay-method" class="w-full border rounded-md px-4 py-2 shadow-sm">
            <option value="" selected>การชำระเงิน</option>
              <option value="เงินสด" >เงินสด</option>
              <option value="โอนเงิน">โอนเงิน</option>
              <option value="เครดิต">เครดิต</option>
            </select>
          </div>
          <div class="border border-green-600 rounded-lg p-2 col-span-2">
            <label for="delivery-date" class="block text-gray-700 font-medium mb-1 bg-gray-100 border border-gray-300 rounded-lg p-1">
            🚛 วันที่จัดส่ง
            
            </label>
            <input id="delivery-date" type="date" class="w-full border rounded-md px-4 py-2 shadow-sm " onchange="updateDeliveryDate()" />
          </div>
          <div class="col-span-2 bg-gray-200 border border-gray-200 rounded-lg p-2">
            <span id="formatted-date" class="text-green-700 font-normal"></span>
            <span id="holiday-warning" class="text-red-500 font-normal"></span>
          </div>
          </div>
        </div>
        

        <div class="divide-y divide-gray-200 mt-4" id="vegetables-section">
        <div class="font-medium text-lg">🥬 รายการผัก</div>
          ${vegetables.map((veg, index) => `
            <div class="py-3 grid grid-cols-12 gap-2 items-center">
            
              <div class="col-span-4">
                <div class="font-medium">${veg.nameEng}</div>
              </div>
              <div class="col-span-3">
                  <input type="number" min="0" step="1" value="${veg.price}" 
                    class="veg-price-input input-box border rounded-md shadow-sm px-3 py-1 w-full text-right"
                    data-index="${index}" 
                    oninput="updatePrice(this, ${index})" 
                  /> 
                
              </div>
              <div class="col-span-3">
                <input type="number" min="0" step="0.5" data-name="${veg.nameEng}" data-nameth="${veg.nameTh}" data-price="${veg.price}" placeholder="จำนวน (กก.)" class="input-box border rounded-md shadow-sm px-3 py-1 w-full text-right" oninput="updateItemTotal(this)" />
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
          <button id="check-order-btn" onclick="confirmOrder()" class="w-full text-white bg-green-600 hover:bg-green-700 py-2 px-4 rounded shadow  " >
            ✅ ตรวจสอบคำสั่งซื้อ
          </button>
        </div>

      </div>
    `;

    if (shops.length >= 2) {
      const idx = 0; // radio แรก
      document.getElementById('pay-method').value = shops[idx].method;
    } else if (shops[0]?.method) {
      document.getElementById('pay-method').value = shops[0].method;
    }

    new TomSelect('#shop-select', {
      create: true,         // อนุญาตให้เพิ่ม option ใหม่จากที่พิมพ์
      persist: false,       // ไม่ต้องจำ option ที่สร้างใหม่ไว้ถ้า refresh
      sortField: { field: "text", direction: "asc" },
      placeholder: "เลือกลูกค้า"
    });
    

    const shopSelect = document.getElementById('shop-select');
    const paySelect   = document.getElementById('pay-method');

    shopSelect.addEventListener('change', e => {
      const chosen = e.target.value;

      // ถ้าร้านอยู่ใน shops = ร้านเก่า, ถ้าไม่เจอ = ร้านใหม่
      const shopObj = shops.find(s => s.shop === chosen);
      if (shopObj) {
        paySelect.value = shopObj.method || "";
      } else {
        paySelect.value = ""; // ร้านใหม่ ยังไม่รู้ method
      }
    });
    
    let deliveryDate = new Date();
    if (isFarmClosed(deliveryDate)) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
    const deliveryDateStr = deliveryDate.toISOString().split("T")[0];
    document.getElementById("delivery-date").value = deliveryDateStr;

    updateDeliveryDate();
  }
  
}



function updatePrice(input, index) {
  const newPrice = parseFloat(input.value);
  if (isNaN(newPrice) || newPrice < 0) return;

  // อัปเดตใน DOM input ที่กรอกจำนวน
  const amountInput = document.querySelectorAll('input[data-name]')[index];
  amountInput.dataset.price = newPrice;

  // อัปเดตผลรวม
  updateItemTotal(amountInput);
}


function updateItemTotal(input) {
  const price = parseFloat(input.dataset.price);
  const amount = parseFloat(input.value);
  const index = [...document.querySelectorAll('input[data-name]')].indexOf(input);
  const total = !isNaN(price * amount) ? (price * amount) : "0";
  document.getElementById(`total-${index}`).innerText = total;
  updateSummaryTotal();
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

function confirmOrder() {
  let customer = document.getElementById("shop-select").value.trim();

  if(customer == ""){
    window.alert("ชื่อร้านห้ามว่าง")
  }else{
    const inputs = document.querySelectorAll('input[data-name]');
    const deliveryDate = document.getElementById("delivery-date").value;
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
    console.log("summary : ",summary)
    if(totalAmount > 0){
      
      // showConfirmationModal(
      //   summary,
      //   deliveryDate,
      //   customer,
      //   payMethod,
      //   totalAmount,
      //   totalPrice,
      // );
      showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice);
    }else{
      window.alert("กรอกจำนวน กก. อย่างน้อย 1 รายการ")

    }
  }
}

function showConfirmationModal(summary, deliveryDate, customer, payMethod,totalAmount,totalPrice) {

    // 2) คำนวณ relative day
    const today = new Date();
    const del = new Date(deliveryDate);
    const utc1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utc2 = Date.UTC(del.getFullYear(),    del.getMonth(),    del.getDate());
    const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    let relativeText = '';
    if      (diffDays === 0) relativeText = 'วันนี้';
    else if (diffDays === 1) relativeText = 'พรุ่งนี้';
    else relativeText = `ในอีก ${diffDays} วัน`;

  const modal = document.createElement('div');
  modal.id = 'confirmation-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-lg w-full font-[Kanit]">
      <h3 class="text-2xl font-bold mb-4 text-center">ตรวจสอบความถูกต้อง</h3>

      <p class="text-red-600 mb-4">ติ้กยืนยันทั้งหมดเพื่อความถูกต้องในการสั่งซื้อ</p>

      <div class="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
        <label class="inline-flex items-center">
          <span class="font-medium text-xl">วันนี้ ${formatFullThaiDate(new Date())}</span>
        </label>
      </div>

      <div class="mb-4 p-2 bg-green-50 rounded border border-green-200">
        <label class="inline-flex items-center">
          <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 mr-2" id="date-checkbox">
          <span class="font-medium text-xl">จัดส่ง <u>${formatFullThaiDate(deliveryDate)}</u></span>
        </label>
      </div>

      <div class="mb-4 p-2 bg-red-50 rounded border border-red-200">
        <label class="inline-flex items-center">
          <span class="font-medium text-xl">หมายความว่าจัดส่ง<u>${relativeText}</u> ?</span>
          <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 ml-2" >
        </label>
      </div>

      <div class="mb-4 overflow-y-auto max-h-60 border rounded p-2">
        ${ summary.map((item, idx) => `
          <label class="flex items-center mb-2">
            <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 mr-2" data-index="${idx}">
            <div class="flex-1">
              <div>${item.nameTh}</div>
              <div class="text-gray-700">จำนวน ${item.amount.toFixed(2)} กก. × ${item.price} บ. = ${item.subtotal} บาท</div>
            </div>
          </label>
        `).join('') }
      </div>

      <div class="text-xl mt-2 mb-2 p-2 bg-gray-100 rounded flex justify-between font-semibold">
        <label class="inline-flex items-center">
          <p class="text-green-600 font-medium">รายการผักถูกต้องทั้ง ${summary.length} รายการ ?</p>
          <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 ml-2" >
        </label>
      </div>

      <div class="text-xl mt-2 mb-2 p-2 bg-gray-100 rounded flex justify-between font-semibold">
        <span>รวมทั้งหมด</span>
        <span>${totalAmount} กก. / ${totalPrice} บาท</span>
      </div>


      ${ payMethod === 'เครดิต' ? `
      <div class="mb-4">
        <label class="inline-flex items-center">
          <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 mr-2" >
          <p class="text-red-600 font-medium">⚠️ อย่าลืมกรอกข้อมูลบริษัทเพื่อออกใบสั่งสินค้า</p>
        </label>
      </div>` : `
      <div class="mb-4">
        <label class="inline-flex items-center">
          <input type="checkbox" class="confirm-checkbox w-6 h-6 mt-1 mr-2" >
          <p class="text-red-600 font-medium">⚠️ อย่าลืมกรอกข้อมูลบริษัทถ้าต้องออกใบเสร็จ</p>
        </label>
      </div>
      `
    }


      <div class="flex justify-end space-x-4">
        <button id="cancel-modal-btn" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">ยกเลิก</button>
        <button id="final-confirm-btn"
                class="px-4 py-2 bg-green-600 text-white rounded opacity-50 cursor-not-allowed"
                disabled>
          ✅ ยืนยันสุดท้าย
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const checkboxes = modal.querySelectorAll('.confirm-checkbox');
  const finalBtn   = modal.querySelector('#final-confirm-btn');
  const cancelBtn  = modal.querySelector('#cancel-modal-btn');

  function updateFinalBtnState() {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    finalBtn.disabled = !allChecked;
    finalBtn.classList.toggle('opacity-50', !allChecked);
    finalBtn.classList.toggle('cursor-not-allowed', !allChecked);
  }

  checkboxes.forEach(cb => cb.addEventListener('change', updateFinalBtnState));
  cancelBtn.addEventListener('click', () => modal.remove());

  finalBtn.addEventListener('click', () => {
    // เมื่อติ๊กครบ ให้ปิด modal แล้วไปหน้าสรุปคำสั่งซื้อ
    modal.remove();
    showConfirmPage(summary, customer, payMethod, deliveryDate,
                    summary.reduce((s, i) => s + i.amount, 0),
                    summary.reduce((s, i) => s + i.subtotal, 0));
  });
}

function showConfirmPage(summary, customer, payMethod, deliveryDate, totalAmount, totalPrice) {
  const container = document.getElementById("form-container");

  const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
  const thaiToday = formatFullThaiDate(new Date());

  const deliveryDayText = getDeliveryDayText(deliveryDate);

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
      <h2 class="text-xl font-bold mb-2 text-center"> ตรวจสอบคำสั่งซื้อ</h2>
      
      <table class="w-full border mb-4 ">
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
            <td class="px-2 py-1" >รวม</td>
            <td class="px-2 py-1  text-center">${totalAmount.toFixed(2)}</td>
            <td class="px-2 py-1  text-right" colspan="2">${totalPrice}</td>
          </tr>
        </tfoot>
      </table>
      <div class="grid grid-cols-1 mb-2">
        <div>🏪 ชื่อร้าน : <strong>${customer}</strong> </div>
        <div>💳 วิธีชำระเงิน : <strong>${payMethod}</strong> </div>
        <div> 
          🚛 วันที่จัดส่ง : <strong>${thaiDeliveryDate}</strong>
        </div>
      </div>
      <div class="border border-yellow-300 rounded px-3 py-2 ">
        ⚠️ ตรวจสอบและติ้กยืนยันทุกรายการ
      <div class="mt-2 space-y-1">
        <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> ชื่อร้าน <b class="text-xl underline decoration-4 decoration-sky-500">🏬 ${customer}</b></label><br>
        <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> วันที่จัดส่ง <b class="text-xl underline decoration-4 decoration-pink-500">${deliveryDayText}</b></label><br>
        <label><input type="checkbox" class="check-confirm w-5 h-5 accent-green-600" onchange="checkAllConfirmed()"> ยอดรวม <b class="text-xl underline decoration-4 decoration-green-500">🥬 ${totalAmount} กก. (${totalPrice} บ.)</b></label>
      </div>
    </div>

      <div class="flex justify-center gap-4 mt-2">
        <button onclick="renderForm()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          ⬅️ ย้อนกลับ
        </button>
        <button 
          id="confirm-button"
          onclick='submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}", "${customer}", "${payMethod}")' 
          class="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 opacity-50 cursor-not-allowed"
          disabled
        >
          ✅ ยืนยันการสั่งซื้อ
        </button>

      </div>
    </div>
  `;

  checkAllConfirmed()
}

function checkAllConfirmed() {
  const checkboxes = document.querySelectorAll('.check-confirm');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  const confirmBtn = document.getElementById("confirm-button");
  if(allChecked){
    confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
    confirmBtn.disabled = false;
  }else{
    confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
    confirmBtn.disabled = true;
  }

}


function submitOrder(summaryJson, deliveryDate, customer, payMethod) {
  const summary = JSON.parse(summaryJson);

  const submitBtn = document.getElementById("confirm-button");
  submitBtn.innerText = "⏳ กำลังบันทึกข้อมูล...";
  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-50", "cursor-not-allowed");

  const payload = {
    date: new Date().toISOString(),
    deliveryDate: deliveryDate,
    user: customer,
    userLine : "ADMIN",
    payMethod: payMethod,
    userId: "ADMIN",
    order: summary
  };

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  .then(async res => {
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }
    const text = await res.text(); // อ่านเป็น text ก่อน
    if (text.trim().toLowerCase() === "error") {
      throw new Error('Server returned an error');
    }
    return JSON.parse(text); // ถ้าไม่ error แล้วค่อย parse เป็น JSON
  })
  .then(() => {
    const thaiDeliveryDate = formatFullThaiDate(deliveryDate);
    const thaiToday = formatFullThaiDate(new Date());
    const totalKg = summary.reduce((sum, item) => sum + item.amount, 0);
    const totalBaht = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const thaiText = convertNumberToThaiText(totalBaht);
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
            <span>HALEM FARM ADMIN</span>
          </div>

          <div class="grid grid-cols-1 gap-2 mb-2 text-sm">
            <div>
              <div><strong>สั่งโดย:</strong> ADMIN </div>
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
    submitBtn.innerText = "✅ ยืนยันการสั่งซื้อ";
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    
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
  return `${day}ที่ ${dayNum} ${month} ${year}`;
}

function isFarmClosed(dateStr) {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
  const dayName = days[new Date(dateStr).getDay()];
  return farmSchedule[dayName] === false;
}

function getDeliveryDayText(deliveryDate) {
  const today = new Date();
  const delivery = new Date(deliveryDate);

  // รีเซ็ตเวลาให้เทียบแค่วัน (ตัดเวลาออก)
  today.setHours(0,0,0,0);
  delivery.setHours(0,0,0,0);

  const diffTime = delivery - today;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "🚚 จัดส่งวันนี้";
  } else if (diffDays === 1) {
    return "🚚 จัดส่งพรุ่งนี้";
  } else if (diffDays > 1) {
    return `🚚 จัดส่งในอีก ${diffDays} วัน`;
  } else {
    return "บันทึกรายการย้อนหลัง ";
  }
}

function updateDeliveryDate() {
  const date = document.getElementById("delivery-date").value;
  const formattedEl = document.getElementById("formatted-date");
  const warningEl = document.getElementById("holiday-warning");
  const dateTxt = getDeliveryDayText(date)
  if (!date) {
    formattedEl.innerText = "";
    warningEl.innerText = "";
    return;
  }
  formattedEl.innerText = !isFarmClosed(date) ? `${dateTxt} (${formatFullThaiDate(date)})` : "";
  warningEl.innerText = isFarmClosed(date) ? "🚫 วันหยุดฟาร์ม กรุณาเลือกวันอื่น" : "";
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
fetchDefaultData();