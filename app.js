(function(){
"use strict";
var D = window.DATA;

var TABS = [
  {id:"outline", icon:"◎", name:"提纲"},
  {id:"nouns",   icon:"▤", name:"名词"},
  {id:"shorts",  icon:"☰", name:"简答"},
  {id:"essays",  icon:"✎", name:"论述"},
  {id:"recall",  icon:"🎯", name:"抽背"},
  {id:"quiz",    icon:"✓", name:"刷题"},
  {id:"calc",    icon:"∑", name:"计算"},
  {id:"paper",   icon:"▦", name:"卷子"},
  {id:"quick",   icon:"★", name:"速查"}
];

var TAB = "outline";
var open = {};                 // 展开状态
var q = "";                    // 搜索词
var mastered = [];
try { mastered = JSON.parse(localStorage.getItem("dfjy_m2") || "[]"); } catch(e) { mastered = []; }
var qi = 0, qscore = 0, qdone = false;

function saveM(){ try{ localStorage.setItem("dfjy_m2", JSON.stringify(mastered)); }catch(e){} }
function el(id){ return document.getElementById(id); }
function esc(s){ return String(s); }

/* ---------- 初始化头部与导航 ---------- */
function init(){
  el("hTitle").textContent = D.meta.title;
  el("hSub").textContent = D.meta.sub;
  var nav = el("nav");
  nav.innerHTML = TABS.map(function(t){
    return '<button data-t="'+t.id+'"><i>'+t.icon+'</i>'+t.name+'</button>';
  }).join("");
  nav.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(!b) return;
    go(b.getAttribute("data-t"));
  });
  el("shareBtn").addEventListener("click", copyLink);
  var h = (location.hash || "").replace("#","");
  var ok = TABS.some(function(t){ return t.id === h; });
  go(ok ? h : "outline");
}

function go(id){
  TAB = id; q = "";
  if(location.hash !== "#" + id){ try{ history.replaceState(null,"","#"+id); }catch(e){ location.hash = id; } }
  Array.prototype.forEach.call(el("nav").children, function(b){
    b.className = (b.getAttribute("data-t") === id) ? "on" : "";
  });
  render();
  window.scrollTo(0, 0);
}

/* ---------- 渲染分发 ---------- */
function render(){
  var m = el("main");
  if(TAB === "quiz"){ renderQuiz(); return; }
  if(TAB === "recall"){ window.Recall.render(m, D); return; }
  var html = "";
  if(TAB === "outline") html = vOutline();
  else if(TAB === "nouns") html = vNouns();
  else if(TAB === "shorts") html = vList(D.shorts, "short");
  else if(TAB === "essays") html = vList(D.essays, "essay");
  else if(TAB === "calc") html = vCalc();
  else if(TAB === "paper") html = vPaper();
  else if(TAB === "quick") html = vQuick();
  m.innerHTML = html;
}

/* ---------- 提纲 ---------- */
function vOutline(){
  var h = '<div class="card"><div class="tip">' + D.meta.book + '<br>' + D.meta.exam + '</div></div>';
  D.outline.forEach(function(blk){
    h += '<div class="sec-t">' + blk.t + '</div><div class="card">';
    h += '<div class="tip" style="line-height:2">';
    h += blk.lines.map(function(l){ return "• " + l; }).join("<br>");
    h += '</div>';
    if(blk.note) h += '<div class="tip" style="margin-top:9px;color:var(--main)">💡 ' + blk.note + '</div>';
    h += '</div>';
  });
  h += '<div class="sec-t">九个页签怎么用</div><div class="card"><div class="tip" style="line-height:2">' +
       '<b>提纲</b>——先看这个，知道考什么<br>' +
       '<b>名词</b>——58 个，点开背，可标记已掌握<br>' +
       '<b>简答</b>——50 道，背小标题<br>' +
       '<b>论述</b>——老师给的 8 道论述题完整答案＋3 道思考题<br>' +
       '<b>抽背</b>——8 道论述题随机抽背，隐藏答案、薄弱题重练<br>' +
       '<b>刷题</b>——104 题，即时判分<br>' +
       '<b>计算</b>——TCID50／中和效价／中和指数四道例题<br>' +
       '<b>卷子</b>——整套模拟卷，闭卷做<br>' +
       '<b>速查</b>——考前 10 分钟只看这页</div></div>';
  return h;
}

/* ---------- 名词 ---------- */
function vNouns(){
  var h = '<input class="search" id="sBox" placeholder="搜索名词（如：检疫、无害化）" value="">';
  h += '<div class="stat" id="stat"></div><div id="list"></div>';
  setTimeout(function(){
    var box = el("sBox");
    box.addEventListener("input", function(){ q = box.value.trim(); drawNouns(); });
    drawNouns();
  }, 0);
  return h;
}
function drawNouns(){
  var kw = q;
  var arr = D.nouns.map(function(n, i){ return {n:n, i:i}; });
  if(kw) arr = arr.filter(function(o){ return (o.n[0]+o.n[1]).indexOf(kw) >= 0; });
  el("stat").textContent = "共 " + arr.length + " 条　已掌握 " + mastered.length + " / " + D.nouns.length;
  if(!arr.length){ el("list").innerHTML = '<div class="empty">没找到，换个词试试</div>'; return; }
  el("list").innerHTML = arr.map(function(o){
    var i = o.i, n = o.n, op = open["n"+i], on = mastered.indexOf(i) >= 0;
    return '<div class="q-card' + (op ? " open" : "") + '">' +
      '<div class="q-head" onclick="App.tn(' + i + ')"><span class="idx">' + (i+1) + '</span>' +
      '<span>' + n[0] + '</span><span class="arrow">▶</span></div>' +
      '<div class="q-body"><div>' + n[1] + '</div>' +
      '<button class="master' + (on ? " on" : "") + '" onclick="event.stopPropagation();App.mm(' + i + ',this)">' +
      (on ? "✓ 已掌握" : "标记已掌握") + '</button></div></div>';
  }).join("");
}

/* ---------- 简答 / 论述 通用 ---------- */
function vList(data, kind){
  var h = '<input class="search" id="sBox" placeholder="搜索题目（关键词）" value="">';
  h += '<div class="stat" id="stat"></div><div id="list"></div>';
  setTimeout(function(){
    var box = el("sBox");
    box.addEventListener("input", function(){ q = box.value.trim(); drawList(data, kind); });
    drawList(data, kind);
  }, 0);
  return h;
}
function drawList(data, kind){
  var kw = q;
  var arr = data.map(function(d, i){ return {d:d, i:i}; });
  if(kw) arr = arr.filter(function(o){
    return (o.d[0] + o.d[1].join("") + (o.d[2]||"")).indexOf(kw) >= 0;
  });
  el("stat").textContent = "共 " + arr.length + " 条";
  if(!arr.length){ el("list").innerHTML = '<div class="empty">没找到，换个词试试</div>'; return; }
  el("list").innerHTML = arr.map(function(o){
    var i = o.i, d = o.d, key = kind + i, op = open[key];
    var body = '<ul>' + d[1].map(function(l){ return '<li>' + l + '</li>'; }).join("") + '</ul>';
    if(d[2]) body += '<div class="note">💡 ' + d[2] + '</div>';
    return '<div class="qa' + (op ? " open" : "") + '">' +
      '<div class="qa-h" onclick="App.tg(\'' + key + '\')">' +
      '<span class="no">' + (i+1) + '</span><span>' + d[0] + '</span></div>' +
      '<div class="qa-b">' + body + '</div></div>';
  }).join("");
}

/* ---------- 计算 ---------- */
function vCalc(){
  var h = '<div class="card"><div class="tip">计算题一共就两个套路：<b>Reed-Muench 算毒价</b> 和 <b>中和指数</b>。' +
          '公式背下来，代数字，最后写结论，公式对了就有过程分。</div></div>';
  D.calc.forEach(function(c, i){
    h += '<div class="qa' + (open["c"+i] ? " open" : "") + '">' +
      '<div class="qa-h" onclick="App.tg(\'c' + i + '\')"><span class="no">' + (i+1) + '</span>' +
      '<span>' + c.t + '</span></div><div class="qa-b"><ul>' +
      c.lines.map(function(l){ return '<li>' + l + '</li>'; }).join("") +
      '</ul></div></div>';
  });
  return h;
}

/* ---------- 卷子 ---------- */
function vPaper(){
  var p = D.paper;
  var h = '<div class="card"><b style="font-size:14.5px">' + p.title + '</b>' +
          '<div class="tip" style="margin-top:4px">' + p.sub + '</div>' +
          '<div class="tip" style="margin-top:6px">闭卷先做，做完再点「显示答案」。</div></div>';
  p.sections.forEach(function(s, i){
    h += '<div class="card paper"><h4>' + s.h + '</h4>';
    if(s.lines.length > 3){
      h += '<ol>' + s.lines.map(function(l){
        var t = l.replace(/^\d+[\.\、]\s*/, "");
        return '<li>' + t + '</li>';
      }).join("") + '</ol>';
    } else {
      h += '<div class="tip" style="line-height:1.95">' + s.lines.join("<br>") + '</div>';
    }
    if(s.note){
      h += '<button class="tog" onclick="App.tp(this)">显示答案</button>';
      h += '<div class="ansbox">' + s.note + '</div>';
    }
    h += '</div>';
  });
  return h;
}

/* ---------- 速查 ---------- */
function vQuick(){
  var h = "";
  D.quick.forEach(function(b, i){
    if(i === 0){
      h += '<div class="big"><h3>' + b.t + '</h3><div class="line">' +
           b.lines.slice(0, 4).join("<br>") + '</div></div>';
    } else {
      h += '<div class="sec-t">' + b.t + '</div><div class="card"><div class="tip" style="line-height:2">' +
           b.lines.join("<br>") + '</div></div>';
    }
  });
  return h;
}

/* ---------- 刷题 ---------- */
function renderQuiz(){
  var m = el("main");
  if(qi >= D.quiz.length){
    var pct = Math.round(qscore / D.quiz.length * 100);
    var msg = pct >= 90 ? "稳了，去睡吧" : pct >= 75 ? "还行，把错题回看一遍" : pct >= 60 ? "及格线附近，回去重背数字和论述" : "重点还没吃透，刷「论述」和「速查」";
    m.innerHTML = '<div class="card finish"><div class="sc">' + qscore + '<small> / ' + D.quiz.length + '</small></div>' +
      '<p>正确率 ' + pct + '%　' + msg + '</p>' +
      '<button class="again" onclick="App.rq()">再来一遍</button></div>';
    return;
  }
  var it = D.quiz[qi];
  var h = '<div class="quiz-top"><span>' + (qi+1) + ' / ' + D.quiz.length + '</span>' +
          '<div class="bar"><i style="width:' + (qi / D.quiz.length * 100) + '%"></i></div>' +
          '<span>得分 ' + qscore + '</span></div>';
  h += '<div class="qz"><div class="q">' + it.q + '</div>';
  it.o.forEach(function(o, k){
    h += '<button class="opt" onclick="App.pk(' + k + ')"><span class="k">' + "ABCD"[k] + '</span>' + o + '</button>';
  });
  h += '<div id="fb"></div>';
  h += '<button class="next" id="nx" disabled onclick="App.nq()">' +
       (qi === D.quiz.length - 1 ? "看结果" : "下一题") + '</button></div>';
  m.innerHTML = h;
  qdone = false;
}
function pick(k){
  if(qdone) return;
  qdone = true;
  var it = D.quiz[qi];
  var opts = document.querySelectorAll(".opt");
  Array.prototype.forEach.call(opts, function(b, i){
    if(i === it.a) b.classList.add("right");
    else if(i === k) b.classList.add("wrong");
  });
  if(k === it.a) qscore++;
  el("fb").innerHTML = '<div class="fb"><b>' + (k === it.a ? "✓ 答对了" : "✗ 答错了，正确答案是 " + "ABCD"[it.a]) +
    '</b><br>' + it.t + '</div>';
  el("nx").disabled = false;
}
function nextQ(){ qi++; renderQuiz(); }
function restartQuiz(){ qi = 0; qscore = 0; renderQuiz(); }

/* ---------- 交互 ---------- */
function tn(i){ open["n"+i] = !open["n"+i]; drawNouns(); }
function tg(key){ open[key] = !open[key]; render(); }
function mm(i, btn){
  var p = mastered.indexOf(i);
  if(p >= 0){ mastered.splice(p,1); btn.className = "master"; btn.textContent = "标记已掌握"; }
  else { mastered.push(i); btn.className = "master on"; btn.textContent = "✓ 已掌握"; }
  saveM();
  var st = el("stat");
  if(st) st.textContent = "共 " + D.nouns.length + " 条　已掌握 " + mastered.length + " / " + D.nouns.length;
}
function tp(btn){
  var box = btn.parentNode.querySelector(".ansbox");
  var on = box.classList.toggle("show");
  btn.textContent = on ? "隐藏答案" : "显示答案";
}

/* ---------- 复制链接 ---------- */
function copyLink(){
  var u = location.href;
  if(u.indexOf("file:") === 0){ alert("这是本地文件，先部署到网上再分享"); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(u).then(function(){ alert("链接已复制，粘贴到微信发给同学"); },
      function(){ prompt("手动复制链接：", u); });
  } else {
    var t = document.createElement("textarea");
    t.value = u; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); alert("链接已复制"); } catch(e){ prompt("手动复制链接：", u); }
    document.body.removeChild(t);
  }
}

window.App = { tn:tn, tg:tg, mm:mm, tp:tp, pk:pick, nq:nextQ, rq:restartQuiz };
init();
})();
