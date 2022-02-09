const canvas = document.querySelector("#popnhop");
const btnRollDice = document.querySelector("#rolldice");
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

var dice = null;
var currentTurn = 0;

addEventListener("click", onMouseClick);
addEventListener("mousemove", onMouseMove);
btnRollDice.addEventListener("click", rollDice);

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
	if(t && t.playerId == currentTurn) {
		if(t.logicalOffset+dice <=31) {
			t.logicalOffset+=dice;
			drawGameState();
			dice = null;
			setTimeout(function() {
				currentTurn = (currentTurn + 1)%4;
				log(`It is now ${names[currentTurn]}'s turn. Roll the dice!`);
				btnRollDice.disabled = false;
				drawGameState();
			}, 1500);
		}
	}
}

function onMouseMove(event) {
	if(dice == null) return;
	var x = event.x;
	var y = event.y;
	
	drawGameState();
	
	var t = findToken(x, y);
	if(t) {
		if(t.logicalOffset+dice <=31) {
			var preview = new Token(t.playerId, t.logicalOffset+dice);
			preview.ghost = true;
			preview.draw();
		}
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
		return this.logicalOffset + this.playerId*7;
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

function rollDice() {
	dice = Math.floor(6*Math.random()) + 1;
	log("Dice roll: " + dice);
	btnRollDice.disabled = true;
}

function init() {		
	for(var i = 0; i < 28; i++) {
		var p = borderPosition(i);
		
		circles.push(p);
	}

	for(i = 0; i < 4; i++) {
		var d = k + SMALL_CIRCLE_RADIUS + i*(k + 2*SMALL_CIRCLE_RADIUS);
		
		circles.push(new Position(CENTER_X, CENTER_Y - d));	
		circles.push(new Position(CENTER_X + d, CENTER_Y));	
		circles.push(new Position(CENTER_X, CENTER_Y + d));	
		circles.push(new Position(CENTER_X - d, CENTER_Y));	
	}	
	
	tokens = [
		new Token(0, 0),
		new Token(1, 0),
		new Token(2, 0),
		new Token(3, 0)
	];

	log(`${names[currentTurn]} goes first. Roll the dice!`);
}

function drawGameState() {
	context.clearRect(0, 0, 1024, 1024);
	
	for(var circle of circles) {
		drawSmallCircle(circle.x, circle.y);
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