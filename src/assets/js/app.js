const ORDER_KEY = "battery_order_demo_v1";

function saveOrder(order) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function readOrder() {
  const value = localStorage.getItem(ORDER_KEY);
  if (!value) {
    return {
      packageName: "900元季卡",
      amount: 756,
      originalAmount: 900,
      period: "90天",
      city: "济南市",
      orderNo: `2026${Date.now()}`.slice(0, 16),
      installment: "3个月",
      stageInfo: "每期252元"
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
