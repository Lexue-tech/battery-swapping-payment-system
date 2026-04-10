const ORDER_KEY = "battery_order_demo_v1";

function saveOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function readOrder() {
  const value = localStorage.getItem(ORDER_KEY);
  if (!value) {
    return {
      packageName: "先享后付特价199元30天",
      amount: 199,
      originalAmount: 300,
      period: "30天",
      city: "石家庄市",
      orderNo: `2026${Date.now()}`.slice(0, 16),
      installment: "36月",
      stageInfo: "首期24.15元，剩余35期3.91元"
    };
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function updateAmountText(selector, value) {
  const el = document.querySelector(selector);
  if (el) {
    el.textContent = value;
  }
}

function go(url) {
  window.location.href = url;
}

function toFixedAmount(num) {
  return Number(num).toFixed(2);
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2200);
}
