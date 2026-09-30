let game=G.createGame();let mode="take";
const $=s=>document.querySelector(s);
const colorClass=c=>`c-${c}`;
const abilityLabel={privilege:"特权",takeColor:"取同色",steal:"夺取",extraTurn:"再行动",wild:"百搭"};

function render(){
  const me=game.players[game.current],other=game.players[1-game.current];
  $("#turnName").textContent=me.name;$("#bagCount").textContent=`袋中 ${game.bag.length} 枚`;
  $("#privilegeBank").innerHTML=`<span>公共特权</span>${Array.from({length:3},(_,i)=>`<i class="scroll ${i<game.privilegeBank?'available':''}">卷</i>`).join("")}`;
  renderPlayer($("#currentPanel"),me,true);renderPlayer($("#opponentPanel"),other,false);renderMarket();renderBoard();renderActions();renderLog();handlePending();
  if(game.winner)showWinner();
}

function renderPlayer(el,p,isCurrent){const b=G.bonuses(p),cp=G.colorPrestige(p);el.innerHTML=`
  <div class="player-identity"><span>${isCurrent?'你的工坊':'对手工坊'}</span><h2>${p.name}</h2><div class="score"><b>${G.prestige(p)}</b> 声望 · <b>${G.crowns(p)}</b> 王冠 · <b>${p.privileges}</b> 特权</div></div>
  <div class="player-resources">${G.TOKEN_TYPES.map(t=>`<button class="resource ${colorClass(t)}" data-discard="${t}" title="${G.LABELS[t]}"><i></i><span>${p.tokens[t]}</span></button>`).join("")}</div>
  <div class="bonuses">${G.COLORS.map(c=>`<div class="bonus ${colorClass(c)}"><b>${b[c]}</b><span>${cp[c]}分</span></div>`).join("")}</div>
  <div class="reserved"><span>保留 ${p.reserved.length}/3</span>${isCurrent?p.reserved.map(c=>cardHTML(c,true)).join(""):Array(p.reserved.length).fill('<i class="card-back"></i>').join("")}</div>`;
  if(game.phase==="discard"&&isCurrent)el.querySelectorAll("[data-discard]").forEach(btn=>btn.onclick=()=>safe(()=>G.discardToken(game,btn.dataset.discard)));
  if(isCurrent)el.querySelectorAll("[data-card]").forEach(bindCard);
}

function renderMarket(){let html="";for(const level of [3,2,1])html+=`<div class="market-row"><button class="deck" data-deck="${level}"><b>${game.decks[level].length}</b><span>等级 ${level}</span></button>${game.market[level].map(c=>cardHTML(c)).join("")}</div>`;$("#market").innerHTML=html;document.querySelectorAll("[data-card]").forEach(bindCard);document.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>mode==="reserve"&&safe(()=>G.reserveCard(game,`deck-${b.dataset.deck}`)));}
function cardHTML(c,owned=false){return `<button class="jewel-card ${colorClass(c.color)}" data-card="${c.id}" ${owned?'data-owned="1"':''}><div class="card-top"><b>${c.points}</b><span>${'♛'.repeat(c.crowns)}</span><i>${c.bonus}×</i></div><div class="gem-art">◆</div>${c.ability?`<em>${abilityLabel[c.ability]}</em>`:''}<div class="cost">${Object.entries(c.cost).map(([t,n])=>`<span class="${colorClass(t)}">${n}</span>`).join("")}</div></button>`;}
function bindCard(btn){btn.onclick=()=>{if(game.phase!=="action")return;if(mode==="reserve"&&!btn.dataset.owned)safe(()=>G.reserveCard(game,btn.dataset.card));else if(mode==="buy")attemptBuy(btn.dataset.card);};}
function attemptBuy(id){const card=findCard(id);if(!card)return;if(card.color==="wild")return chooseColor(id);safe(()=>G.buyCard(game,id));}
function findCard(id){for(const l of [1,2,3]){const c=game.market[l].find(x=>x.id===id);if(c)return c;}return game.players[game.current].reserved.find(x=>x.id===id);}

function renderBoard(){$("#board").innerHTML=game.board.map((t,i)=>`<button class="board-cell ${game.selected.includes(i)?'selected':''}" data-index="${i}" ${!t?'disabled':''}>${t?`<i class="token ${colorClass(t)}"><span>${t==='pearl'?'●':t==='gold'?'✦':'◆'}</span></i>`:''}</button>`).join("");document.querySelectorAll(".board-cell").forEach(b=>b.onclick=()=>boardClick(Number(b.dataset.index)));}
function boardClick(i){if(game.phase!=="action")return;if(mode==="privilege")return safe(()=>G.usePrivilege(game,i));if(mode!=="take")return;const at=game.selected.indexOf(i);if(at>=0)game.selected.splice(at,1);else if(game.selected.length<3)game.selected.push(i);render();}

function renderActions(){const p=game.players[game.current];let phase=game.phase==="discard"?`筹码超过上限，请弃至 10 枚（当前 ${G.tokenTotal(p)}）`:mode==="take"?"从棋盘选择连续筹码":mode==="buy"?"选择一张可购买的卡牌":mode==="reserve"?"选择公开卡或牌库顶":mode==="privilege"?"选择任意非黄金筹码":"选择行动";$("#phaseText").textContent=phase;
  let buttons="";if(game.phase==="action")buttons=`<button data-mode="take" class="${mode==='take'?'active':''}">拿取筹码</button><button data-mode="buy" class="${mode==='buy'?'active':''}">购买卡牌</button><button data-mode="reserve" class="${mode==='reserve'?'active':''}">黄金并保留</button><button data-mode="privilege" ${p.privileges<1?'disabled':''} class="${mode==='privilege'?'active':''}">使用特权</button><button id="refill" ${!game.bag.length?'disabled':''}>补充棋盘</button>${mode==='take'?'<button id="confirmTake" class="primary">确认拿取</button>':''}`;$("#actionButtons").innerHTML=buttons;document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;game.selected=[];render();});if($("#confirmTake"))$("#confirmTake").onclick=()=>safe(()=>G.takeTokens(game,[...game.selected]));if($("#refill"))$("#refill").onclick=()=>safe(()=>G.refillBoard(game));}
function renderLog(){$("#gameLog").innerHTML=game.log.slice(-8).reverse().map(x=>`<li>${x}</li>`).join("");}
function safe(fn){try{fn();mode="take";game.selected=[];render();}catch(e){toast(e.message);render();}}
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200);}

function handlePending(){if(game.pending==="steal")showChoice("夺取一枚筹码",G.TOKEN_TYPES.filter(t=>t!=="gold"&&game.players[1-game.current].tokens[t]>0).map(t=>({label:`${G.LABELS[t]} ×${game.players[1-game.current].tokens[t]}`,action:()=>safe(()=>G.stealToken(game,t))})));if(game.pending==="royal")showChoice("选择一位王室成员",game.royals.map(r=>({label:`${r.name} · ${r.points} 声望${r.ability?' · '+abilityLabel[r.ability]:''}`,action:()=>safe(()=>G.chooseRoyal(game,r.id))})));}
function chooseColor(id){showChoice("为百搭卡选择一种奖励颜色",G.COLORS.map(c=>({label:G.LABELS[c],class:colorClass(c),action:()=>safe(()=>G.buyCard(game,id,c))})));}
function showChoice(title,choices,onClose=null){$("#modalContent").innerHTML=`<h2>${title}</h2><div class="choice-grid">${choices.length?choices.map((c,i)=>`<button data-choice="${i}" class="${c.class||''}">${c.label}</button>`).join(""):"<p>没有可选择的目标，效果忽略。</p><button data-empty>继续</button>"}</div>`;$("#modal").classList.remove("hidden");$("#modalClose").style.display=onClose?'block':'none';choices.forEach((c,i)=>document.querySelector(`[data-choice="${i}"]`).onclick=()=>{hideModal();c.action();});if(document.querySelector("[data-empty]"))document.querySelector("[data-empty]").onclick=()=>{hideModal();safe(()=>G.skipPending(game));};$("#modalClose").onclick=()=>{hideModal();if(onClose)onClose();};}
function hideModal(){$("#modal").classList.add("hidden");}
function showWinner(){const p=game.players[game.winner.player];showChoice(`${p.name} 获胜！`,[{label:`${game.winner.reason} · 再来一局`,action:restart}]);}
function restart(){game=G.createGame();mode="take";hideModal();render();}

$("#restartBtn").onclick=()=>{if(confirm("确定重新开始当前对局吗？"))restart();};
$("#rulesBtn").onclick=()=>showChoice("快速规则",[{label:"知道了",action:()=>{}}]);
$("#rulesBtn").addEventListener("click",()=>{$("#modalContent").innerHTML=`<h2>快速规则</h2><div class="rules"><p>每回合可先使用特权、补充棋盘，再执行一项主要行动。</p><ul><li>拿取同一直线上连续的 1–3 枚非黄金筹码。</li><li>拿黄金并保留一张卡（最多保留 3 张）。</li><li>支付筹码购买卡牌，已购卡提供永久折扣。</li></ul><p>率先达到总声望 20、单色声望 10 或王冠 10 即获胜。回合结束最多持有 10 枚筹码。</p></div>`;$("#modalClose").style.display="block";$("#modalClose").onclick=hideModal;});
render();
