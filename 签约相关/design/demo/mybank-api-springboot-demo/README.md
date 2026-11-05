# 网商保理接口 Demo（Spring Boot 4.1.1 / Java 25）

单模块 Spring Boot Demo，演示保理门店进件、门店准入查询、交易创建、交易取消、轧差退款、还款预算查询及提前结清、贷后信息上传，以及保理回调的验签和应答。Controller 接收入参，FactoringClient 通过支付宝 SDK 调用网商保理接口，CallbackHandler 标注业务处理位置。

本文描述当前线下联调 Demo 的实际行为。正式业务字段来源见[网商保理接口业务字段映射说明](../../网商保理接口业务字段映射说明.md)，其中的移动 VIP 参数组装尚未同步到本 Demo。

旧网商直付通签约、代扣、XML 回调及配套商户入驻代码已移除。保理门店进件 `factoring.supplier.create` 继续保留。支付宝行业先享签约、主动支付等能力不在当前 Demo 中实现。

## 技术与目录

| 组件 | 当前配置 |
| --- | --- |
| Java | Java 25，`maven.compiler.release=25` |
| Spring Boot | `4.1.1`，Web MVC、Validation、Actuator |
| Lombok | 版本由 Boot 管理 |
| 保理通信 | 支付宝 SDK `4.40.1014.ALL`，使用 `DefaultAlipayClient` |
| JSON / 工具 | fastjson2 `2.0.61`、Hutool core `5.8.47` |
| SDK 兼容依赖 | dom4j `2.1.4`，替代 SDK 传递依赖的旧版本 |
| 构建 | 本机 Maven；项目未包含 Maven Wrapper |

```text
mybank-api-springboot-demo/
├── pom.xml
├── http/
│   ├── requests.http
│   ├── requests/       # 七个本地保理接口的 JSON 入参
│   └── callbacks/      # 七类保理表单回调样例
└── src/main/
    ├── java/com/example/mybankdemo/
    │   ├── MybankDemoApplication.java
    │   ├── controller/ # 保理接口、回调和异常处理
    │   ├── client/     # 保理 SDK 调用
    │   ├── callback/   # 通知校验、处理位置与 ACK
    │   ├── config/     # 支付宝 SDK 与保理配置
    │   ├── dto/        # 保理入参与校验
    │   └── utils/      # 时间工具
    └── resources/application.yml
```

## 启动与调用

在本目录操作，将 `JAVA_HOME` 指向 JDK 25，并确保 `mvn` 可用：

```bash
mvn clean verify
java -jar target/mybank-api-demo.jar
```

本机启动的 Demo 调试接口默认使用 `http://127.0.0.1:8080`。网商通知使用下文的测试环境 HTTPS 地址。也可以在 IDEA 导入本目录的 `pom.xml`，运行 [MybankDemoApplication](src/main/java/com/example/mybankdemo/MybankDemoApplication.java)。`mvn clean verify` 会校验 HTTP 入参到 SDK 报文的映射及回调验签，不会访问真实网商网关。

健康检查使用 `GET /actuator/health`，正常时返回 HTTP 200，`status` 为 `UP`；当前版本默认还包含 `liveness`、`readiness` 健康分组：

```bash
curl -i http://127.0.0.1:8080/actuator/health
```

```json
{"groups":["liveness","readiness"],"status":"UP"}
```

Actuator 仅开放 `health` 端点，隐藏组件和详细信息。该检查反映应用自身的健康状态，不调用网商接口，也不代表网商业务接口可用。

应用日志同时输出到控制台和 `logs/mybank-api-demo.log`，目录自动创建。路径相对于启动工作目录，IDEA 的 Working directory 请设为本 demo 项目目录。日志按天滚动，单文件达到10MB也会滚动并压缩；归档保留30天，总容量上限1GB，达到容量上限时会提前清理旧归档。`logs/` 已加入 Git 忽略规则。`FactoringClient` 的请求、响应日志及异常日志会一同写入文件，`sdk.biz.info` 仍关闭；本次只增加日志落盘，日志内容沿用现有代码。

调用保理接口会直接访问配置的保理网关。[application.yml](src/main/resources/application.yml) 已填写网商提供的测试 AppId、ISV 和门店身份；网关、密钥及产品配置沿用现有值，`request_user_id` 按当前同账号约定复用 `isv-alipay-user-id`。门店业务资料和订单数据在请求中提供，调用前替换示例中的 `DEMO_*` 值。

```bash
# 保理门店进件
curl -sS http://127.0.0.1:8080/api/demo/mybank/factoring/supplier-create \
  -H 'Content-Type: application/json' --data-binary @http/requests/factoring-supplier-create.json

# 门店准入查询（交易创建前调用，以 white=true 判断准入）
curl -sS http://127.0.0.1:8080/api/demo/mybank/factoring/seller-admit-query \
  -H 'Content-Type: application/json' --data-binary @http/requests/factoring-seller-admit-query.json

# 保理交易创建
curl -sS http://127.0.0.1:8080/api/demo/mybank/factoring/create \
  -H 'Content-Type: application/json' --data-binary @http/requests/factoring-create.json
```

[requests.http](http/requests.http) 包含全部接口及回调样例，可以在 IDEA 中逐个调用。

## 接口一览

以下调用接口均为 POST，接收 `application/json`。

| HTTP 路径 | 对应渠道方法 |
| --- | --- |
| `/api/demo/mybank/factoring/supplier-create` | `mybank.credit.supplychain.factoring.supplier.create` |
| `/api/demo/mybank/factoring/seller-admit-query` | `mybank.credit.supplychain.factoring.selleradmit.query` |
| `/api/demo/mybank/factoring/create` | `mybank.credit.supplychain.trade.create` |
| `/api/demo/mybank/factoring/cancel` | `mybank.credit.supplychain.trade.cancel` |
| `/api/demo/mybank/factoring/netting-refund` | `mybank.credit.supplychain.trade.netting.refund` |
| `/api/demo/mybank/factoring/early-settle` | 依次调用 `mybank.credit.supplychain.trade.billrepaybudget.query`、`mybank.credit.supplychain.trade.pay` |
| `/api/demo/mybank/factoring/afterloan` | `mybank.credit.supplychain.factoring.afterloaninfo.save` |

HTTP 请求使用驼峰字段名，如 `tradeAmount`、`extData.purchaseContent`。Controller 使用 `@Valid` 校验入参，fastjson2 的 `@JSONField` 负责渠道字段映射。身份、产品码、渠道码和 PID 等配置值通过 Jackson 只读属性限制 HTTP 覆盖，发送前由 Client 填充。门店业务资料、银行卡资料及订单数据接受 HTTP 入参，Client 不再用配置覆盖。

调用链为 `FactoringController → FactoringClient → AlipayClient`。[MybankHttpConfiguration](src/main/java/com/example/mybankdemo/config/MybankHttpConfiguration.java) 注册共享的 `AlipayConfig`，配置网关、AppId、应用私钥、支付宝公钥、UTF-8、RSA2 和超时；同步调用与回调复用这份配置。

按网商最新线下联调要求，不再传 `x-webgw-sofa-group-name` Header 和 `ws_service_url` 参数。为跳过网商与行业先享侧的交互，`FactoringClient` 中固定添加 `skip` 前缀：HTTP 请求仍传原始 `alipayOrderNo`，创建时 `auth_no = "skip" + alipayOrderNo`、`out_order_no = ISVIpRoleId + "_skip" + alipayOrderNo`，取消时采用相同拼接规则。例如传 `1111`，生成 `auth_no=skip1111`、`out_order_no=226610000001158010102_skip1111`。这是本次线下 mock 规则，修改后重启 Demo 生效。

各方法创建对应 SDK Request，设置 `biz_content` 后执行 `alipayClient.execute(request)`，日志记录渠道原始响应 `response.getBody()`。同步成功须同时满足 `response.isSuccess()` 和 `code=10000`，避免仅按 `subCode` 判断而漏掉失败响应。成功后返回以下业务字段，不再返回渠道响应外层节点：

| 接口 | 成功响应 |
| --- | --- |
| 门店进件 | `{"supplierNo":"渠道供应商编号"}` |
| 门店准入查询 | `refused`、`refuseCode`、`refuseMsg`、`exsit`、`white`、`needSignAr`、`sellerMybankCardNoList`，取对应 SDK 响应字段 |
| 交易创建、取消、轧差退款 | `{"evSeqNo":"渠道受理流水号"}`，最终结果仍以各自异步通知为准 |
| 提前结清 | 查询成功且允许还款、支付受理后，一并返回预算 `outOrder`、`status`、`canRepay`、`totalAmt`、`exemptAmt`、`billAmtDetail`、`installBudgetDetailList` 及 `evSeqNo`；不可还款时抛异常，最终支付结果看 `tradePayEvent` |
| 贷后信息上传 | `{"success":true}`，渠道无额外业务返回字段 |

同步调用失败时抛出 `RuntimeException`，异常信息包含接口名称、`code`、`msg`，以及非 null 的 `subCode`、`subMsg`；由全局异常处理记录日志并返回 HTTP 500 和 `{"message":"接口调用异常"}`。

门店准入查询请求体为 `{}`，按门店支付宝登录账号查询，`list_type` 固定为 `NOT_ADMIT`。交易创建前先调用此查询，查询执行成功后以 `white="true"` 判断门店准入；渠道 `code=10000` 只表示查询成功，`exsit="true"` 只表示已提交加白申请。查询成功但 `white="false"` 时正常返回查询结果，不抛出调用失败异常。HTTP 响应采用驼峰字段名，`exsit` 沿用 SDK 拼写，各字段值保持渠道原值。

## 行业先享保理参数

| 参数 | 当前代码处理方式 |
| --- | --- |
| 门店进件 | 身份、账户户名和主体名称从配置读取；联系人、运营商、门店编号／名称、主体证件号、省市区及收款资料由 HTTP 请求提供；`rcvAccountType` 必填，只能传 `ALIPAY` 或 `OUT_BANK` |
| 门店准入查询 | HTTP 请求体为 `{}`；`buyer_alipay_id`、`seller_login_id`、`pd_code` 分别取 `isv-alipay-user-id`、`factoring-seller-login-id`、`factoring-sale-pd-code`；`list_type` 固定 `NOT_ADMIT` |
| 创建、取消的 trade_type | 固定 `FACTORING` |
| 创建、取消的 sale_pd_code / channel | Client 分别读取 `factoring-sale-pd-code`、`factoring-channel`，不接受 HTTP 覆盖；配置当前保留 `01025200002000024898` / `FQZBL` |
| buyer | 从 `isv-ip-id`、`isv-ip-role-id`、`isv-alipay-user-id`、`isv-alipay-login-id` 构造 |
| seller | 登录账号及 UID 分别从 `factoring-seller-login-id`、`factoring-seller-user-id` 读取；UID 未提供时仅传登录账号，两者同时提供时须属于同一门店账户，网商 `ipId` 不能代替支付宝 UID |
| ext_data.rcv_login_id | 复用 `factoring-seller-login-id`，与 `seller.site_login_id`、门店进件 `seller_login_id` 同值；HTTP 无需单独传入 |
| 创建 pay_account | 类型固定 `ALIPAY`；账号复用 `isv-alipay-user-id`，户名复用 `isv-company-name`，无需重复配置或传入 |
| 提前结清 pre_payment_account | 当前场景必传；类型固定 `CURRENT_SHARE`，账号、户名分别从 `factoring-pre-payment-account-no` / `factoring-pre-payment-account-name` 读取，不接受 HTTP 覆盖 |
| rcv_account | 创建请求不传，使用供应商进件账户 |
| request_id | 代码生成：ISV角色号_北京时间yyyyMMddHHmmss_8位随机数字 |
| 创建 HTTP 入参 alipayOrderNo | 传原始行业先享订单号或本次线下模拟值，调用方不要自行添加 `skip` 前缀 |
| 创建 out_order_no | 本次线下固定拼接 `ISVIpRoleId + "_skip" + alipayOrderNo`；渠道原文要求拼接后不超过50位，当前 Demo 未校验拼接后长度 |
| ext_data.auth_no | 本次线下自动使用 `"skip" + alipayOrderNo`，不接受 HTTP 单独覆盖 |
| ext_data.category / sense | 固定 `06` / `HANGYE_XIANXIANG`，不接受 HTTP 覆盖 |
| ext_data.request_user_id | 当前按 ISV 开放平台 PID 与支付宝 UID 同值处理，直接复用 `isv-alipay-user-id`，不接受 HTTP 覆盖 |
| 创建 ext_data.c_biz_order_no | HTTP 只传 `extData.cBizOrderNo`，取 `t_application_order.application_no`（ISV 申请单号），必填且最长64位 |
| 创建 ext_data.out_merch_order_no / page_order_no | Client 同值填充为 `extData.cBizOrderNo`，不接受 HTTP 覆盖；渠道报文仍发送这两个字段 |
| 贷后 ext_data.page_order_no | 仍由调用方传入 `extData.pageOrderNo`，取同一申请的 `application_no`，与创建时 `cBizOrderNo` 一致 |
| ext_data.branch_no | HTTP `extData.branchNo`，文档要求最长32位；按网商确认的映射传入，不自动等同于进件 `storeNo` |
| ext_data.freeze_alipay_id | HTTP `extData.freezeAlipayId`，为该订单实际签约用户的 `alipay_user_id` |
| trade_amount | HTTP `tradeAmount`，申请总本金＋总利息，单位元，不扣已付首期 |
| ext_data.freeze_amount | Client 自动取 `tradeAmount`，无需传 `extData.freezeAmount`；当前方案均取总本金＋总利息，不扣已付首期 |
| ext_data.freeze_terms | HTTP `extData.freezeTerms`，套餐总期数，包含已付首期；本次6期示例传 `6` |
| ext_data.freeze_date | HTTP `extData.freezeDate`，当前先取 `t_credit_agreement.signed_at`（渠道实际 `sign_time`），按上海时间格式化为 `yyyy-MM-dd HH:mm:ss` |
| expire_date | Client 自动生成：上海时间请求当月加 `extData.freezeTerms` 个月，再取配置 `factoring-repayment-day` 对应日期的零点；HTTP 无需传 `expireDate`，也不能覆盖，不映射骑手末期 `due_date` |
| terms_unit | 固定 `M`；业务30天周期与渠道期限的映射按联调口径填写 |
| 取消 HTTP 入参 alipayOrderNo | 传本次线下交易创建时使用的原始支付宝订单号，调用方不要自行添加 `skip`，无需传完整 `outOrderNo` |
| 取消 out_order_no | Client 按 `ISVIpRoleId + "_skip" + alipayOrderNo` 生成，不接受 HTTP 覆盖；须使用与创建时相同的 `isv-ip-role-id`，确保与原交易的 `out_order_no` 一致 |
| 贷后 HTTP 入参 alipayOrderNo | 传原交易创建时的原始支付宝订单号，不添加 `skip`，无需传完整 `outOrderNo` |
| 贷后 out_order_no | 网商已确认沿用交易创建的订单号；Client 按 `ISVIpRoleId + "_skip" + alipayOrderNo` 生成，不接受 HTTP 覆盖；使用与创建时相同的 ISV 配置 |
| 贷后 storeName / storeNo | HTTP 请求传入，复用同一门店的进件资料；`buyerAlipayId`、`sellerLoginId` 仍由配置填充 |
| 创建、贷后 extData | HTTP 传 JSON 对象，Client 转为渠道要求的 JSON 字符串；当前 Demo 两个请求均要求 extData 必填 |
| 贷后固定值 | `order_status=TRADE_SUCCESS`、`equipment_no=11111111`、`activate_state=ACTIVATED`；非实物设备号沿用当前约定 |
| 贷后 ext_data.period | 可选，由调用方提供1～50的字符串；首期快照传 `1` |

`category`、`sense`、`auth_no`、`request_user_id` 均由后端设置。`sale_pd_code`、`channel` 分别读取 `factoring-sale-pd-code`、`factoring-channel`；`request_user_id` 按当前同账号约定复用 `isv-alipay-user-id`，不单独配置，也不从 HTTP 请求取值。

配置保存接入信息、ISV／门店身份、产品码、渠道码和提前结清账户。`isv-company-name` 用于创建接口的 `pay_account.account_name`；`factoring-seller-company-name` 同时用于进件 `seller_bank_acc_name` 和 `store_subject_name`。提前结清账户通过 `factoring-pre-payment-account-*` 独立配置，当前使用云资金子户。门店业务资料和银行卡资料通过 HTTP 提供。供应商创建的 `buyer_ip_id`、`buyer_ip_role_id`、`buyer_site_user_id` 均取 ISV 配置；门店通过 `seller_login_id` 传入，门店的 `ipId`、`ipRoleId` 不用于替换买方字段。

创建接口由 Client 填充渠道顶层 `expire_date`，HTTP 不再接收 `expireDate`。行业先享扩展参数表没有 `ext_data.expire_date`，已移除旧场景的重复字段。`freezeAmount` 由 Client 自动取 `tradeAmount`，不接受 HTTP 单独覆盖。`freezeDate`、`freezeTerms` 由我们从测试订单组装，与该订单签约时间和总期数匹配；`freezeDate` 当前先取 `t_credit_agreement.signed_at`。Demo 不连接业务数据库，由调用方读取该值后传入。创建时只需传 `cBizOrderNo=application_no`，Client 自动将 `outMerchOrderNo`、`pageOrderNo` 设置为相同值。当前业务无独立充值单据，以申请单号标识整笔套餐办理；网商额外编号关联校验仍待确认。

`mybank.factoring-repayment-day` 保存网商告知的固定还款日，当前测试值为 `28`，调整后需重启 Demo。计算按接口文档的“当前时间＋期数＋还款日”，以本次请求的上海月份为基准；例如2026年10月请求6期，生成2027年4月28日零点。配置须为1～31且该日期在目标月份真实存在；不存在时中止调用，不自动改为月末。正式接入的计算基准及跨月边界仍按网商最终确认口径对齐。

交易创建通过 HTTP `extData.rcvName`、`rcvContactName`、`rcvContactPhone`、`busiProvince`、`busiCity`、`busiDistrict` 传入门店名称、联系人及省市区，调用方复用进件时的同一份资料；`busiDistrict` 对应进件 `storeCounty`。`busiLongitude`、`busiLatitude` 和 `branchNo` 也从请求传入。Demo 不保存进件资料，后续请求不会自动读取上一次进件内容。三个请求示例中的门店资料已保持一致。创建请求继续省略整个 `rcv_account`，使用门店进件时登记的收款账户。

`ext_data.rcv_login_id` 在文档参数定义中带删除线，请求示例仍包含该字段；本次联调先按示例传递门店支付宝登录账号，若网商明确不需要再移除。

门店进件必须在请求中显式填写 `rcvAccountType`，Demo 不再设置默认值，漏传、空白或非法值在本地拦截。当前示例传 `ALIPAY`；银行卡收款时改为 `OUT_BANK`，在同一个请求中补充以下字段，无需修改配置文件。门店联系人、运营商、门店编号／名称、主体证件号及省市区参见[进件请求示例](http/requests/factoring-supplier-create.json)。

| HTTP 请求字段 | 渠道字段 | 填写条件 |
| --- | --- | --- |
| `sellerBankName` | `seller_bank_name` | `OUT_BANK` 时填写门店收款银行名称 |
| `sellerBankAcc` | `seller_bank_acc` | `OUT_BANK` 时填写门店收款银行卡号，使用字符串保留前导零 |
| `sellerBankBranchUnionCode` | `seller_bank_branch_union_code` | `OUT_BANK` 且门店为企业支付宝时必填，使用字符串保留前导零 |

当前 demo 配置的是企业支付宝门店，Client 在 `OUT_BANK` 时校验上述三个字段均非空，`ALIPAY` 时清除并不发送银行卡字段。该联行号要求适用于当前企业门店；将来接入个人门店时需按主体类型调整条件。`seller_bank_acc_name` 复用配置中的门店公司名称，须与门店支付宝实名认证名称一致。两种收款方式均明确发送 `rcv_account_type`，避免省略时渠道默认采用 `OUT_BANK`；`buyer_site` 仍固定为 `ALIPAY`。

### 请求必填校验

| 接口／场景 | 校验规则 |
| --- | --- |
| 门店进件 | `sellerContactName`、`sellerContactPhone`、`rcvAccountType` 必填；手机号须为11位数字，收款类型只能为 `ALIPAY`、`OUT_BANK` |
| 门店进件资料 | 当前 Demo 统一要求 `storeNo`、`storeName`、`storeSubjectCertNo`、`storeProvince`、`storeCity`、`storeCounty` 必填，不依赖 `operatorName` 是否有值；`storeSubjectName` 由配置填充 |
| 企业门店银行卡收款 | `rcvAccountType=OUT_BANK` 时，`sellerBankName`、`sellerBankAcc`、`sellerBankBranchUnionCode` 必填 |
| 交易创建 | `extData.rcvName`、`rcvContactName`、`rcvContactPhone`、`busiProvince`、`busiCity`、`busiDistrict`、`busiLongitude`、`busiLatitude`、`branchNo` 必填；原有订单、金额、期数等必填校验继续保留 |
| 可选字段 | 进件 `operatorName`（申请加白时提供）、贷后 `storeName`／`storeNo` 保持可选，仅按文档限制长度；贷后原有业务快照必填约定继续保留 |

固定必填字段在 DTO 中通过 `@NotBlank` 等注解检查，银行卡条件在 Client 发出 SDK 请求前检查。配置填充或自动生成的身份、产品、订单关联字段不要求调用方重复填写。参数校验失败返回 HTTP 400；DTO 校验响应的 `errors` 给出具体字段路径，例如 `extData.branchNo`，银行卡资料缺失时响应的 `message` 为“银行卡数据未填写”。

请求样例按网商要求改为6个月分期套餐：总本金1460元＋总利息52元＝1512元，共6期，每期252元。沿用项目每期30天、首期当天到期的规则，前五期本金243.33元、利息8.67元，末期本金243.35元、利息8.65元，确保分别合计1460元和52元。

| 期次 | 骑手应缴日期 | 本金（元） | 利息（元） | 合计（元） |
| --- | --- | ---: | ---: | ---: |
| 1 | 2026-10-16 | 243.33 | 8.67 | 252.00 |
| 2 | 2026-11-15 | 243.33 | 8.67 | 252.00 |
| 3 | 2026-12-15 | 243.33 | 8.67 | 252.00 |
| 4 | 2027-01-14 | 243.33 | 8.67 | 252.00 |
| 5 | 2027-02-13 | 243.33 | 8.67 | 252.00 |
| 6 | 2027-03-15 | 243.35 | 8.65 | 252.00 |
| 合计 | — | 1460.00 | 52.00 | 1512.00 |

上表是骑手侧账单，末期应缴日期为 `2027-03-15`。网商已确认：`expireDate` 表示 ISV 在网商侧保理账款最后一期到期还款日，还款日由网商固定配置；本测试账号为每月28号，2026年10月发起本次6期交易时，Demo 自动生成 `2027-04-28 00:00:00`。正式环境的还款日由网商业务人员配置后告知，在本地配置中保持一致；不把测试值28号作为所有账号的通用规则。

### 轧差退款

按 [网商保理接口文档](<../../../docs/铁塔换电保理提供给ISV接口文档-20261026-V1 .docx>) 的轧差退款接口及结果消息实现，复用现有支付宝 SDK，无需新增依赖。

门店放款后调用 `POST /api/demo/mybank/factoring/netting-refund`，请求示例见 [factoring-netting-refund.json](http/requests/factoring-netting-refund.json)：

```json
{
  "alipayOrderNo": "20261020095053954852993554042986",
  "refundAmount": "1512.00"
}
```

- `alipayOrderNo` 使用原交易创建时的值。与取消接口相同，当前线下后端拼接 `ISVIpRoleId + "_skip" + alipayOrderNo`，确保渠道 `out_order_no` 与原账款一致。调用方不要自行添加 `skip`。
- `refundAmount` 为账款退款金额，单位元、最多两位小数。网商已确认轧差退款只支持全款，因此本次传原账款总金额1512.00元，不扣除首期252.00元。金额由调用方传入，Client 原样发送；Demo 不查询原账款及退款记录，调用方需确保与原账款全额一致。该全额规则针对网商保理账款，不直接决定骑手首期支付是否退款。
- `request_id`、`out_refund_no` 分别由后端按 `ISVIpRoleId_yyyyMMddHHmmss_8位随机数字` 生成；`buyer`、产品码、渠道码取现有配置，`trade_type` 固定为 `FACTORING`，上述字段均不接受 HTTP 覆盖。请求和退款单号可从请求日志取得。
- 文档的 `out_order_no` 长度说明仍是旧预授权场景的50位；当前沿用已经联调的行业先享 `skip` 拼接规则，未额外按50位拦截，也不会截断原订单号。

同步成功返回 `evSeqNo`，只表示退款请求已受理。最终结果通过同一保理回调入口的 `nettingRefundEvent` 通知：`outOrderNo` 对应原账款，`outRefundNo` 对应本次退款，`amount` 单位分，`success` 为 `TRUE` 或 `FALSE`。处理示例记录成功或失败日志，失败结果正常 ACK；验签失败或无法识别的状态按现有异常路径返回失败 ACK。

文档另列出配套的 `settleResultEvent` 轧差趸付清算通知，Demo 一并接收并独立记录。该通知的金额字段为 `factoringAmt`（分），文档没有定义 `outOrderNo`、`outRefundNo`，不以它代替单笔退款结果。这两个事件均复用现有应用校验、RSA2 验签、`dataOrgId` 校验和 ACK。

每次手动调用会生成新的请求号和退款单号。已受理但未收到通知，或超时结果未知时，不要重复点击发起新退款；按文档等待通知或联系网商核实。正式业务应持久化原请求及退款单，按明确的重试规则复用原编号。该接口是保理账款轧差退款，不等同于骑手支付的原路退款。

### 还款预算查询与提前结清

本地 `POST /api/demo/mybank/factoring/early-settle` 将两次 SDK 调用串联，HTTP 请求只需传原交易的原始 `alipayOrderNo`。示例见 [factoring-early-settle.json](http/requests/factoring-early-settle.json)，当前与创建请求使用同一订单号。实际调用前确认该单已放款、未结清且未轧差退款；测试不同资金处理流程时按实际订单状态选择测试单。

**调用这个接口会在预算允许时直接发起还款。** Demo 没有数据库，无法本地检查放款及账款状态，调用前按文档确保交易创建成功并收到成功的放款结果。

1. 按创建规则生成 `out_order_no = ISVIpRoleId + "_skip" + alipayOrderNo`，用配置中的买方身份、产品码及渠道查询预算。
2. 查询成功且顶层 `can_repay=true` 才继续；`false` 或缺少标识时抛出 `IllegalStateException("当前不可提前还款")`，不调用支付。不使用分期明细中的 `can_repay` 代替整笔账款标识。按当前异常处理，HTTP 返回 500 及 `{"message":"接口调用异常"}`，具体原因记录在服务端日志，不返回预算数据。
3. 核对预算返回的 `out_order` 与原订单一致，取 `total_amt`（元）作为 `pay_amount`。不使用套餐金额代替预算，也不自行减去首期、骑手已缴金额或 `exempt_amt`。金额必须为正数且能精确表示到分，不四舍五入调整渠道金额。
4. 后端生成 `request_id`，固定 `trade_type=FACTORING`。`ext_data` 固定包含 `payableRepayType="preRepay"` 和 `not_need_decide_other_pay_account="Y"`，序列化为 JSON 字符串后调用 `trade.pay`。这些字段及支付金额不接受 HTTP 覆盖。
5. 同步返回的 `evSeqNo` 仅表示支付受理，预算中的 `status` 是支付前的账单状态；`tradePayEvent` 表示提前还款支付结果，账款最终结清以 `settlePayablesEvent` 为准。

网商最新确认：铁塔换电提前结清必须在 `ext_data` 中传 `not_need_decide_other_pay_account="Y"`，后续缺失或非 `Y` 会被阻断；Demo 已固定发送该标记。

`pre_payment_account` 在当前场景必传。当前 Demo 固定使用云资金子户，DTO 中 `accountType` 定义为 `final "CURRENT_SHARE"`，账号和户名从配置读取：

```yaml
mybank:
  factoring-pre-payment-account-no: "99038100000000000811"
  factoring-pre-payment-account-name: "召缚丝的公司"
```

HTTP 请求仍只传 `alipayOrderNo`。实际扣款结果通过回调中的 `accountNo`、`accountType` 核对。

当前 SDK 已包含这两个 API 的 Request / Response，无需新增 SDK 依赖。文档的预算响应示例遗漏了参数表中的 `can_repay`、`out_order`，本 Demo 按参数表及 SDK 字段读取；缺少明确还款许可或订单关联时不会发起支付。两次调用的原始请求、响应均写入日志。

该接口用于 ISV 向网商整笔提前还款，不是骑手支付接口，也不是轧差退款。每次调用会在支付前生成新的请求号；已受理未收到通知、支付超时或结果未知时，不要重新点击发起新还款，应等待回调或联系网商核实。Demo 不自动重试；正式业务需保存结清申请、原 `request_id`、预算金额和支付结果，重试按渠道幂等规则处理。若将来需要先展示预算金额让操作人确认，应拆成查询和确认支付两个本地接口。

`tradePayEvent` 复用现有回调入口、应用校验、RSA2 验签、ISV 校验和 ACK。按 `outOrderNo` / `requestId` 关联支付申请，`amount` 为实际还款金额（分）。成功或失败通知都正常 ACK，仅记录支付结果，不能据此将账款直接置为已结清。回调模板中的金额是示例值，联调时应与实际预算及支付金额对应。

`settlePayablesEvent` 是账款结清通知，文档也用于到期结清场景。机构字段为 `dateOrgId`，文档未定义 `success` 字段，因此独立处理，不调用通用 `success()` 判断。按 `outOrderNo` / `tradeNo` 关联账款，`clearDate` 为结清时间戳（毫秒）；`requestId` 是该通知的幂等流水号，不强制等于主动支付请求号。若带有非空 `errorCode` 或 `errorMsg`，Demo 记录异常通知后正常 ACK，不记录结清成功。正式业务应分别保存支付结果和结清事实，幂等处理重复、乱序通知。Demo 仅打印日志，没有实现账款状态落库。

### 贷后上传快照

网商已确认：每期还款均需调用本接口，上传对应期次的还款快照，`out_order_no` 始终沿用交易创建值。

首期已付快照在履约初始化事务提交后上传，不等待 `loanResultEvent`。`preauthFreezeTime`、`totalAmount`、`term`、`activateTime`、`extData` 在渠道文档中为可选，当前 Demo DTO 要求必填。按项目约定，前三者分别复用创建时的 `freezeDate`、`tradeAmount`、`freezeTerms`，不扣除已付首期，具体示例值见 [factoring-afterloan.json](http/requests/factoring-afterloan.json)。本次按网商要求使用6期，包含首期。订单关联只需传必填的 `alipayOrderNo`，当前线下 Client 按 `ISVIpRoleId + "_skip" + alipayOrderNo` 生成与创建时一致的 `out_order_no`。`alipayOrderNo` 仅供本地组装，不发送给网商；HTTP 传入的 `outOrderNo` 会被忽略。

| HTTP extData 字段 | 渠道字段及约定 |
| --- | --- |
| pageOrderNo | `page_order_no`，当前先取 `t_application_order.application_no`，与创建时保持一致 |
| dataTime | `data_time`，本次快照生成时间 `yyyy-MM-dd HH:mm:ss`，重试沿用原值 |
| period | `period`，1～50的字符串；首期快照为 `1` |
| capital / interest | 当期应还本金、利息，整数分字符串；已付也不改成0 |
| repayType | `repay_type`，网商已确认：`0` 正常还款、`1` 提前还款、`2` 退货 |
| repayStatus | `repay_status`，网商已确认：`0` 还款成功、`1` 还款中、`2` 还款失败 |
| dueDate | `due_date`，当期应还日期 `yyyyMMdd` |
| orderBal | `order_bal`，同次快照的剩余本金，整数分字符串 |
| payDate | `pay_date`，实际支付日期 `yyyyMMdd`；未支付或无可信时间时省略 |

这些扩展字段在渠道文档中为可选，当前 Demo DTO 已将其中多项设为必填。当前请求示例传 `repayType="0"`、`repayStatus="0"`，表示正常还款、还款成功，Client 原样映射所提供的值。期次、金额及还款字段目前是“C端首期已付快照”的建议示例，须确认其业务口径，不能据此表示 ISV 已向网商完成保理还款。示例的首期本金为24333分、利息867分、首期支付后剩余本金121667分。

Demo 使用一套 ISV／门店身份配置，业务资料由各次请求提供，不持久化请求号或业务记录。正式接入时应保存原请求号，超时重试复用原请求，避免每次生成新 `request_id`。

## 回调

将测试应用的「应用网关」登记为 `https://openapidev.lexue.com.cn/callbacks/v1/mybank/factoring`。该 HTTPS 入口接收 POST 表单，支持 `tradeCreateEvent`、`loanResultEvent`、`tradeCancelEvent`、`tradePayEvent`、`settlePayablesEvent`、`nettingRefundEvent`、`settleResultEvent`。本地 HTTP 样例中七类通知统一使用该测试域名。

当前 Controller 按 `application/x-www-form-urlencoded` 接收 `Map<String, String>`。这是 Demo 的接收方式；现有保理文档未明确 HTTP Content-Type，联调以网商实际投递格式为准。

处理顺序为：应用及签名协议校验 → `AlipaySignature.rsaCheckV1()` 验签 → 解析 `dataobject` → 校验机构、请求号和事件 → 处理 → ACK。成功返回 HTTP 200 和 `{"respCode":"0000","respInfo":"接收消息成功"}`；异常返回 HTTP 400 和 `respCode=1609`。

`http/callbacks` 已同步行业先享订单号、金额和时间，文件为**待签名模板**，`sign=REPLACE_WITH_VALID_RSA2_SIGNATURE`，直接发送会验签失败。替换 `app_id`、机构、请求号及订单号后，对 URL 解码后的参数排除 `sign`、`sign_type`，按参数名排序组成 `k=v&k=v`，用测试私钥进行 RSA2（SHA256withRSA）签名，再 Base64、URL 编码填入 `sign`。`dataobject` 使用同一份原始字符串参与签名，不重新格式化。自签排查只在单独的本地 Demo 实例使用配套测试公钥，并将本地调试请求指向该实例；共享测试环境使用网商线下公钥；修改模板内容后必须重新签名。

回调处理目前只有日志和注释，没有落库或幂等实现。注释已按[详细设计](../../正向签约与主动缴费详细设计.md)更新：交易创建成功推进申请完成、履约和账单初始化，提交后上传贷后；放款成功仅补写网商编号，未报告成功时留存通知，不触发退款取消。

## 异常与边界

[ApiExceptionHandler](src/main/java/com/example/mybankdemo/controller/ApiExceptionHandler.java) 作用于 `FactoringController`：DTO 校验失败返回 HTTP 400、`{"message":"请求参数校验失败","errors":{"字段路径":"原因"}}`；参数条件校验抛出的 `IllegalArgumentException` 返回 HTTP 400 和具体 `message`。其他异常记录堆栈并返回 HTTP 500、`{"message":"接口调用异常"}`；回调 Controller 单独应答。HTTP 超时或验签异常不能直接认定为银行交易失败。

Demo 不实现骑手侧主动支付、原路退款、自动补偿或业务持久化；保理提前结清演示预算查询、支付调用和结果回调。启动不依赖数据库、Redis 或 RocketMQ。

参考资料：[详细设计](../../正向签约与主动缴费详细设计.md)、[保理接口文档](<../../../docs/铁塔换电保理提供给ISV接口文档-20261026-V1 .docx>)。
