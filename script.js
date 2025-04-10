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
      <input type="date" id="delivery-date" value="${today}" />
    </div>
    ${vegetables.map(veg => `
      <div class="veg-item">
        <label>${veg.name} (${veg.price} บาท/กก.)</label>
        <input type="number" min="0" step="0.1" data-name="${veg.name}" data-price="${veg.price}" placeholder="ใส่จำนวนกก." />
      </div>
    `).join('')}
    <button onclick="confirmOrder()">ตรวจสอบคำสั่งซื้อ</button>
  `;
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
  const list = summary.map(item => `<li>${item.name} - ${item.amount} กก. = ${item.subtotal} บาท</li>`).join('');
  container.innerHTML = `
    <h3>🔍 ตรวจสอบคำสั่งซื้อ</h3>
    <p>📅 วันที่จัดส่ง: ${deliveryDate}</p>
    <ul>${list}</ul>
    <p>รวมทั้งหมด: ${totalAmount} กก. / ${totalPrice} บาท</p>
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
    const message = `✅ สั่งซื้อสำเร็จ\n📅 วันที่จัดส่ง: ${deliveryDate}\n\n${summaryText}\n\nรวมทั้งหมด: ${totalText} บาท`;
    document.getElementById("form-container").innerHTML = `<h3>${message.replace(/\n/g, '<br>')}</h3>`;
    sendLineMessage(message);
  });
}

function sendLineMessage(msg) {
  if (liff && liff.sendMessages) {
    liff.sendMessages([
      {
        type: "text",
        text: msg
      }
    ]).catch(err => console.error("ส่งข้อความเข้าไลน์ไม่สำเร็จ:", err));
  }
}

fetchVegetables();
