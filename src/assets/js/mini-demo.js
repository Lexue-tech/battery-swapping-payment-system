(() => {
  const order = readOrder();
  const amount = Number(order.amount ?? 756);
  const fee = Number(order.serviceFee ?? 26);
  const principal = Number(order.productAmount ?? amount - fee);
  const periodCount = Number.parseInt(order.installment, 10) || 3;
  const first = Number(order.firstPaymentAmount ?? amount / periodCount);
  const values = {
    orderNo: order.orderNo || '2026178348451789',
    packageName: order.packageName || '900元季卡',
    total: toFixedAmount(amount),
    principal: `${toFixedAmount(principal)}元`,
    fee: `${toFixedAmount(fee)}元`,
    period: `${periodCount}期`,
    periodAmount: `每期应付${toFixedAmount(first)}元`,
    first: toFixedAmount(first),
  };
  document.querySelectorAll('[data-order]').forEach((el) => { el.textContent = values[el.dataset.order]; });

  const checkbox = document.getElementById('agree-service');
  const orderButton = document.getElementById('order-pay');
  const dialog = document.getElementById('agreement-dialog');
  if (checkbox && orderButton && dialog) {
    document.getElementById('service-agreement').innerHTML = serviceAgreementHtml;
    checkbox.addEventListener('change', () => { orderButton.disabled = !checkbox.checked; });
    document.getElementById('open-agreement').addEventListener('click', (event) => {
      event.preventDefault();
      dialog.hidden = false;
      document.body.classList.add('mini-dialog-open');
      document.getElementById('close-agreement').focus();
    });
    const close = () => { dialog.hidden = true; document.body.classList.remove('mini-dialog-open'); document.getElementById('open-agreement').focus(); };
    document.getElementById('close-agreement').addEventListener('click', close);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) close(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !dialog.hidden) close(); });
    orderButton.addEventListener('click', () => go('./alipay-periodic.html'));
  }
  const title = document.getElementById('result-title');
  if (!title) return;
  const isBill = false;
  const state = new URLSearchParams(location.search).get('state') || 'completed';
  const processing = state === 'processing';
  const completed = state === 'completed';
  const icon = document.getElementById('result-icon');
  const description = document.getElementById('result-description');
  const details = document.getElementById('result-details');
  const back = document.getElementById('result-back');
  if (processing) {
    document.querySelector('.mini-page').classList.add('mini-processing');
    icon.textContent = '◷'; icon.classList.add('is-waiting');
    title.textContent = isBill ? '支付处理中' : '办理中';
    description.textContent = '结果确认中，请稍候，页面将自动更新';
    const hint = document.createElement('p'); hint.className = 'mini-result-hint'; hint.textContent = '如长时间未完成，请联系客服处理。';
    description.after(hint); details.remove(); back.remove();
    return;
  }
  icon.textContent = completed ? '✓' : '!'; icon.classList.toggle('is-warning', !completed);
  title.textContent = isBill ? (completed ? '支付成功' : '账单已关闭') : (completed ? '办理成功' : '办理已取消');
  description.textContent = isBill ? (completed ? '本期费用已缴清' : '账单已关闭，请返回铁塔 APP 查看') : (completed ? '首期费用已支付，换电服务已开通' : '未完成办理，请返回重新办理.');
  const rows = isBill
    ? [['订单编号', values.orderNo], ['商品名称', values.packageName], ['支付金额', `${values.first}元`], ['缴费期数', '第2/3期'], ...(completed ? [['支付时间', '2026-11-15 10:30:00']] : [])]
    : [['订单编号', values.orderNo], ['商品名称', values.packageName], ['合约总金额', `${values.total}元`], ['首期支付金额', `${values.first}元`], ['订单期数', values.period], ...(completed ? [['签约完成时间', '2026-11-15 10:30:00']] : [])];
  rows.forEach(([label, value]) => {
    const row = document.createElement('div'); row.className = 'mini-row';
    const name = document.createElement('span'); name.textContent = label;
    const content = document.createElement('strong'); content.textContent = value;
    row.append(name, content); details.append(row);
  });
  back.addEventListener('click', () => go('../index.html'));
})();
