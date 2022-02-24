const canvas = document.querySelector("#popnhop");
const btnRollDice = document.querySelector("#rolldice");
const btnSpawn = document.querySelector("#spawn");
const context = canvas.getContext("2d");

const SMALL_CIRCLE_RADIUS = 35;
const LARGE_CIRCLE_RADIUS = 500 - SMALL_CIRCLE_RADIUS;
const CENTER_X = 512;
const CENTER_Y = 512;
const k = (LARGE_CIRCLE_RADIUS - 9*SMALL_CIRCLE_RADIUS)/5;
const colors = [ "red", "green", "blue", "yellow" ];

var names = [ "Red", "Green", "Blue", "Yellow" ];
var circles = [];
var tokens = [];
var moves = [];

var dice = null;
var currentTurn = 0;

addEventListener("click", onMouseClick);
addEventListener("mousemove", onMouseMove);
btnRollDice.addEventListener("click", rollDice);
btnSpawn.addEventListener("click", function() { performAction({type:"spawn"}); });

function log(text) {
	var textbox = document.querySelector("#prenhop");
	textbox.innerText += text + "\n";
	textbox.scrollTo(0, textbox.scrollHeight);
}

function onMouseClick(event) {
	if(dice == null) return;
	var x = event.x;
	var y = event.y;

	var t = findToken(x, y);
	if(t && canMove(t)) {
		performAction({type:"move", token:t});
	}
}

function onMouseMove(event) {
	if(dice == null) return;
	var x = event.x;
	var y = event.y;

	drawGameState();

	var t = findToken(x, y);
	if(t && canMove(t)) {
		var preview = new Token(t.playerId, t.logicalOffset+dice);
		preview.ghost = true;
		preview.draw();
	}
}

function findToken(x, y) {
	for(var i = tokens.length - 1; i >= 0; i--) {
		var p = tokens[i].position();
		if((p.x-x)**2 + (p.y-y)**2 <= SMALL_CIRCLE_RADIUS**2) {
			return tokens[i];
			break;
		}
	}
}

class Token {
	constructor(playerId, logicalOffset){
		this.playerId = playerId;
		this.logicalOffset = logicalOffset;
		this.ghost = false;
		if(!this.isValid()) { throw new Error("balls"); }
	}

	physicalOffset() {
		if(!this.isValid()) { throw new Error("balls"); }
		return (this.logicalOffset + this.playerId*7)%28;
	}

	draw() {
		if(!this.isValid()) { throw new Error("balls"); }
		context.beginPath();
		context.arc(this.position().x, this.position().y, SMALL_CIRCLE_RADIUS, 0, 2*Math.PI);
		context.closePath();
		context.fillStyle = colors[this.playerId];
		if(this.ghost || currentTurn != this.playerId) {
			context.globalAlpha = 0.2;
		}
		context.fill();
		context.globalAlpha = 1;
	}

	position() {
		if(!this.isValid()) { throw new Error("balls"); }
		if(this.logicalOffset < 28) {
			return borderPosition(this.physicalOffset());
		} else {
			var angle = this.playerId*7*Math.PI/14;
			var d = k + SMALL_CIRCLE_RADIUS + (31 - this.logicalOffset)*(k + 2*SMALL_CIRCLE_RADIUS);
			var x = CENTER_X + d*Math.cos(angle);
			var y = CENTER_Y + d*Math.sin(angle);

			return new Position(x, y);
		}
	}

	isValid() {
		return 0 <= this.logicalOffset && this.logicalOffset <= 31;
	}
}

class Circle {
	constructor(position, style = "black") {
		this.position = position;
		this.style = style;
	}

	draw() {
		context.strokeStyle = this.style;
		context.lineWidth = 2;
		drawSmallCircle(this.position.x, this.position.y);
	}
}

class Position {
	constructor(x, y){
		this.x = x;
		this.y = y;
	}
}

function borderPosition(physicalOffset) {
	var theta = Math.PI/28 + physicalOffset*Math.PI/14;
	var x = CENTER_X + LARGE_CIRCLE_RADIUS*Math.cos(theta);
	var y = CENTER_Y + LARGE_CIRCLE_RADIUS*Math.sin(theta);

	return new Position(x, y);
}

function drawSmallCircle(x, y) {
	context.beginPath();
	context.arc(x, y, SMALL_CIRCLE_RADIUS, 0, 2*Math.PI);
	context.closePath();
	context.stroke();
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function nextTurn() {
	var secondTurn = false;
	if(dice == 6) { secondTurn = true; }
	dice = null;
	btnSpawn.disabled = true;
	drawGameState();

	await delay(1500);
	
	if(!secondTurn) {
		currentTurn = (currentTurn + 1)%4;
		log(`It is now ${names[currentTurn]}'s turn. Roll the dice!`);
	} else {
		log(`${names[currentTurn]} rolled a 6! Roll again!`);
	}
	
	btnRollDice.disabled = false;
	drawGameState();
}

function rollDice() {
	dice = Math.floor(6*Math.random()) + 1;
	log(`${names[currentTurn]} rolled a ${dice}.`);
	btnRollDice.disabled = true;

	moves = [];

	if(canSpawn()) { moves.push({type: 'spawn'}); btnSpawn.disabled = false; } else { btnSpawn.disabled = true; }
	for(var token of tokens) {
		if(canMove(token)) { moves.push({type: 'move', token}); }
	}

	if(moves.length == 0) {
		nextTurn();
	} else if(moves.length == 1) {
		//performAction(moves[0]);
	}
}

function performAction(action) {
	switch(action.type) {
		case "spawn":
			t = new Token(currentTurn, 0);
			tokens.push(t);
		break;
		case "move":
			t = action.token;
			t.logicalOffset += dice;
		break;
	}

	if(t.logicalOffset < 28) {
		for(var i = 0; i < tokens.length; i++) {
			if(tokens[i] == t) { continue; }
			if(tokens[i].logicalOffset < 28) {
				if(tokens[i].physicalOffset() == t.physicalOffset()) {
					log(`${names[currentTurn]} just took out ${names[tokens[i].playerId]}'s token, nice!`);
					tokens.splice(i, 1);
					break;
				}
			}
		}
	}
	
	nextTurn();
}

function canSpawn() {
	if(dice != 6) { return false; }
	for(var token of tokens) {
		if(token.playerId == currentTurn && token.logicalOffset == 0) { return false; }
	}
	return true;
}

function canMove(t) {
	if(t.playerId != currentTurn || t.logicalOffset + dice > 31) { return false; }
	for(var token of tokens) {
		if(token.playerId == currentTurn && t.logicalOffset + dice == token.logicalOffset) { return false; }
	}
	return true;
}

function init() {
	for(var i = 0; i < 28; i++) {
		var p = borderPosition(i);

		circles.push(new Circle(p));
	}

	for(i = 0; i < 4; i++) {
		var d = k + SMALL_CIRCLE_RADIUS + i*(k + 2*SMALL_CIRCLE_RADIUS);

		circles.push(new Circle(new Position(CENTER_X + d, CENTER_Y), colors[0]));
		circles.push(new Circle(new Position(CENTER_X, CENTER_Y + d), colors[1]));
		circles.push(new Circle(new Position(CENTER_X - d, CENTER_Y), colors[2]));
		circles.push(new Circle(new Position(CENTER_X, CENTER_Y - d), colors[3]));
	}

	log(`${names[currentTurn]} goes first. Roll the dice!`);
}

function drawGameState() {
	context.clearRect(0, 0, 1024, 1024);

	for(var circle of circles) {
		circle.draw();
	}

	for(var token of tokens) {
		token.draw();
	}
}

init();

//setInterval(() => {
	drawGameState();
	/*redToken.logicalOffset = (redToken.logicalOffset+1)%32;
	yellowToken.logicalOffset = (yellowToken.logicalOffset+1)%32;
	greenToken.logicalOffset = (greenToken.logicalOffset+1)%32;
	blueToken.logicalOffset = (blueToken.logicalOffset+1)%32;*/
//}, 100);