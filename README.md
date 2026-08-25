# 🚀 WebSec 交互式可视化学习平台 (Cybersecurity Training Study Guide)

> 专为 **《Web 安全工程师特训班第 23 期》** 打造的现代化、工业级、交互式 Web 安全攻防实训平台。  
> 汇聚 62 门核心课程深度讲义、三大拟真攻防武器工作台、CTF 夺旗在线判题系统、白盒代码审计工坊与 80+ 条实战武器库速查表！

---

## 🌟 平台核心功能特性

### 1. 📚 课程全景知识图谱 (62 门课时深度覆盖)
* **四大进阶阶段体系**：
  * **Stage 1 (L17 - L25)**：信息收集、CDN 穿透、业务逻辑漏洞、密码找回缺陷与云主机元数据安全
  * **Stage 2 (L26 - L37)**：OWASP Top 10 核心漏洞深度攻防（SQL 注入全类型、文件上传绕过、XSS 上下文逃逸、Webshell 免杀）
  * **Stage 3 (L38 - L46)**：服务端进阶漏洞、高危协议与主流框架（SSRF、Gopher 打 Redis、XXE 实体注入、RCE 字符绕过、Tomcat Ghostcat、Log4j2 JNDI 注入）
  * **Stage 4 (L47 - L62)**：AI 赋能安全、白盒代码审计 (Source-to-Sink)、PHP 反序列化 POP 链、Linux 应急响应与 WAF 深度绕过
* **深度讲义与实战手册**：
  * 深度 Markdown 核心讲义（漏洞成因、标准攻击利用 5 步流程、代码级修复与 WAF 规则）；
  * 实操命令手册、避坑技巧、高频考点 Checklist 与本地 PDF 课件映射索引。

---

### 2. 🚩 拟真武器级打靶工作台与 CTF 夺旗系统
* **三大工业级拟真攻防武器**：
  * 🛰️ **Burp Suite 抓包与 Repeater 重放器**：模拟 HTTP/HTTPS 数据包拦截、请求头与请求体篡改、分块传输 (Chunked)、万能验证码爆破与实时 Response 响应解析；
  * ⚡ **Kali Linux 交互终端**：内置真实的命令执行解析环境，支持 `nmap` 全端口指纹扫描、`sqlmap` 自动化脱库、`dirsearch` 目录扫描、`gopherus` 载荷生成、`frida` 动态 Hook 以及 `cat flag.txt`；
  * 🔪 **中国蚁剑 / 冰蝎 (Behinder) Webshell 客户端**：模拟 AES-128 动态握手加密连接、服务器指纹检测、虚拟文件管理器浏览与提权命令执行。
* **62 关专属作战任务简报与 Flag 判题**：
  * 每关配备【🏢 目标背景】、【🎯 核心突破任务】、【🛠️ 推荐作战武器】与【🚩 Flag 隐藏线索】；
  * 内置实时 Flag 判题验证引擎，输入 Flag 即可完成自动判题、获取 100~500 战功积分，并晋升黑客段位（青铜 ➔ 白银 ➔ 黄金 ➔ 钻石 ➔ 王者大师）！
* **💡 点击查看实操通关详细操作步骤 (Walkthrough Guide)**：
  * 每道题目均提供点击即开的保姆级 4 步攻防推演指南（资产探测 ➔ 武器利用 ➔ Flag 提取 ➔ 提交判题），所有攻击命令均支持一键复制！

---

### 3. 🔍 白盒代码审计与安全修复工坊 (Code Audit Studio)
* **缺陷源码 vs 官方修复代码左右分栏对比**；
* 详细解析数据流污点分析 (Source-to-Sink)、攻击者利用 Payload 以及防御核心准则。

---

### 4. 🧰 渗透武器库速查表 (Arsenal & Cheatsheets)
涵盖 8 大实战攻防专题、80+ 条高频工业级 Payload 与原理解析，支持毫秒级关键词实时检索与一键复制：
1. 💉 **SQL 注入全集 (14 条)**：闭合截断、ORDER BY、GROUP_CONCAT、UpdateXML 报错、GBK 宽字节、二分法盲注、DNSLog 外带、MySQL 内联注释绕过；
2. 📦 **文件上传 & 绕过 (10 条)**：MIME 伪造、.htaccess 劫持、.user.ini 挂载、Windows 点空格、00 截断、一句话图片马合成、异或免杀；
3. ⚡ **命令执行 & 字符绕过 (10 条)**：连接符、${IFS} 空格替代、引号与变量拼接、Base64 管道、通配符；
4. 🌐 **SSRF & 伪协议打击 (8 条)**：file:// 读文件、dict:// 探端口、gopher:// 打 Redis、127.0.0.1 进制转换、169.254 云元数据；
5. 🧬 **XXE 外部实体注入 (5 条)**：SYSTEM 读取、php://filter Base64 封装、Blind XXE 远程 DTD、expect:// 命令执行；
6. 🎭 **XSS 逃逸 & 免杀 (7 条)**：标签注入、属性双引号闭合、JS 变量闭合、javascript: 伪协议、HTML5 新特性；
7. 🛡️ **应急响应 & 溯源排查 (8 条)**：UID=0 特权后门、ESTABLISHED 外联排查、进程物理路径定位、Crontab 定时任务、Webshell 时间特征排查；
8. 🐚 **反弹 Shell 一键生成器 (11 种)**：Bash -i、Python3 PTY、NC Mkfifo、PHP、PowerShell、Java、Socat、Perl、Ruby 等。

---

### 5. ⚙️ 编解码与渗透工具箱 (Tools Hub)
* 支持 URL 编码、二次 URL 编码、Base64 编解码、Hex 十六进制转换、空格转注释 (`/**/`)、随机大小写混淆；
* 内置 Gopher 协议数据包一键生成器（自动生成 Gopher 打 Redis 写入定时任务数据流）。

---

### 6. 🏆 阶段通关自测考核 (Stage Quizzes)
* 对应课程中的 4 个阶段考核点，内置场景化试题、即时判分与深度解析。

---

## 💻 快速启动与本地运行

### 方式一：直接双击打开
直接双击打开项目根目录下的 `index.html` 即可在浏览器中开启全功能纯前端运行体验。

### 方式二：一键运行本地服务 (推荐)
双击运行 `start_server.bat`，脚本将自动在 `http://127.0.0.1:8000` 启动本地 Web 服务器并自动唤起默认浏览器。

---

## 📂 项目结构说明

```text
Cybersecurity_Training_Study_Guide/
├── index.html            # 平台单页面主应用 (Vue 3 + TailwindCSS + 玻璃拟态 UI)
├── start_server.bat      # Windows 本地快速启动脚本 (Python HTTP Server)
├── README.md             # 项目详细说明文档
├── css/
│   └── style.css         # 霓虹暗黑主题与玻璃拟态全局样式
└── js/
    ├── app.js            # 核心响应式状态机、搜索过滤、Flag 判题与武器交互
    ├── data.js           # 62 门课程深度讲义、作战任务简报、Flag 与渗透武器库数据字典
    └── simulators.js     # Burp 抓包、Kali 终端与冰蝎客户端拟真执行引擎
```

---

## 🤝 开源与致谢
* 感谢《Web 安全工程师特训班第 23 期》全体讲师与学员！
* 本项目仅供网络安全技术交流与合法授权的学习测试使用，请严格遵守《网络安全法》与白帽黑客道德准则。
