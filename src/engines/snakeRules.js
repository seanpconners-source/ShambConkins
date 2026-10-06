function queueSnakeTurn(snake,dx,dy){
 if(Math.abs(dx)+Math.abs(dy)!==1)return false;
 snake.turns ||= [];const last=snake.turns.at(-1)||snake.dir;
 if(dx===last.x&&dy===last.y||dx===-last.x&&dy===-last.y||snake.turns.length>=2)return false;
 snake.turns.push({x:dx,y:dy});snake.next={...snake.turns[0]};return true;
}
function takeSnakeTurn(snake){snake.dir=snake.turns?.shift()||snake.dir;snake.next={...(snake.turns?.[0]||snake.dir)};return snake.dir;}
function resetSnakeTurns(snakes){for(const snake of snakes){snake.turns=[];snake.next={...snake.dir};}}

Object.assign(exports,{queueSnakeTurn,takeSnakeTurn,resetSnakeTurns});