(function(){
"use strict";
var known = [];
try {
  var saved = JSON.parse(localStorage.getItem("dfjy_recall_v1") || "[]");
  if(Array.isArray(saved)) known = saved.filter(function(n){return Number.isInteger(n)&&n>=0&&n<8;});
} catch(e) {}
var order = null, pos = 0, revealed = false, weak = false, host = null, data = null;
function save(){ try{localStorage.setItem("dfjy_recall_v1",JSON.stringify(known));}catch(e){} }
function reset(weakOnly){
  weak = !!weakOnly;
  var count = Math.min(data.essays.length,8), ids = [];
  for(var i=0;i<count;i++) if(!weak || known.indexOf(i)<0) ids.push(i);
  for(var j=ids.length-1;j>0;j--){
    var r=Math.floor(Math.random()*(j+1)), temp=ids[j]; ids[j]=ids[r]; ids[r]=temp;
  }
  order=ids; pos=0; revealed=false;
}
function start(weakOnly){if(!data)return;reset(weakOnly);draw();}
function reveal(){if(!order||pos>=order.length)return;revealed=true;draw();}
function mark(yes){
  if(!revealed||!order||pos>=order.length)return;
  var id=order[pos], idx=known.indexOf(id);
  if(yes&&idx<0) known.push(id);
  if(!yes&&idx>=0) known.splice(idx,1);
  save();pos++;revealed=false;draw();
}
function render(el, d){
  host=el;data=d;
  if(order===null)reset(false);
  draw();
}
function draw(){
  if(!host||!data)return;
  var count=Math.min(data.essays.length,8);
  var h='<div class="card"><b>🎯 老师重点 · 随机抽背</b>'+
    '<p class="tip">先口述或默写要点，再核对答案。掌握情况仅保存在当前浏览器，不上传服务器。</p>'+
    '<p class="tip" style="margin-top:8px">已标记掌握 '+known.length+' / '+count+' 题</p>'+
    '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">'+
    '<button class="tog" style="min-height:42px;margin:0" onclick="Recall.start(false)">全部随机抽背</button>'+
    '<button class="tog" style="min-height:42px;margin:0" onclick="Recall.start(true)">只抽未掌握</button></div></div>';
  if(!order.length){
    host.innerHTML=h+'<div class="card">8 道题都已标记掌握。可重新随机抽背巩固。</div>';
    return;
  }
  if(pos>=order.length){
    host.innerHTML=h+'<div class="card finish"><div class="sc">✓</div>'+
      '<p>本轮 '+order.length+' 道题已完成。还可以只重练未掌握的题。</p>'+
      '<button class="again" onclick="Recall.start(true)">重练未掌握</button></div>';
    return;
  }
  var id=order[pos], item=data.essays[id];
  h+='<div class="quiz-top"><span>'+(pos+1)+' / '+order.length+
    '</span><div class="bar"><i style="width:'+(pos/order.length*100)+'%"></i></div>'+
    '<span>重点 '+(id+1)+'</span></div>';
  h+='<div class="qz"><div class="q">'+item[0]+'</div>';
  if(!revealed){
    h+='<p class="tip">不要急着看答案，先在脑中完整列出要点。</p>'+
       '<button class="next" onclick="Recall.reveal()">显示参考答案</button>';
  } else {
    h+='<div class="qa-b" style="display:block;padding:0;margin:10px 0 0"><ul>'+
       item[1].map(function(s){return '<li>'+s+'</li>';}).join('')+'</ul></div>';
    if(item[2])h+='<div class="fb">💡 '+item[2]+'</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">'+
       '<button class="tog" style="min-height:44px;margin:0;flex:1" onclick="Recall.mark(false)">还不会 · 下次重练</button>'+
       '<button class="next" style="margin:0;flex:1;min-width:130px" onclick="Recall.mark(true)">✓ 已掌握 · 下一题</button></div>';
  }
  host.innerHTML=h+'</div>';
}
window.Recall={render:render,start:start,reveal:reveal,mark:mark};
})();