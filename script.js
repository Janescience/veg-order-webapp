async function fetchVegetables() {
  const res = await fetch(GOOGLE_SCRIPT_URL);
  const data = await res.json();
  vegetables.splice(0, vegetables.length, ...data);
  renderForm();
}

const vegetables = [];

function renderForm() {
  const container = document.getElementById("form-container");
  container.innerHTML = vegetables.map(veg => \`
    <div class="veg-item">
      <label>\${veg.name} (\${veg.price} บาท/กก.)</label>
      <input type="number" min="0" step="0.1" data-name="\${veg.name}" placeholder="ใส่จำนวนกก." />
    </div>
  \`).join('') + \`
    <button onclick="confirmOrder()">ตรวจสอบคำสั่งซื้อ</button>
  \`;
}

function confirmOrder() {
  const inputs = document.querySelectorAll('input[data-name]');
  const summary = [];
  inputs.forEach(input => {
    const amount = parseFloat(input.value);
    if (!isNaN(amount) && amount > 0) {
      summary.push({
        name: input.dataset.name,
        amount
      });
    }
  });

  if (summary.length === 0) {
    alert('กรุณาเลือกผักอย่างน้อย 1 รายการ');
    return;
  }

  showConfirmPage(summary);
}

function showConfirmPage(summary) {
  const container = document.getElementById("form-container");
  const list = summary.map(item => \`<li>\${item.name} - \${item.amount} กก.</li>\`).join('');
  container.innerHTML = \`
    <h3>🔍 ตรวจสอบคำสั่งซื้อ</h3>
    <ul>\${list}</ul>
    <button onclick="renderForm()">❌ ย้อนกลับ</button>
    <button onclick='submitOrder(\${JSON.stringify(JSON.stringify(summary))})'>✅ ยืนยันการสั่งซื้อ</button>
  \`;
}

function submitOrder(summaryJson) {
  const summary = JSON.parse(summaryJson);
  const payload = {
    date: new Date().toISOString(),
    user: "ลูกค้าจาก LINE",
    order: summary
  };

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).then(res => res.json()).then(result => {
    document.getElementById("form-container").innerHTML = "<h3>✅ สั่งซื้อสำเร็จ ขอบคุณค่ะ</h3>";
  });
}

fetchVegetables();