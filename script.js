const canvas = document.querySelector("#popnhop");
const btnRollDice = document.querySelector("#rolldice");
const btnSpawn = document.querySelector("#spawn");
const context = canvas.getContext("2d");

const SMALL_CIRCLE_RADIUS = 35;
const LARGE_CIRCLE_RADIUS = 500 - SMALL_CIRCLE_RADIUS;
const CENTER_X = 512;
const CENTER_Y = 512;
const CIRCLE_SPACING = (LARGE_CIRCLE_RADIUS - 9*SMALL_CIRCLE_RADIUS)/5;

// Speed of token animation in spaces/s
const TOKEN_SPEED = 6;

// Indexed by the player ID
const colors = [ "red", "green", "blue", "yellow" ];
var names = [ "Red", "Green", "Blue", "Yellow" ];

// List of board spaces.
var circles = [];

// List of tokens currently in play.
var tokens = [];

// List of possible moves in current turn.
var moves = [];

// Dice roll, not null if action is possible.
var dice = null;

// Player ID of current player.
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

async function onMouseClick(event) {
	// Exit early if an action is not possible.
	if(dice == null) return;
	var x = event.x;
	var y = event.y;

	var t = findToken(x, y);
	if(t && canMove(t)) {
		await performAction({type:"move", token:t});
	}
}

function onMouseMove(event) {
	// Exit early if an action is not possible.
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
	// Tokens are drawn iterating forwards, which means last tokens are drawn on top, we iterate backwards here so that the token found is the one that is drawn on top.
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
		/* Physical offset is a location on the outer ring (between 0-27 and runs clockwise, starting at 3 o'clock 0_0).
		   Logical offset describes the offset of the token relative to its spawn point.
		   Logical offsets 28-31 describe the final 4 positions a token can be on (which aren't located on the outer ring) */
		this.logicalOffset = logicalOffset;
		this.ghost = false;
		this.checkValidity();
	}

	physicalOffset() {
		this.checkValidity();
		return (this.logicalOffset + this.playerId*7)%28;
	}

	draw() {
		this.checkValidity();
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
		this.checkValidity();
		if(this.logicalOffset <= 27) {
			// This logical offset is on the outer ring.
			return borderPosition(this.physicalOffset());
		} else if(this.logicalOffset <= 28) {
			// Moving between outer ring and final row.
			var startPos = borderPosition((27 + this.playerId*7)%28);
			var endPos = finalRowPosition(this.playerId, 28);
			var t = this.logicalOffset - 27;
			var offsetX = endPos.x - startPos.x;
			var offsetY = endPos.y - startPos.y;

			var x = startPos.x + offsetX*t;
			var y = startPos.y + offsetY*t;

			return new Position(x, y);
		} else {
			// This logical offset is on the final row.
			return finalRowPosition(this.playerId, this.logicalOffset);
		}
	}

	checkValidity() {
		if(0 > this.logicalOffset && this.logicalOffset > 31) {
			throw new Error(`Logical offset outside bounds (offset: ${this.logicalOffset})`);
		}
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

function finalRowPosition(playerID, logicalOffset) {
	// This logical offset is on the final row.
	var angle = playerID*7*Math.PI/14;
	var d = CIRCLE_SPACING + SMALL_CIRCLE_RADIUS + (31 - logicalOffset)*(CIRCLE_SPACING + 2*SMALL_CIRCLE_RADIUS);
	var x = CENTER_X + d*Math.cos(angle);
	var y = CENTER_Y + d*Math.sin(angle);

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

// If there are no remaining actions possible, move onto the next player's turn. If last roll was a 6 current player gets another turn.
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
	handleDiceRoll(Math.floor(6*Math.random()) + 1);
}

function handleDiceRoll(roll) {
	dice = roll;
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

async function performAction(action) {
	switch(action.type) {
		case "spawn":
			t = new Token(currentTurn, 0);
			tokens.push(t);
		break;
		case "move":
			t = action.token;
			await moveToken(t);
		break;
	}

	// Check if token has landed on another player's token, if so, remove that token from play.
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

	var safeTokens = 0;
	for(var token of tokens) {
		if(token.playerId == currentTurn && token.logicalOffset > 27) {
			safeTokens++;
		}
	}

	if(safeTokens == 4) {
		endGame();
	} else {
		nextTurn();
	}
}

// Check if there is already a token in the spawn location (logical offset 0) that is owned by the current player and if all the player's tokens are on the board already, if so a token cannot be spawned.
function canSpawn() {
	if(dice != 6 || tokenCount > 3) { return false; }
	for(var token of tokens) {
		if(token.playerId == currentTurn && token.logicalOffset == 0) { return false; }
	}
	return true;
}

// Count how many tokens the current player has on the board.
function tokenCount() {
	var tokenCount = 0;
	for(var token of tokens) {
		if(token.playerId == currentTurn) {
			tokenCount++;
		}
	}
	return tokenCount;
}

// Check if token t can move by the current dice roll.
function canMove(t) {
	if(t.playerId != currentTurn || t.logicalOffset + dice > 31) { return false; }
	for(var token of tokens) {
		if(token.playerId == currentTurn && t.logicalOffset + dice == token.logicalOffset) { return false; }
	}
	return true;
}

function init() {
	// Add circles to the outer ring.
	for(var i = 0; i < 28; i++) {
		var p = borderPosition(i);

		circles.push(new Circle(p));
	}

	// Add circles to the final rows.
	for(i = 0; i < 4; i++) {
		var d = CIRCLE_SPACING + SMALL_CIRCLE_RADIUS + i*(CIRCLE_SPACING + 2*SMALL_CIRCLE_RADIUS);

		circles.push(new Circle(new Position(CENTER_X + d, CENTER_Y), colors[0]));
		circles.push(new Circle(new Position(CENTER_X, CENTER_Y + d), colors[1]));
		circles.push(new Circle(new Position(CENTER_X - d, CENTER_Y), colors[2]));
		circles.push(new Circle(new Position(CENTER_X, CENTER_Y - d), colors[3]));
	}

	log(`${names[currentTurn]} goes first. Roll the dice!`);
}

async function moveToken(token) {
	var endOffset = token.logicalOffset + dice;

	while(token.logicalOffset < endOffset) {
		drawGameState();
		token.logicalOffset += TOKEN_SPEED*0.01;
		await delay(10);
	}

	token.logicalOffset = endOffset;
	drawGameState();
}

function endGame() {
	drawGameState();
	log(`${names[currentTurn]} just won the fuckin game, RESPECT!`);
	dice = null;
}

function cheat(diceRoll) {
	log(`${names[currentTurn]} casts a magic spell on the dice as it rolls!`);
	handleDiceRoll(diceRoll);
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

drawGameState();