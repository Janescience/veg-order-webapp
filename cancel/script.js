
const params = new URLSearchParams(window.location.search);
const cancelId = params.get("id");

if (cancelId) {
  showCancelPage(cancelId);
} else {
  document.getElementById("form-container").innerHTML = `<div class="text-center text-red-500">❌ ไม่มี ID ออเดอร์</div>`;
}

async function showCancelPage(id) {
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrder&id=${encodeURIComponent(id)}`);
    const order = await res.json();
    renderCancelPage(order);
  } catch (e) {
    console.error("โหลดออเดอร์ผิดพลาด", e);
    document.getElementById("form-container").innerHTML = `<div class="text-center text-red-500">❌ ไม่พบข้อมูลออเดอร์</div>`;
  }
}

function renderCancelPage(order) {
  const container = document.getElementById("form-container");

  const itemsHtml = order.order.map(item => `
    <tr class="border-t text-sm">
      <td class="px-2 py-1">${item.nameTh}</td>
      <td class="px-2 py-1 text-center">${item.amount.toFixed(2)}</td>
      <td class="px-2 py-1 text-right">${item.price}</td>
      <td class="px-2 py-1 text-right">${item.subtotal}</td>
    </tr>
  `).join('');

  const totalKg = order.order.reduce((sum, item) => sum + item.amount, 0);
  const totalBaht = order.order.reduce((sum, item) => sum + item.subtotal, 0);

  container.innerHTML = `
    <div class="bg-white p-4 rounded-lg shadow-lg">
      <h2 class="text-xl font-bold mb-4 text-center">รายละเอียดการสั่งซื้อ</h2>
      <div class="space-y-1 mb-4">
        <div>🏪 ชื่อร้าน : <strong>${order.user}</strong></div>
        <div>📅 วันที่สั่งซื้อ : <strong>${order.date}</strong></div>
        <div>🚛 วันที่จัดส่ง : <strong>${formatFullThaiDate(order.deliveryDate)}</strong></div>
        <div>👤 สั่งซื้อโดย : <strong>${order.userLine || "-"}</strong></div>
        <div>💳 วิธีชำระเงิน : <strong>${order.payMethod || "-"}</strong></div>
      </div>
      <table class="w-full border text-sm mb-4">
        <thead class="bg-gray-100">
          <tr>
            <th class="border px-2 py-1">รายการ</th>
            <th class="border px-2 py-1 text-center">จำนวน (กก.)</th>
            <th class="border px-2 py-1 text-right">ราคา/หน่วย</th>
            <th class="border px-2 py-1 text-right">รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot class="font-semibold bg-gray-50">
          <tr>
            <td class="px-2 py-2 text-left">รวม</td>
            <td class="px-2 py-2 text-center">${totalKg.toFixed(2)}</td>
            <td class="px-2 py-2 text-right"></td>
            <td class="px-2 py-2 text-right">${totalBaht}</td>
          </tr>
        </tfoot>
      </table>

      <div class="flex justify-center mt-4">
        <button onclick="showCancelModal('${order.id}')" class="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          ยกเลิกคำสั่งซื้อ
        </button>
      </div>
    </div>

    <div id="modal-cancel" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center">
      <div class="bg-white p-6 rounded-lg">
        <p class="text-lg mb-4">⚠️ รายการจะถูกลบออกจาก Google Sheet ถาวร ยืนยันยกเลิกคำสั่งซื้อ ใช่หรือไม่ ?</p>
        <div class="flex justify-center gap-4">
          <button onclick="cancelOrder('${order.id}')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">ยืนยันยกเลิก</button>
          <button onclick="closeCancelModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">ไม่ยกเลิก</button>
        </div>
      </div>
    </div>
  `;
}

function formatFullThaiDate(dateStr) {
  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function showCancelModal() {
  document.getElementById('modal-cancel').classList.remove('hidden');
  document.getElementById('modal-cancel').classList.add('flex');
}

function closeCancelModal() {
  document.getElementById('modal-cancel').classList.add('hidden');
}

async function cancelOrder(id) {
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "cancelOrder", id }),
    });
    document.getElementById("form-container").innerHTML = `
      <div class="text-center text-green-600 mt-10">✅ ยกเลิกออเดอร์เรียบร้อยแล้ว</div>
    `;
  } catch (e) {
    console.error(e);
    document.getElementById("form-container").innerHTML = `
      <div class="text-center text-red-500 mt-10">❌ ยกเลิกไม่สำเร็จ</div>
    `;
  }
}
