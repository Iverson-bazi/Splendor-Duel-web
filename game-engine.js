const COLORS = ["white", "blue", "green", "red", "black"];
const TOKEN_TYPES = [...COLORS, "pearl", "gold"];
const LABELS = { white:"钻石", blue:"蓝晶", green:"翡翠", red:"红宝", black:"黑曜", pearl:"珍珠", gold:"黄金" };

const abilityCycle = [null, "privilege", "takeColor", null, "steal", null, "extraTurn", null, "wild"];
const SPIRAL_ORDER = [12,11,6,7,8,13,18,17,16,15,10,5,0,1,2,3,4,9,14,19,24,23,22,21,20];

function makeCards() {
  const cards = [];
  const levelCounts = { 1: 25, 2: 20, 3: 15 };
  for (const level of [1, 2, 3]) {
    for (let i = 0; i < levelCounts[level]; i++) {
      const color = COLORS[i % 5];
      const others = COLORS.filter(c => c !== color);
      const cost = {};
      if (level === 1) {
        cost[others[i % 4]] = 1 + (i % 2);
        cost[others[(i + 1) % 4]] = 1 + ((i + 1) % 2);
        if (i % 5 === 0) cost.pearl = 1;
      } else if (level === 2) {
        cost[others[i % 4]] = 3 + (i % 2);
        cost[others[(i + 2) % 4]] = 2;
        if (i % 4 === 0) cost.pearl = 1;
      } else {
        cost[others[i % 4]] = 5 + (i % 2);
        cost[others[(i + 1) % 4]] = 3;
        cost[others[(i + 2) % 4]] = 2;
        if (i % 3 === 0) cost.pearl = 1;
      }
      const ability = abilityCycle[(i + level * 2) % abilityCycle.length];
      const crowns = level === 3 ? 1 + (i % 7 === 0 ? 1 : 0) : (level === 2 && i % 6 === 0 ? 1 : 0);
      const points = level === 1 ? (i % 5 === 4 ? 1 : 0) : level === 2 ? 2 + (i % 3) : 4 + (i % 3);
      cards.push({ id:`L${level}-${i+1}`, level, color: ability === "wild" ? "wild" : color, cost, points, crowns, ability, bonus: ability === "wild" ? 1 : (i % 8 === 0 ? 2 : 1) });
    }
  }
  return cards;
}

const ROYALS = [
  { id:"R1", name:"晨曦女爵", points:3, ability:null },
  { id:"R2", name:"翡翠亲王", points:2, ability:"privilege" },
  { id:"R3", name:"猩红公爵", points:2, ability:"extraTurn" },
  { id:"R4", name:"珍珠皇后", points:3, ability:null }
];

function shuffled(array, rng=Math.random) {
  const a = [...array];
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function createGame(rng=Math.random) {
  const cards = makeCards();
  const decks = { 1:shuffled(cards.filter(c=>c.level===1),rng), 2:shuffled(cards.filter(c=>c.level===2),rng), 3:shuffled(cards.filter(c=>c.level===3),rng) };
  const market = { 1:decks[1].splice(0,5), 2:decks[2].splice(0,4), 3:decks[3].splice(0,3) };
  const tokens = shuffled([...COLORS.flatMap(c=>Array(4).fill(c)),"pearl","pearl","gold","gold","gold"],rng);
  return {
    players:[newPlayer("玩家一"),newPlayer("玩家二")], current:Math.floor(rng()*2),
    board:tokens, bag:[], decks, market, privilegeBank:2, royals:shuffled(ROYALS,rng),
    phase:"action", selected:[], log:["对局开始"], extraTurn:false, winner:null, pending:null, pendingNext:null
  };
}

function newPlayer(name) { return { name, tokens:Object.fromEntries(TOKEN_TYPES.map(t=>[t,0])), cards:[], reserved:[], privileges:0, claimedRoyalAt:[] }; }
const tokenTotal = p => TOKEN_TYPES.reduce((n,t)=>n+p.tokens[t],0);
const bonuses = p => p.cards.reduce((a,c)=>{ const color=c.assignedColor||c.color; if(COLORS.includes(color)) a[color]=(a[color]||0)+c.bonus; return a; },Object.fromEntries(COLORS.map(c=>[c,0])));
const prestige = p => p.cards.reduce((n,c)=>n+c.points,0);
const crowns = p => p.cards.reduce((n,c)=>n+c.crowns,0);
function colorPrestige(p) { return p.cards.reduce((a,c)=>{ const color=c.assignedColor||c.color; if(COLORS.includes(color)) a[color]=(a[color]||0)+c.points; return a; },Object.fromEntries(COLORS.map(c=>[c,0]))); }

function isLineSelection(indices) {
  if (!indices.length || indices.length>3 || new Set(indices).size!==indices.length) return false;
  const pts=indices.map(i=>[Math.floor(i/5),i%5]);
  if (pts.length===1) return true;
  const dr=Math.sign(pts[1][0]-pts[0][0]), dc=Math.sign(pts[1][1]-pts[0][1]);
  if ((!dr&&!dc) || (dr!==0&&dc!==0&&Math.abs(pts[1][0]-pts[0][0])!==Math.abs(pts[1][1]-pts[0][1]))) return false;
  const sorted=[...pts].sort((a,b)=>(a[0]*dr+a[1]*dc)-(b[0]*dr+b[1]*dc));
  for(let i=1;i<sorted.length;i++) if(sorted[i][0]-sorted[i-1][0]!==dr || sorted[i][1]-sorted[i-1][1]!==dc) return false;
  return true;
}

function takeTokens(game, indices) {
  if (!isLineSelection(indices)) throw Error("筹码必须是相邻的直线");
  const picked=indices.map(i=>game.board[i]);
  if (picked.some(t=>!t||t==="gold")) throw Error("不能选择空格或黄金");
  const p=game.players[game.current]; picked.forEach((t,k)=>{ p.tokens[t]++; game.board[indices[k]]=null; });
  if ((picked.length===3&&new Set(picked).size===1)||(picked.filter(t=>t==="pearl").length===2)) grantPrivilege(game,1-game.current);
  game.log.push(`${p.name}拿取了${picked.map(t=>LABELS[t]).join("、")}`); finishAction(game);
}

function grantPrivilege(game, playerIndex) {
  const p=game.players[playerIndex];
  if(game.privilegeBank>0){game.privilegeBank--;p.privileges++;}
  else {const o=game.players[1-playerIndex];if(o.privileges>0){o.privileges--;p.privileges++;}}
}

function usePrivilege(game,index) {
  const p=game.players[game.current], token=game.board[index];
  if(p.privileges<1||!token||token==="gold") throw Error("不能这样使用特权");
  p.privileges--;game.privilegeBank++;p.tokens[token]++;game.board[index]=null;game.log.push(`${p.name}使用特权拿取${LABELS[token]}`);
}

function refillBoard(game,rng=Math.random) {
  if(!game.bag.length) throw Error("袋中没有筹码");
  game.bag=shuffled(game.bag,rng); for(const i of SPIRAL_ORDER) if(!game.board[i]&&game.bag.length) game.board[i]=game.bag.pop();
  grantPrivilege(game,1-game.current);game.log.push(`${game.players[game.current].name}补充了棋盘`);
}

function canAfford(game,card) { return paymentPlan(game.players[game.current],card)!==null; }
function paymentPlan(p,card) {
  const b=bonuses(p), pay={}, missing=[]; let gold=p.tokens.gold;
  for(const [c,n] of Object.entries(card.cost)){const need=Math.max(0,n-(b[c]||0)), own=Math.min(need,p.tokens[c]||0);pay[c]=own;missing.push(...Array(need-own).fill(c));}
  if(missing.length>gold)return null;pay.gold=missing.length;return pay;
}

function replenishCard(game,level){if(game.decks[level].length)game.market[level].push(game.decks[level].shift());}
function reserveCard(game,cardId) {
  const p=game.players[game.current], goldIndex=game.board.findIndex(t=>t==="gold");
  if(p.reserved.length>=3||goldIndex<0)throw Error("无法保留卡牌");
  let card, fromMarket=false; for(const level of [1,2,3]){const i=game.market[level].findIndex(c=>c.id===cardId);if(i>=0){card=game.market[level].splice(i,1)[0];replenishCard(game,level);fromMarket=true;break;}}
  if(!card){const level=Number(String(cardId).replace("deck-",""));card=game.decks[level]?.shift();}
  if(!card)throw Error("未找到卡牌");p.tokens.gold++;game.board[goldIndex]=null;p.reserved.push(card);game.log.push(`${p.name}获得黄金并保留了${fromMarket?"一张公开卡":"一张暗牌"}`);finishAction(game);
}

function buyCard(game,cardId,assignedColor=null) {
  const p=game.players[game.current]; let card, location;
  for(const level of [1,2,3]){const i=game.market[level].findIndex(c=>c.id===cardId);if(i>=0){card=game.market[level].splice(i,1)[0];location={level};break;}}
  if(!card){const i=p.reserved.findIndex(c=>c.id===cardId);if(i>=0)card=p.reserved.splice(i,1)[0];}
  if(!card)throw Error("未找到卡牌");
  if(card.color==="wild"&&!COLORS.includes(assignedColor)){restore();throw Error("请选择百搭卡的颜色");}
  const pay=paymentPlan(p,card);if(!pay){restore();throw Error("筹码不足");}
  Object.entries(pay).forEach(([t,n])=>{p.tokens[t]-=n;game.bag.push(...Array(n).fill(t));});
  if(assignedColor)card.assignedColor=assignedColor;p.cards.push(card);if(location)replenishCard(game,location.level);
  game.log.push(`${p.name}购买卡牌，获得 ${card.points} 声望`);resolveAbility(game,card);checkRoyal(game);finishAction(game);
  function restore(){if(location)game.market[location.level].push(card);else if(card)p.reserved.push(card);}
}

function resolveAbility(game,card){const p=game.players[game.current];if(card.ability==="privilege")grantPrivilege(game,game.current);if(card.ability==="extraTurn")game.extraTurn=true;if(card.ability==="takeColor"){const color=card.assignedColor||card.color,i=game.board.findIndex(t=>t===color);if(i>=0){game.board[i]=null;p.tokens[color]++;}}if(card.ability==="steal")game.pending="steal";}
function checkRoyal(game){const p=game.players[game.current],n=crowns(p);for(const threshold of [3,6])if(n>=threshold&&!p.claimedRoyalAt.includes(threshold)&&game.royals.length){p.claimedRoyalAt.push(threshold);if(game.pending)game.pendingNext="royal";else game.pending="royal";break;}}
function advancePending(game){game.pending=game.pendingNext;game.pendingNext=null;completeTurn(game);}
function skipPending(game){advancePending(game);}
function chooseRoyal(game,id){const i=game.royals.findIndex(r=>r.id===id);if(i<0)throw Error("王室卡不可用");const r=game.royals.splice(i,1)[0];game.players[game.current].cards.push({...r,color:"royal",bonus:0,crowns:0,cost:{}});game.pending=null;resolveAbility(game,r);if(game.pending)completeTurn(game);else advancePending(game);}
function stealToken(game,type){const o=game.players[1-game.current],p=game.players[game.current];if(!COLORS.includes(type)&&type!=="pearl"||o.tokens[type]<1)throw Error("不能夺取该筹码");o.tokens[type]--;p.tokens[type]++;advancePending(game);}

function finishAction(game){game.phase="ending";completeTurn(game);}
function completeTurn(game){if(game.pending)return;const p=game.players[game.current];if(tokenTotal(p)>10){game.phase="discard";return;}const win=checkWinner(p);if(win){game.winner={player:game.current,reason:win};game.phase="gameover";return;}if(game.extraTurn){game.extraTurn=false;game.phase="action";game.log.push(`${p.name}获得额外回合`);}else{game.current=1-game.current;game.phase="action";}}
function discardToken(game,type){const p=game.players[game.current];if(p.tokens[type]<1)throw Error("没有该筹码");p.tokens[type]--;game.bag.push(type);if(tokenTotal(p)<=10)completeTurn(game);}
function checkWinner(p){if(prestige(p)>=20)return"总声望达到 20";if(crowns(p)>=10)return"王冠达到 10";if(Math.max(...Object.values(colorPrestige(p)))>=10)return"单色声望达到 10";return null;}

globalThis.G = { COLORS,TOKEN_TYPES,LABELS,createGame,tokenTotal,bonuses,prestige,crowns,colorPrestige,isLineSelection,takeTokens,grantPrivilege,usePrivilege,refillBoard,canAfford,paymentPlan,reserveCard,buyCard,skipPending,chooseRoyal,stealToken,discardToken };
