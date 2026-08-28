<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Redis 6379 Console Response</title>
  <style>
    body { background: #0a0f1d; color: #10b981; font-family: monospace; padding: 2rem; }
    pre { background: #000; padding: 1.5rem; border-radius: 8px; border: 1px solid #1e293b; font-size: 0.95rem; line-height: 1.6; }
    .back { color: #38bdf8; text-decoration: none; font-size: 0.85rem; margin-top: 1rem; display: inline-block; }
  </style>
</head>
<body>
  <h2>127.0.0.1:6379 (Redis 5.0.7) Response:</h2>
  <pre id="output"></pre>
  <a href="index.html" class="back">➔ 返回 L18 监控看板</a>
  <script>
    const params = new URLSearchParams(window.location.search);
    const cmd = (params.get('cmd') || 'INFO').trim();
    const cmdUpper = cmd.toUpperCase();
    const out = document.getElementById('output');

    if (cmdUpper === 'INFO') {
      out.innerText = `127.0.0.1:6379> INFO
# Server
redis_version:5.0.7
redis_git_sha1:00000000
os:Linux 5.4.0-42-generic x86_64
arch_bits:64
process_id:1284
tcp_port:6379
uptime_in_seconds:183920

# Keyspace
db0:keys=3,expires=0,avg_ttl=0

(提示: 输入 KEYS * 查看 db0 数据库中的键名列表)`;
    } else if (cmdUpper === 'KEYS *' || cmdUpper === 'KEYS*') {
      out.innerText = `127.0.0.1:6379> KEYS *
1) "session_user_token_admin"
2) "cache_website_config"
3) "root_system_flag"

(提示: 输入 GET root_system_flag 提取该键中存储的敏感数据)`;
    } else if (cmdUpper.includes('GET ROOT_SYSTEM_FLAG') || cmdUpper.includes('GET FLAG')) {
      out.innerText = `127.0.0.1:6379> ${cmd}
"FLAG{L18_REDIS_UNAUTH_COMMAND_GET_SECRET_FLAG_8829}"

=======================================================
🎉 恭喜！通过 Redis 协议未授权漏洞成功提取系统 Flag！
=======================================================`;
    } else {
      out.innerText = `127.0.0.1:6379> ${cmd}\n(error) ERR unknown command '${cmd}'. Try: INFO, KEYS *, GET root_system_flag`;
    }
  </script>
</body>
</html>