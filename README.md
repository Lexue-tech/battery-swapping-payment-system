# 铁塔换电支付系统静态演示

基于 HTML、CSS 和原生 JavaScript 的静态演示，展示铁塔入口、小程序订单办理和账单缴费流程，以及模拟的支付宝支付页面。无需后端或构建步骤。

## 本地预览

直接打开 `src/index.html`，或运行 `./deploy/start_local.sh` 后访问终端显示的地址。

## 演示流程

- 订单：铁塔收银台 → 订单确认 → 阅读并同意分期换电业务服务协议 → 模拟支付宝认证、签约和支付 → 办理结果 → 返回铁塔。
- 账单：从导航进入账单缴费 → 模拟支付宝支付 → 缴费结果。
- 导航页可以直接预览办理中、办理取消、支付处理中、账单关闭及暂不可缴费状态。

演示使用本地示例数据，支付和状态结果均为模拟；浏览器页面用于展示小程序的内容和布局。

## 文件

- `src/pages/order-confirm.html`：订单确认及协议弹层。
- `src/pages/order-result.html`：订单办理结果。
- `src/pages/bill-detail.html`、`src/pages/bill-result.html`：账单缴费及结果。
- `src/assets/js/mini-demo.js`：页面数据和交互。
- `src/assets/js/service-agreement.js`：与小程序一致的协议内容。
- `src/assets/css/mini-demo.css`：小程序页面样式。
