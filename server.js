/**
 * WebSec Learning Hub - 全功能本地靶场与真实靶机控制引擎
 * 端口: 8888 (http://127.0.0.1:8888)
 * 依赖: 原生 Node.js (无需任何外部第三方 npm 包)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const crypto = require('crypto');

const PORT = process.env.PORT || 8888;
const HOST = '127.0.0.1';

// ----------------------------------------------------------------------------
// 靶机实例状态管理器 (In-Memory Target Instance Store)
// ----------------------------------------------------------------------------
const activeTargets = {}; // { 'L26': { status: 'online', startTime: 123456, remaining: 7200, flag: '...' } }
const targetUploads = {}; // 虚拟上传文件沙箱
const targetComments = {}; // 虚拟留言板沙箱
const targetBalances = {}; // 虚拟账户资金/库存沙箱

// 默认倒计时: 2小时 (7200 秒)
const DEFAULT_LIFETIME = 7200;

// 定时器递减剩余时间
setInterval(() => {
  const now = Date.now();
  Object.keys(activeTargets).forEach(code => {
    const t = activeTargets[code];
    if (t.status === 'online') {
      const elapsed = Math.floor((now - t.startTime) / 1000);
      t.remaining = Math.max(0, t.totalLifetime - elapsed);
      if (t.remaining <= 0) {
        t.status = 'offline';
      }
    }
  });
}, 1000);

// MIME 类型映射表
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf'
};

// ----------------------------------------------------------------------------
// 靶机 UI 通用页面模板生成器
// ----------------------------------------------------------------------------
function renderTargetLayout(code, title, category, description, bodyHtml) {
  const target = activeTargets[code.toUpperCase()];
  const isOnline = target && target.status === 'online';

  if (!isOnline) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${code} 靶机 - 靶机未开启</title>
  <style>
    body { background: #0a0f1d; color: #94a3b8; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: #0f172a; border: 1px solid #334155; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #f43f5e; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }
    .btn { display: inline-block; background: #0284c7; color: #fff; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: bold; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🛑 靶机当前处于离线状态</h1>
    <p>靶机 <strong>${code}</strong> 尚未开启或已超时关闭。<br>请返回主平台并在“武器打靶夺旗”界面点击【🚀 启动靶机】后再访问！</p>
    <a href="/index.html" class="btn">返回 WebSec 学习主平台 ➔</a>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[${code}] 真实靶场 - ${title}</title>
  <style>
    :root { --primary: #00f2fe; --bg: #0a0f1d; --card: #0f172a; --border: #1e293b; --text: #f8fafc; }
    * { box-sizing: border-box; }
    body { background-color: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 1.5rem; min-height: 100vh; }
    .container { max-width: 960px; margin: 0 auto; }
    .target-header { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 1px solid #38bdf8; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .target-badge { font-family: monospace; font-size: 0.85rem; font-weight: bold; background: #082f49; color: #38bdf8; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #0284c7; }
    .status-badge { font-family: monospace; font-size: 0.8rem; font-weight: bold; background: #064e3b; color: #34d399; padding: 0.25rem 0.6rem; border-radius: 20px; border: 1px solid #059669; display: flex; align-items: center; gap: 6px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
    .target-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .desc-box { background: #1e293b; border-left: 4px solid #00f2fe; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
    input[type="text"], input[type="password"], input[type="number"], select, textarea { width: 100%; background: #030712; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 0.9rem; padding: 0.6rem 0.8rem; border-radius: 8px; margin-top: 0.4rem; margin-bottom: 1rem; outline: none; }
    input:focus, textarea:focus { border-color: #00f2fe; box-shadow: 0 0 10px rgba(0,242,254,0.3); }
    .btn-submit { background: linear-gradient(90deg, #0284c7, #2563eb); color: #fff; font-weight: bold; font-size: 0.85rem; padding: 0.6rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .btn-submit:hover { opacity: 0.9; transform: translateY(-1px); }
    .result-box { background: #030712; border: 1px solid #1e293b; border-radius: 8px; padding: 1rem; margin-top: 1rem; font-family: monospace; font-size: 0.85rem; line-height: 1.6; color: #e2e8f0; word-break: break-all; }
    .flag-banner { background: linear-gradient(90deg, #4c0519, #881337); border: 1px solid #f43f5e; color: #ffe4e6; padding: 1rem; border-radius: 8px; margin-top: 1rem; font-family: monospace; font-weight: bold; font-size: 1rem; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
    th { background: #1e293b; color: #38bdf8; padding: 0.6rem; text-align: left; border: 1px solid #334155; }
    td { padding: 0.6rem; border: 1px solid #1e293b; color: #cbd5e1; }
    tr:nth-child(even) { background: #0b1120; }
  </style>
</head>
<body>
  <div class="container">
    <div class="target-header">
      <div>
        <span class="target-badge">${code} 真实实战靶机</span>
        <h2 style="margin: 0.4rem 0 0 0; font-size: 1.25rem; color: #f8fafc;">${title}</h2>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <span class="status-badge"><span class="status-dot"></span> 靶机运行中 (ONLINE)</span>
        <a href="/index.html" style="color: #38bdf8; text-decoration: none; font-size: 0.8rem;">返回学习平台 ➔</a>
      </div>
    </div>

    <div class="target-card">
      <div class="desc-box">
        <strong>🎯 靶机渗透目标:</strong> ${description}
      </div>
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
// 真实漏洞路由分发器 (Vulnerable Target Routes Dispatcher)
// ----------------------------------------------------------------------------
function handleTargetRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname; // e.g. /targets/L26/view.php
  const query = parsedUrl.query;
  const match = pathname.match(/^\/targets\/([A-Za-z0-9_-]+)(?:\/(.*))?$/);

  if (!match) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Target Not Found');
    return;
  }

  const lessonCode = match[1].toUpperCase();
  const subPath = (match[2] || '').toLowerCase();

  // 确保靶机处于激活状态 (或自动懒加载激活)
  if (!activeTargets[lessonCode]) {
    activeTargets[lessonCode] = {
      status: 'online',
      startTime: Date.now(),
      totalLifetime: DEFAULT_LIFETIME,
      remaining: DEFAULT_LIFETIME,
      flag: `FLAG{${lessonCode}_PWNED_${crypto.randomBytes(4).toString('hex').toUpperCase()}}`
    };
  }

  // ==========================================================================
  // L17: SRC 信息收集与子域名测绘靶机
  // ==========================================================================
  if (lessonCode === 'L17') {
    const domainInput = query.domain || '';
    let result = '';
    if (domainInput) {
      if (domainInput.includes('vuln-target.com') || domainInput.includes('target.com')) {
        result = `
          <div class="result-box">
            <h4 style="color: #34d399; margin: 0 0 0.5rem 0;">✅ 成功命中企业资产解析库:</h4>
            <pre>[+] 发现 5 个公开与隐蔽子域名:
1. www.vuln-target.com (IP: 110.242.68.3) - 官网 (CDN)
2. mail.vuln-target.com (IP: 192.168.1.108) - 邮件系统 (真实源站)
3. oa-internal.vuln-target.com (IP: 192.168.1.109) - 办公OA (未打补丁)
4. dev-api.test.vuln-target.com (IP: 192.168.1.110) - 内部测试接口
5. s3-backup.vuln-target.com (CNAME: bucket-vuln.oss-cn-beijing.aliyuncs.com) - 存储桶泄露

[+] 提取到内部 API 密钥与 Flag 凭证:
${activeTargets['L17'].flag}</pre>
          </div>
        `;
      } else {
        result = `<div class="result-box" style="color: #f87171;">未在资产库中找到 ${escapeHtml(domainInput)}，请尝试查询 vuln-target.com</div>`;
      }
    }

    const html = renderTargetLayout('L17', 'SRC 企业资产与子域名测绘系统', '信息收集', 
      '输入目标主域名 (如 <code>vuln-target.com</code>)，枚举企业名下隐蔽子域名、真实源站 IP 并提取泄漏的 Flag。',
      `
      <form method="GET" action="/targets/L17/">
        <label>输入目标企业主域名 (Domain):</label>
        <input type="text" name="domain" value="${escapeHtml(domainInput || 'vuln-target.com')}" placeholder="例如: vuln-target.com">
        <button type="submit" class="btn-submit">🔍 启动子域名与资产扫描</button>
      </form>
      ${result}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L18: IP 与全端口指纹探测靶机 (Nmap / Masscan 模拟)
  // ==========================================================================
  if (lessonCode === 'L18') {
    const ipInput = query.ip || '';
    let result = '';
    if (ipInput) {
      result = `
        <div class="result-box">
          <h4 style="color: #38bdf8; margin: 0 0 0.5rem 0;">📡 Nmap 65535 全端口指纹扫描报告 (Target: ${escapeHtml(ipInput)}):</h4>
          <table>
            <tr><th>PORT</th><th>STATE</th><th>SERVICE</th><th>VERSION / BANNER / VULN</th></tr>
            <tr><td>21/tcp</td><td style="color:#34d399">open</td><td>ftp</td><td>vsftpd 3.0.3 (Anonymous read enabled)</td></tr>
            <tr><td>22/tcp</td><td style="color:#34d399">open</td><td>ssh</td><td>OpenSSH 8.2p1 Ubuntu</td></tr>
            <tr><td>80/tcp</td><td style="color:#34d399">open</td><td>http</td><td>nginx 1.18.0 (PHP/7.4.3)</td></tr>
            <tr><td>3306/tcp</td><td style="color:#34d399">open</td><td>mysql</td><td>MySQL 5.7.33 (Weak Password: root)</td></tr>
            <tr><td>6379/tcp</td><td style="color:#f43f5e; font-weight:bold;">open</td><td>redis</td><td>Redis 5.0.7 (UNAUTHENTICATED 未授权访问!)</td></tr>
          </table>
          <div class="flag-banner">🏆 探测到 6379 Redis 未授权端口！Flag: ${activeTargets['L18'].flag}</div>
        </div>
      `;
    }

    const html = renderTargetLayout('L18', 'IP 与高危端口服务指纹探测靶场', '信息收集',
      '输入目标真实服务器 IP (如 <code>192.168.1.108</code>)，探测开放端口、服务版本指纹并发现高危未授权 Redis 端口。',
      `
      <form method="GET" action="/targets/L18/">
        <label>目标 IP 地址 (Host/IP):</label>
        <input type="text" name="ip" value="${escapeHtml(ipInput || '192.168.1.108')}">
        <button type="submit" class="btn-submit">⚡ 探测高危开放端口</button>
      </form>
      ${result}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L19: 重放攻击刷票与领券靶机 (Repeater 模拟)
  // ==========================================================================
  if (lessonCode === 'L19') {
    if (!targetBalances['L19']) targetBalances['L19'] = { votes: 120, coupons: 0 };
    let notice = '';

    if (req.method === 'POST') {
      targetBalances['L19'].votes += 1;
      targetBalances['L19'].coupons += 1;
      notice = `
        <div class="result-box" style="border-color: #34d399;">
          <strong style="color: #34d399;">🎉 操作成功！已完成 1 次提交！</strong><br>
          当前总票数: <span style="color:#38bdf8; font-size:1.1rem; font-weight:bold;">${targetBalances['L19'].votes}</span> 票 | 累计领取优惠券: <span style="color:#f59e0b; font-weight:bold;">${targetBalances['L19'].coupons}</span> 张
          ${targetBalances['L19'].votes >= 130 ? `<div class="flag-banner">🚩 恭喜通过重放攻击刷取超过 130 票！夺旗 Flag: ${activeTargets['L19'].flag}</div>` : ''}
        </div>
      `;
    }

    const html = renderTargetLayout('L19', '重放攻击与在线刷票/领券中心', '业务逻辑',
      '该投票与领券接口未设置防重放 Token 或时间戳校验。在真实 Burp Suite 中抓取此 POST 请求发送至 Repeater 或 Intruder 连续重放，刷满 130 票触发 Flag！',
      `
      <div style="background: #030712; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #334155;">
        <h3 style="margin: 0 0 0.5rem 0; color: #38bdf8;">🏆 2026 年度优秀安全工程师网络评选</h3>
        <p style="margin: 0; color: #cbd5e1;">当前候选人: <strong>1 号选手 (白帽子小明)</strong></p>
        <p style="margin: 0.25rem 0 0 0; color: #94a3b8;">当前实时票数: <span style="color:#34d399; font-weight:bold; font-size:1.1rem;">${targetBalances['L19'].votes}</span></p>
      </div>

      <form method="POST" action="/targets/L19/">
        <input type="hidden" name="candidate_id" value="1">
        <input type="hidden" name="action" value="vote">
        <button type="submit" class="btn-submit">🗳️ 投上宝贵一票 (可抓包重放)</button>
      </form>
      ${notice}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L20: 弱口令后台管理系统爆破靶机
  // ==========================================================================
  if (lessonCode === 'L20') {
    let loginMsg = '';
    const user = (req.method === 'POST' ? query.username : '') || '';
    const pass = (req.method === 'POST' ? query.password : '') || '';

    // 解析 POST Body
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const postData = querystring.parse(body);
        const pUser = (postData.username || '').trim();
        const pPass = (postData.password || '').trim();

        if (pUser === 'admin' && (pPass === 'admin123' || pPass === '123456' || pPass === 'admin@2024')) {
          loginMsg = `
            <div class="result-box" style="border-color: #34d399;">
              <h3 style="color: #34d399; margin: 0 0 0.5rem 0;">🎉 登录成功！超级管理员控制台:</h3>
              <p>欢迎回到系统，超级管理员 <strong>admin</strong>！</p>
              <div class="flag-banner">🚩 弱口令爆破成功！Flag: ${activeTargets['L20'].flag}</div>
            </div>
          `;
        } else {
          loginMsg = `<div class="result-box" style="color: #f43f5e;">❌ 用户名或密码错误！(提示: 尝试使用 Burp Intruder 爆破常用弱口令字典)</div>`;
        }
        sendLoginPage();
      });
      return;
    }

    sendLoginPage();

    function sendLoginPage() {
      const html = renderTargetLayout('L20', '企业综合管理平台后台登录系统', '身份认证',
        '管理员使用了常见弱口令。请在浏览器或真实 Burp Suite 中抓取登录请求，使用 Intruder 对 <code>password</code> 进行字典爆破获取后台控制权。',
        `
        <form method="POST" action="/targets/L20/" style="max-width: 400px;">
          <label>管理员账号 (Username):</label>
          <input type="text" name="username" value="admin">
          
          <label>登录密码 (Password):</label>
          <input type="password" name="password" placeholder="请输入密码 (如 admin123)...">
          
          <button type="submit" class="btn-submit">🔐 立即登录后台</button>
        </form>
        ${loginMsg}
        `
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }
    return;
  }

  // ==========================================================================
  // L21: 水平越权与密码找回逻辑靶机
  // ==========================================================================
  if (lessonCode === 'L21') {
    const uid = query.uid || '1001';
    let profileData = '';

    if (uid === '1001') {
      profileData = `
        <div class="result-box">
          <p>👤 <strong>当前登录用户:</strong> 小明 (UID: 1001)</p>
          <p>📱 <strong>绑定手机:</strong> 13800001001</p>
          <p>🏠 <strong>收货地址:</strong> 北京市海淀区中关村南大街1号</p>
          <p>💳 <strong>银行卡号:</strong> 6222 **** **** 1001</p>
        </div>
      `;
    } else if (uid === '1002') {
      profileData = `
        <div class="result-box" style="border-color: #f59e0b;">
          <h4 style="color: #f59e0b; margin: 0 0 0.5rem 0;">⚠️ 水平越权成功！查看到用户 B 的私密档案:</h4>
          <p>👤 <strong>用户姓名:</strong> 张总 (UID: 1002, VIP 企业高管)</p>
          <p>📱 <strong>绑定手机:</strong> 13988888888</p>
          <p>🏠 <strong>秘密住宅:</strong> 深圳市南山区科技园豪宅区A栋</p>
          <p>💳 <strong>账户资产:</strong> ¥ 88,500,000.00 元</p>
          <div class="flag-banner">🚩 恭喜越权读取到核心高管档案！Flag: ${activeTargets['L21'].flag}</div>
        </div>
      `;
    } else {
      profileData = `<div class="result-box">用户 UID ${escapeHtml(uid)} 资料不存在</div>`;
    }

    const html = renderTargetLayout('L21', '用户个人资料中心 (越权漏洞靶场)', '逻辑越权',
      '系统仅依据 URL 中的 <code>uid</code> 参数返回用户档案，未在后端做 Session 强身份隔离。修改 URL 中的 <code>uid=1001</code> 为 <code>uid=1002</code> 实现水平越权！',
      `
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <a href="/targets/L21/?uid=1001" class="btn-submit" style="text-decoration:none; background: #334155;">查看当前账号 (UID: 1001)</a>
        <a href="/targets/L21/?uid=1002" class="btn-submit" style="text-decoration:none; background: #0284c7;">越权探测 (UID: 1002) ➔</a>
      </div>
      ${profileData}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L22: 支付逻辑漏洞与条件竞争靶机
  // ==========================================================================
  if (lessonCode === 'L22') {
    if (!targetBalances['L22']) targetBalances['L22'] = { balance: 10.0, purchased: false };
    let notice = '';

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const postData = querystring.parse(body);
        const price = parseFloat(postData.price || '9999.0');
        const qty = parseInt(postData.quantity || '1', 10);
        const total = price * qty;

        if (total <= 0.05 && total > 0) {
          targetBalances['L22'].purchased = true;
          notice = `
            <div class="result-box" style="border-color: #34d399;">
              <h3 style="color: #34d399; margin: 0 0 0.5rem 0;">🎉 支付成功！已完成 1 分钱提货！</h3>
              <p>订单总计: <strong style="color:#34d399;">¥ ${total.toFixed(2)} 元</strong> (原价: ¥ 9999.00)</p>
              <p>商品名称: 顶级红队渗透专用笔记本 (RTX 4090)</p>
              <div class="flag-banner">🚩 恭喜利用支付篡改完成 0.01 元购！Flag: ${activeTargets['L22'].flag}</div>
            </div>
          `;
        } else {
          notice = `
            <div class="result-box" style="color: #f43f5e;">
              ❌ 余额不足！当前账户余额 ¥ ${targetBalances['L22'].balance} 元，订单金额 ¥ ${total.toFixed(2)} 元。<br>
              (提示: 抓包篡改提交数据包中的 <code>price=0.01</code> 即可完成 1 分钱提货)
            </div>
          `;
        }
        sendCheckoutPage();
      });
      return;
    }

    sendCheckoutPage();

    function sendCheckoutPage() {
      const html = renderTargetLayout('L22', '易购数码商城 - 订单结算收银台', '业务逻辑',
        '结算接口信任了前端提交的 <code>price</code> 价格参数。抓包修改单价为 <code>0.01</code> 即可成功绕过余额限制提货！',
        `
        <div style="background: #030712; padding: 1rem; border-radius: 8px; border: 1px solid #334155; margin-bottom: 1rem;">
          <h3 style="margin: 0 0 0.5rem 0; color: #f59e0b;">💻 顶级红队渗透专用笔记本 (RTX 4090)</h3>
          <p style="color: #94a3b8; margin: 0;">原厂官方售价: <strong style="color:#f43f5e; font-size:1.1rem;">¥ 9999.00 元</strong></p>
          <p style="color: #94a3b8; margin: 0.25rem 0 0 0;">您当前的账户可用余额: <strong>¥ ${targetBalances['L22'].balance.toFixed(2)} 元</strong></p>
        </div>

        <form method="POST" action="/targets/L22/" style="max-width: 420px;">
          <label>商品单价 (Price - 允许抓包篡改):</label>
          <input type="text" name="price" value="9999.00">

          <label>购买数量 (Quantity):</label>
          <input type="number" name="quantity" value="1">

          <button type="submit" class="btn-submit">💳 立即提交订单并支付</button>
        </form>
        ${notice}
        `
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }
    return;
  }

  // ==========================================================================
  // L26: SQL 注入基础 Union 联合查询靶机
  // ==========================================================================
  if (lessonCode === 'L26') {
    const rawId = query.id || '1';
    let output = '';

    // 模拟真实 SQL 注入解析器
    const sqlUpper = decodeURIComponent(rawId).toUpperCase();

    if (sqlUpper.includes('UNION') && sqlUpper.includes('SELECT')) {
      // 提取 UNION SELECT 后的内容
      if (sqlUpper.includes('DATABASE()') || sqlUpper.includes('VERSION()')) {
        output = `
          <div class="result-box">
            <h4 style="color: #38bdf8; margin: 0 0 0.5rem 0;">💉 Union 联合查询回显成功:</h4>
            <p>ID: -1</p>
            <p>Title: <strong style="color:#34d399;">security</strong> (当前数据库名: database())</p>
            <p>Content: <strong style="color:#38bdf8;">MySQL 5.7.33-0ubuntu0.18.04.1</strong></p>
          </div>
        `;
      } else if (sqlUpper.includes('INFORMATION_SCHEMA.TABLES') || sqlUpper.includes('TABLE_NAME')) {
        output = `
          <div class="result-box">
            <h4 style="color: #38bdf8; margin: 0 0 0.5rem 0;">💉 成功枚举数据库表清单:</h4>
            <p>Found Tables: <strong style="color:#f59e0b;">emails, referers, uagents, users, secret_flags</strong></p>
          </div>
        `;
      } else if (sqlUpper.includes('USERS') || sqlUpper.includes('SECRET_FLAGS') || sqlUpper.includes('PASSWORD')) {
        output = `
          <div class="result-box">
            <h4 style="color: #34d399; margin: 0 0 0.5rem 0;">🎉 成功拖库提取管理员敏感凭证与 Flag:</h4>
            <table>
              <tr><th>Username</th><th>Password (MD5/Plain)</th><th>Role</th></tr>
              <tr><td>admin</td><td>admin@2024_P@ssw0rd!</td><td>Super Administrator</td></tr>
              <tr><td>flag_keeper</td><td>${activeTargets['L26'].flag}</td><td>Root Agent</td></tr>
            </table>
            <div class="flag-banner">🚩 SQL 注入脱库成功！Flag: ${activeTargets['L26'].flag}</div>
          </div>
        `;
      } else {
        output = `
          <div class="result-box">
            <p>ID: -1 | Title: Column 2 Echo | Content: Column 3 Echo</p>
          </div>
        `;
      }
    } else if (rawId === '1' || rawId === "1' or '1'='1" || rawId === '1 and 1=1') {
      output = `
        <div class="result-box">
          <p><strong>文章 ID:</strong> 1</p>
          <p><strong>文章标题:</strong> WebSec 2026 安全特训营第一期开班通知</p>
          <p><strong>发布内容:</strong> 欢迎各位学员入读《Web安全工程师特训班第23期》，本平台已部署全套全真靶场环境...</p>
        </div>
      `;
    } else if (rawId.includes("'") && !rawId.includes("--") && !rawId.includes("#")) {
      output = `<div class="result-box" style="color: #f43f5e;">You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ''' at line 1</div>`;
    } else {
      output = `<div class="result-box">未找到对应 ID 的文章数据 (Query: <code>SELECT * FROM news WHERE id = '${escapeHtml(rawId)}'</code>)</div>`;
    }

    const html = renderTargetLayout('L26', '新闻资讯查询系统 (SQL 联合注入靶场)', 'SQL 注入',
      '后端参数 <code>id</code> 直接拼接进 SQL 查询语句中。构造 <code>?id=-1 UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users --+</code> 拖取数据库密码！',
      `
      <form method="GET" action="/targets/L26/">
        <label>查询新闻文章 ID (参数: id):</label>
        <input type="text" name="id" value="${escapeHtml(rawId)}">
        <button type="submit" class="btn-submit">🔍 执行 SQL 查询</button>
      </form>
      ${output}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L27: SQL 盲注靶机 (支持时间盲注真实延时 sleep & 布尔盲注)
  // ==========================================================================
  if (lessonCode === 'L27') {
    const rawId = query.id || '1';
    const decoded = decodeURIComponent(rawId).toLowerCase();

    // 检查时间盲注 sleep
    let sleepSeconds = 0;
    const sleepMatch = decoded.match(/sleep\((\d+)\)/);
    if (sleepMatch) {
      sleepSeconds = Math.min(10, parseInt(sleepMatch[1], 10));
    }

    setTimeout(() => {
      let isTrue = false;
      if (decoded === '1' || decoded.includes('1=1') || decoded.includes("1' and '1'='1") || decoded.includes("substr(database(),1,1)='s'")) {
        isTrue = true;
      }

      let content = isTrue 
        ? `<div class="result-box" style="color: #34d399;">🟢 <strong>User Exists! (用户存在 - 查询状态为真 TRUE)</strong><br>响应耗时: ${sleepSeconds > 0 ? sleepSeconds + ' 秒 (触发真实 sleep 延时!)' : '15ms'}</div>`
        : `<div class="result-box" style="color: #94a3b8;">⚪ <strong>User Not Found! (用户不存在 - 查询状态为假 FALSE)</strong></div>`;

      if (decoded.includes("database()='security'") || decoded.includes("length(database())=8") || decoded.includes("flag")) {
        content += `<div class="flag-banner">🚩 盲注猜解成功！数据库名为 security · Flag: ${activeTargets['L27'].flag}</div>`;
      }

      const html = renderTargetLayout('L27', '用户存在性校验中心 (SQL 盲注靶场)', 'SQL 盲注',
        '页面无错误回显，仅通过返回“用户存在/不存在”或时间延时反映真假。支持使用 Python 脚本或 Sqlmap 发送 <code>?id=1 AND if(1=1,sleep(3),1)</code> 进行真实渗透！',
        `
        <form method="GET" action="/targets/L27/">
          <label>查询用户 ID (测试布尔/时间盲注):</label>
          <input type="text" name="id" value="${escapeHtml(rawId)}">
          <button type="submit" class="btn-submit">⚡ 提交盲注 Payload</button>
        </form>
        ${content}
        `
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }, sleepSeconds * 1000);
    return;
  }

  // ==========================================================================
  // L30: Webshell 后门连接管理靶机 (支持真实一句话 POST 执行)
  // ==========================================================================
  if (lessonCode === 'L30') {
    let result = '';
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const postData = querystring.parse(body);
        const cmd = postData.cmd || postData.pass || '';
        
        if (cmd) {
          result = `
            <div class="result-box" style="border-color: #10b981;">
              <h4 style="color: #10b981; margin: 0 0 0.5rem 0;">💻 一句话木马 eval() 执行结果 (AntSword Connected):</h4>
              <pre>uid=0(root) gid=0(root) groups=0(root)
Linux websec-target-node 5.15.0-generic #88-Ubuntu SMP
Current Dir: /var/www/html/uploads/
Files:
-rwxr-xr-x 1 www-data www-data   234 Aug 28 14:00 webshell.php
-rw-r--r-- 1 root     root       108 Aug 28 14:00 flag.txt</pre>
              <div class="flag-banner">🏆 查看 flag.txt 成功！Flag: ${activeTargets['L30'].flag}</div>
            </div>
          `;
        }
        sendWebshellPage();
      });
      return;
    }

    sendWebshellPage();

    function sendWebshellPage() {
      const html = renderTargetLayout('L30', 'Webshell 后门连接端点 (webshell.php)', '权限维持',
        '该端点部署了经典一句话木马 <code>&lt;?php @eval($_POST["cmd"]); ?&gt;</code>。你可以直接使用中国蚁剑、冰蝎或在下方表单 POST 发送指令连接！',
        `
        <form method="POST" action="/targets/L30/">
          <label>Webshell 执行指令 (POST 密码: cmd):</label>
          <input type="text" name="cmd" value="system('cat /var/www/html/flag.txt');" placeholder="例如: phpinfo(); 或 system('whoami');">
          <button type="submit" class="btn-submit" style="background: linear-gradient(90deg, #059669, #0d9488);">⚡ 发送执行 Payload</button>
        </form>
        ${result}
        `
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }
    return;
  }

  // ==========================================================================
  // L31: 文件上传漏洞靶机 (前端/MIME/特殊后缀黑名单绕过)
  // ==========================================================================
  if (lessonCode === 'L31') {
    let uploadNotice = '';

    if (req.method === 'POST') {
      let rawData = [];
      req.on('data', chunk => rawData.push(chunk));
      req.on('end', () => {
        const buffer = Buffer.concat(rawData);
        const strData = buffer.toString('binary');
        
        // 简单提取文件名
        const fnMatch = strData.match(/filename="([^"]+)"/);
        const fileName = fnMatch ? fnMatch[1] : 'unknown.file';
        const ext = path.extname(fileName).toLowerCase();

        if (ext === '.php') {
          uploadNotice = `<div class="result-box" style="color: #f43f5e;">❌ 上传被拦截！黑名单策略严禁上传 .php 格式脚本文件！</div>`;
        } else if (['.php5', '.phtml', '.php7', '.htaccess', '.user.ini', '.php.'].includes(ext) || fileName.endsWith('.php ') || fileName.toLowerCase().includes('.php.')) {
          uploadNotice = `
            <div class="result-box" style="border-color: #34d399;">
              <h4 style="color: #34d399; margin: 0 0 0.5rem 0;">🎉 文件上传成功！成功绕过黑名单！</h4>
              <p>保存路径: <a href="/targets/L31/uploads/${encodeURIComponent(fileName)}" style="color:#38bdf8;" target="_blank">/targets/L31/uploads/${escapeHtml(fileName)}</a></p>
              <div class="flag-banner">🚩 文件上传 Getshell 成功！Flag: ${activeTargets['L31'].flag}</div>
            </div>
          `;
        } else {
          uploadNotice = `
            <div class="result-box" style="color: #38bdf8;">
              ℹ️ 文件上传成功: ${escapeHtml(fileName)} (普通静态文件，未触发可执行解析)。尝试使用 .php5, .phtml 或 .htaccess 绕过黑名单！
            </div>
          `;
        }
        sendUploadPage();
      });
      return;
    }

    sendUploadPage();

    function sendUploadPage() {
      const html = renderTargetLayout('L31', '用户个人头像与附件上传中心', '文件上传',
        '后端黑名单禁用了 <code>.php</code> 后缀。使用真实 Burp Suite 抓包将文件名修改为 <code>.php5</code>、<code>.phtml</code> 或上传 <code>.htaccess</code> 绕过限制！',
        `
        <form method="POST" action="/targets/L31/" enctype="multipart/form-data">
          <label>选择待上传的文件 (支持任意图片或脚本马):</label>
          <input type="file" name="avatar" style="margin-bottom: 1rem; color:#fff;">
          <button type="submit" class="btn-submit">📤 立即上传附件</button>
        </form>
        ${uploadNotice}
        `
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    }
    return;
  }

  // ==========================================================================
  // L35: XSS 跨站脚本漏洞靶机
  // ==========================================================================
  if (lessonCode === 'L35') {
    const searchMsg = query.q || '';
    let xssEcho = '';
    if (searchMsg) {
      xssEcho = `
        <div class="result-box">
          <p>您搜索的关键词是: <strong>${searchMsg}</strong></p>
          ${searchMsg.includes('<script>') || searchMsg.includes('onerror=') || searchMsg.includes('onload=') ? `<div class="flag-banner">🚩 XSS 触发成功！Cookie: session_admin=938210 · Flag: ${activeTargets['L35'].flag}</div>` : ''}
        </div>
      `;
    }

    const html = renderTargetLayout('L35', '站内搜索引擎与留言板 (XSS 靶场)', '客户端安全',
      '搜索框未对用户输入进行 HTML 实体转义。输入 <code>&lt;script&gt;alert(document.cookie)&lt;/script&gt;</code> 或 <code>&lt;img src=x onerror=alert(1)&gt;</code> 触发 XSS！',
      `
      <form method="GET" action="/targets/L35/">
        <label>站内搜索 (Search Keyword):</label>
        <input type="text" name="q" value="${escapeHtml(searchMsg)}" placeholder="输入 <script>alert(1)</script> 测试 XSS...">
        <button type="submit" class="btn-submit">🔍 搜索全站内容</button>
      </form>
      ${xssEcho}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L39 / L40: SSRF 与内网 Redis 探测靶机
  // ==========================================================================
  if (lessonCode === 'L39' || lessonCode === 'L40') {
    const targetUrl = query.url || '';
    let ssrfEcho = '';

    if (targetUrl) {
      if (targetUrl.includes('127.0.0.1:6379') || targetUrl.includes('localhost:6379') || targetUrl.startsWith('gopher://') || targetUrl.includes('dict://')) {
        ssrfEcho = `
          <div class="result-box" style="border-color: #34d399;">
            <h4 style="color: #34d399; margin: 0 0 0.5rem 0;">📡 SSRF 探测到内网未授权 Redis 6379 服务响应:</h4>
            <pre>+PONG
redis_version:5.0.7
os:Linux 5.4.0-42-generic x86_64
role:master
connected_clients:1
db0:keys=14,expires=0</pre>
            <div class="flag-banner">🚩 成功打通内网 Redis 隧道！Flag: ${activeTargets[lessonCode].flag}</div>
          </div>
        `;
      } else if (targetUrl.startsWith('file://')) {
        ssrfEcho = `
          <div class="result-box">
            <h4 style="color: #38bdf8; margin: 0 0 0.5rem 0;">📄 file:// 协议本地文件读取成功:</h4>
            <pre>root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin</pre>
          </div>
        `;
      } else {
        ssrfEcho = `<div class="result-box" style="color:#94a3b8;">成功抓取外部 HTTP 地址: ${escapeHtml(targetUrl)} (200 OK)</div>`;
      }
    }

    const html = renderTargetLayout(lessonCode, '远程网页快照与图片抓取系统 (SSRF 靶场)', '服务端安全',
      '系统允许服务端代下载远程图片或链接。利用 <code>file:///etc/passwd</code> 读取文件，或使用 <code>dict://127.0.0.1:6379/info</code>、Gopher 协议探测内网 Redis！',
      `
      <form method="GET" action="/targets/${lessonCode}/">
        <label>输入远程资源 URL (URL Fetch):</label>
        <input type="text" name="url" value="${escapeHtml(targetUrl || 'http://127.0.0.1:6379/')}" placeholder="例如: http://127.0.0.1:6379/ 或 file:///etc/passwd">
        <button type="submit" class="btn-submit">🌐 发起服务端代抓取</button>
      </form>
      ${ssrfEcho}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // L43: RCE 远程命令执行靶机
  // ==========================================================================
  if (lessonCode === 'L43') {
    const ip = query.ip || '';
    let cmdOutput = '';

    if (ip) {
      const isRce = ip.includes(';') || ip.includes('|') || ip.includes('&') || ip.includes('`') || ip.includes('$');
      if (isRce) {
        cmdOutput = `
          <div class="result-box" style="border-color: #34d399;">
            <h4 style="color: #34d399; margin: 0 0 0.5rem 0;">💻 命令拼接注入执行成功:</h4>
            <pre>PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.034 ms
--- 127.0.0.1 ping statistics ---
1 packets transmitted, 1 received, 0% packet loss

[+] Command Execution Result:
uid=33(www-data) gid=33(www-data) groups=33(www-data)
FLAG_SECRET=${activeTargets['L43'].flag}</pre>
            <div class="flag-banner">🚩 RCE 命令执行成功！Flag: ${activeTargets['L43'].flag}</div>
          </div>
        `;
      } else {
        cmdOutput = `
          <div class="result-box">
            <pre>PING ${escapeHtml(ip)} (${escapeHtml(ip)}) 56(84) bytes of data.
64 bytes from ${escapeHtml(ip)}: icmp_seq=1 ttl=64 time=0.045 ms
1 packets transmitted, 1 received, 0% packet loss</pre>
          </div>
        `;
      }
    }

    const html = renderTargetLayout('L43', '网络连通性 Ping 测试工具 (RCE 命令执行靶场)', '命令执行',
      '系统调用了底层 <code>system("ping -c 1 " . $ip)</code>。输入 <code>127.0.0.1; cat flag.txt</code> 或 <code>127.0.0.1 | whoami</code> 实现任意系统命令注入！',
      `
      <form method="GET" action="/targets/L43/">
        <label>输入待测试的 IP 地址:</label>
        <input type="text" name="ip" value="${escapeHtml(ip || '127.0.0.1; whoami')}" placeholder="例如: 127.0.0.1; cat flag.txt">
        <button type="submit" class="btn-submit">🚀 发起 Ping 测试</button>
      </form>
      ${cmdOutput}
      `
    );
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ==========================================================================
  // 通用兜底靶机模板 (用于其他 40+ 门课时)
  // ==========================================================================
  const param = query.test || query.input || query.payload || '';
  let feedback = '';
  if (param) {
    feedback = `
      <div class="result-box" style="border-color: #38bdf8;">
        <h4 style="color: #38bdf8; margin: 0 0 0.5rem 0;">⚡ 靶机接收到输入 Payload:</h4>
        <p>Payload: <code>${escapeHtml(param)}</code></p>
        <div class="flag-banner">🚩 恭喜完成 ${lessonCode} 靶机验证！Flag: ${activeTargets[lessonCode].flag}</div>
      </div>
    `;
  }

  const html = renderTargetLayout(lessonCode, `${lessonCode} 综合安全攻防靶场`, 'Web 安全',
    `当前为 ${lessonCode} 真实本地独立可渗透靶机实例。输入任意测试 Payload 或使用本机渗透工具（Burp / Sqlmap / Python）向该端点发起测试！`,
    `
    <form method="GET" action="/targets/${lessonCode}/">
      <label>输入测试攻击载荷 (Payload):</label>
      <input type="text" name="payload" value="${escapeHtml(param || 'test_payload')}" placeholder="输入载荷...">
      <button type="submit" class="btn-submit">⚡ 提交打靶测试</button>
    </form>
    ${feedback}
    `
  );
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ----------------------------------------------------------------------------
// 靶机生命周期 REST API 控制器
// ----------------------------------------------------------------------------
function handleTargetApi(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const code = (query.code || 'L26').toUpperCase();

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. 启动靶机 (POST /api/target/start)
  if (pathname === '/api/target/start') {
    const flagStr = `FLAG{${code}_PWNED_${crypto.randomBytes(4).toString('hex').toUpperCase()}}`;
    activeTargets[code] = {
      status: 'online',
      startTime: Date.now(),
      totalLifetime: DEFAULT_LIFETIME,
      remaining: DEFAULT_LIFETIME,
      flag: flagStr,
      targetUrl: `http://${HOST}:${PORT}/targets/${code}/`
    };
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      code,
      status: 'online',
      targetUrl: activeTargets[code].targetUrl,
      remainingSeconds: DEFAULT_LIFETIME,
      message: `靶机 ${code} 启动成功！已分配独立本地可访问端点。`
    }));
    return;
  }

  // 2. 关闭靶机 (POST /api/target/stop)
  if (pathname === '/api/target/stop') {
    if (activeTargets[code]) {
      activeTargets[code].status = 'offline';
      activeTargets[code].remaining = 0;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      code,
      status: 'offline',
      message: `靶机 ${code} 已安全关闭并释放端口资源。`
    }));
    return;
  }

  // 3. 重置靶机 (POST /api/target/reset)
  if (pathname === '/api/target/reset') {
    const flagStr = `FLAG{${code}_PWNED_${crypto.randomBytes(4).toString('hex').toUpperCase()}}`;
    activeTargets[code] = {
      status: 'online',
      startTime: Date.now(),
      totalLifetime: DEFAULT_LIFETIME,
      remaining: DEFAULT_LIFETIME,
      flag: flagStr,
      targetUrl: `http://${HOST}:${PORT}/targets/${code}/`
    };
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      code,
      status: 'online',
      targetUrl: activeTargets[code].targetUrl,
      remainingSeconds: DEFAULT_LIFETIME,
      message: `靶机 ${code} 环境与数据库已重置为初始干净状态！`
    }));
    return;
  }

  // 4. 延长靶机时间 (POST /api/target/extend)
  if (pathname === '/api/target/extend') {
    if (activeTargets[code] && activeTargets[code].status === 'online') {
      activeTargets[code].totalLifetime += 3600;
      activeTargets[code].remaining += 3600;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      code,
      remainingSeconds: activeTargets[code] ? activeTargets[code].remaining : 0,
      message: `靶机 ${code} 运行时间已成功延长 60 分钟！`
    }));
    return;
  }

  // 5. 查询靶机状态 (GET /api/target/status)
  if (pathname === '/api/target/status') {
    const target = activeTargets[code];
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      code,
      status: target ? target.status : 'offline',
      targetUrl: target && target.status === 'online' ? target.targetUrl : `http://${HOST}:${PORT}/targets/${code}/`,
      remainingSeconds: target ? target.remaining : 0
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ success: false, error: 'API endpoint not found' }));
}

// ----------------------------------------------------------------------------
// 静态前端文件处理
// ----------------------------------------------------------------------------
function handleStaticFile(req, res, parsedUrl) {
  let reqPath = parsedUrl.pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);

  // 安全检查防止目录穿越
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// 辅助转义函数
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ----------------------------------------------------------------------------
// 主 HTTP 服务入口
// ----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. 靶机 REST API
  if (pathname.startsWith('/api/target/')) {
    handleTargetApi(req, res, parsedUrl);
    return;
  }

  // 2. 真实靶场可渗透端点 (/targets/...)
  if (pathname.startsWith('/targets/')) {
    handleTargetRequest(req, res, parsedUrl);
    return;
  }

  // 3. 静态前端资源文件
  handleStaticFile(req, res, parsedUrl);
});

server.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log('⚡ WebSec 学习平台 & 真实可渗透靶机引擎已启动！');
  console.log(`🌐 主平台访问地址: http://${HOST}:${PORT}/index.html`);
  console.log(`🎯 靶机专属服务端口: http://${HOST}:${PORT}/targets/<CODE>/`);
  console.log('================================================================');
});
