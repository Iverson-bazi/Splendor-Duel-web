import test from "node:test";
import assert from "node:assert/strict";
import "./game-engine.js";
const { createGame,isLineSelection,takeTokens,tokenTotal,bonuses,paymentPlan,refillBoard } = globalThis.G;

test("只接受最多三个连续直线坐标",()=>{
  assert.equal(isLineSelection([0,1,2]),true);assert.equal(isLineSelection([0,5,10]),true);assert.equal(isLineSelection([0,6,12]),true);
  assert.equal(isLineSelection([0,2]),false);assert.equal(isLineSelection([0,1,7]),false);assert.equal(isLineSelection([0,1,2,3]),false);
});
test("拿筹码会清空棋盘格并转移回合",()=>{
  const g=createGame(()=>.01);g.current=0;g.board=["red","blue",...Array(23).fill(null)];takeTokens(g,[0,1]);assert.equal(g.players[0].tokens.red,1);assert.equal(g.board[0],null);assert.equal(g.current,1);
});
test("折扣与黄金共同完成支付",()=>{
  const g=createGame(()=>.2),p=g.players[0];p.cards.push({color:"red",bonus:2,points:0,crowns:0});p.tokens.red=1;p.tokens.gold=1;
  assert.deepEqual(bonuses(p).red,2);assert.deepEqual(paymentPlan(p,{cost:{red:4}}),{red:1,gold:1});assert.equal(tokenTotal(p),2);
});
test("补充棋盘从中央空格开始",()=>{
  const g=createGame(()=>.3);g.board=Array(25).fill(null);g.bag=["red","blue"];refillBoard(g,()=>.5);
  assert.notEqual(g.board[12],null);assert.notEqual(g.board[11],null);assert.equal(g.board[0],null);
});
