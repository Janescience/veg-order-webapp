async function fetchVegetables() {
  showLoading("กำลังโหลดเมนู...");
  const res = await fetch(GOOGLE_SCRIPT_URL);
  const data = await res.json();
  vegetables.splice(0, vegetables.length, ...data);
  renderForm();
}

const vegetables = [];

function showLoading(text = "กำลังโหลด...") {
  const container = document.getElementById("form-container");
  container.innerHTML = `<p>${text}</p>`;
}

function renderForm() {
  const container = document.getElementById("form-container");
  const today = new Date().toISOString().split("T")[0];
  container.innerHTML = `
    <div class="veg-item">
      <label>📅 วันที่จัดส่ง:</label>
      <input type="date" id="delivery-date" value="${today}" class="input-box" />
    </div>
    ${vegetables.map((veg, index) => `
      <div class="veg-item row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <div style="flex: 1;">${veg.name} (${veg.price} บาท/กก.)</div>
        <input type="number" min="0" step="0.1" data-name="${veg.name}" data-price="${veg.price}" placeholder="จำนวน" class="input-box" style="width: 80px;" oninput="updateSubtotal(this, ${index})" />
        <div id="subtotal-${index}" style="width: 100px; text-align: right;">0 บาท</div>
      </div>
    `).join('')}
    <button onclick="confirmOrder()">ตรวจสอบคำสั่งซื้อ</button>
  `;
}

function updateSubtotal(input, index) {
  const price = parseFloat(input.dataset.price);
  const amount = parseFloat(input.value);
  const subtotal = (!isNaN(amount) && amount > 0) ? (amount * price) : 0;
  document.getElementById(`subtotal-${index}`).innerText = `${subtotal.toFixed(2)} บาท`;
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
  const rows = summary.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.amount} กก.</td>
      <td>${item.price.toFixed(2)} บาท</td>
      <td>${item.subtotal.toFixed(2)} บาท</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h3>🔍 ตรวจสอบคำสั่งซื้อ</h3>
    <p>📅 วันที่จัดส่ง: ${deliveryDate}</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1em;">
      <thead>
        <tr style="background: #f0f0f0;">
          <th style="padding: 8px; border: 1px solid #ccc;">สินค้า</th>
          <th style="padding: 8px; border: 1px solid #ccc;">จำนวน</th>
          <th style="padding: 8px; border: 1px solid #ccc;">ราคาต่อหน่วย</th>
          <th style="padding: 8px; border: 1px solid #ccc;">รวม</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p><strong>รวมทั้งหมด:</strong> ${totalAmount} กก. / ${totalPrice.toFixed(2)} บาท</p>
    <button onclick="renderForm()">❌ ย้อนกลับ</button>
    <button onclick='submitOrder(${JSON.stringify(JSON.stringify(summary))}, "${deliveryDate}")'>✅ ยืนยันการสั่งซื้อ</button>
  `;
}

function submitOrder(summaryJson, deliveryDate) {
  const summary = JSON.parse(summaryJson);
  const payload = {
    date: new Date().toISOString(),
    deliveryDate: deliveryDate,
    user: "ลูกค้าจาก LINE",
    order: summary
  };

  showLoading("กำลังส่งคำสั่งซื้อ...");

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(result => {
    const summaryText = summary.map(item => `${item.name} ${item.amount} กก.`).join('\n');
    const totalText = summary.reduce((sum, item) => sum + item.subtotal, 0);
    const message = `✅ สั่งซื้อสำเร็จ\n📅 วันที่จัดส่ง: ${deliveryDate}\n\n${summaryText}\n\nรวมทั้งหมด: ${totalText.toFixed(2)} บาท`;
    document.getElementById("form-container").innerHTML = `<h3>${message.replace(/\n/g, '<br>')}</h3>`;
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

fetchVegetables();
