# 铁塔换电支付系统 - 先享后付签约Demo

## 项目说明
本项目为纯前端H5 Demo，用于演示"先享后付"套餐的支付宝签约流程。

**特点：**
- 纯前端实现，无后端接口
- 模拟完整签约流程
- 页面间数据通过URL参数传递

## 签约流程
```
铁塔收银台 → 订单确认(信息) → 订单确认(告知书) → 人脸识别 → 支付宝签约 → 签约成功
```

## 页面说明
| 页面 | 文件 | 说明 |
|------|------|------|
| 导航菜单 | index.html | 页面导航与快捷入口 |
| 铁塔收银台 | pages/cashier.html | 套餐展示，购买入口 |
| 订单确认-信息 | pages/order-confirm.html | 订单详情确认 |
| 套餐协议 | pages/agreement.html | 协议阅读确认 |
| 人脸识别 | pages/alipay-face.html | 模拟人脸认证 |
| 支付宝签约 | pages/alipay-sign.html | 模拟支付宝签约 |
| 支付密码 | pages/alipay-password.html | 确认支付 |
| 签约成功 | pages/sign-success.html | 签约并支付完成 |
| 铁塔订单页 | pages/tower-order-success.html | 最终结果展示 |

## 运行方式
直接用浏览器打开 `src/index.html` 即可查看导航菜单。

如需从业务主流程开始体验，请打开 `src/pages/cashier.html`。

## 技术栈
- HTML5
- CSS3
- JavaScript (原生)
