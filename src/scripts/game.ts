interface IInput {
	mousePosition: IPos;
	isMouseDown: boolean;

	arrowLeft: boolean;
	arrowUp: boolean;
	arrowRight: boolean;
	arrowDown: boolean;
}

interface IPos {
	x: number;
	y: number;
}

interface IBullet {
	position: IPos;
	origin: IPos;
	angle: number;
	speed: number;
}

interface IPlayer {
	position: IPos;
	speed: number;
}

enum GameState {
	Menu,
	Running,
	EndGame,
	Credits
};

class Enemy {
	type: number;
	angle: number;
	rotatingSpeed: number;
	rotatingClockWise: boolean;
	growing: boolean;
	size: number;

	constructor(public position: IPos, public speed: number) {
		this.type = Math.floor(Math.random() * 3);
		this.angle = 0;
		this.rotatingSpeed = Math.random() * 0.007;
		this.rotatingClockWise = Math.random() < 0.5 ? true : false;
		this.growing = true;
		this.size = 10;
	}

	drawPath(context: CanvasRenderingContext2D, period: number): void {
		var x: number = this.position.x,
			y: number = this.position.y;

		if (this.type === 1) {
			context.strokeStyle = "#b84eb8";
			context.beginPath();
			context.moveTo(x + 10, y);
			context.lineTo(x, y - 20);
			context.lineTo(x - 10, y);
			context.lineTo(x, y + 20);
			context.closePath();
			context.stroke();
		} else if (this.type === 2) {
			// rotating cube

			if (this.rotatingClockWise) {
				this.angle += period * this.rotatingSpeed;
			} else {
				this.angle -= period * this.rotatingSpeed;
			}
			if (this.angle > 2 * Math.PI) { this.angle = 0; }

			context.strokeStyle = "#abb4e5";
			context.save();
			context.translate(x, y);
			context.rotate(this.angle);
			context.translate(-x, -y);

			context.beginPath();
			context.moveTo(x - 15, y - 15);
			context.lineTo(x - 15, y + 15);
			context.lineTo(x + 15, y + 15);
			context.lineTo(x + 15, y - 15);
			context.lineTo(x - 15, y - 15);
			context.lineTo(x + 15, y + 15);
			context.moveTo(x - 15, y + 15);
			context.lineTo(x + 15, y - 15);
			context.closePath();
			context.stroke();

			context.restore();
		} else {
			// growing Circle
			if (this.growing) {
				this.size += period * 0.01;
				if (this.size >= 20) {
					this.size = 20;
					this.growing = false;
				}
			} else {
				this.size -= period * 0.1;
				if (this.size <= 10) {
					this.size = 10;
					this.growing = true;
				}
			}

			context.strokeStyle = "#9a8ed6";
			context.beginPath();
			context.arc(x, y, this.size, 0, 2 * Math.PI);
			context.closePath();
			context.stroke();
		}
	}
}

class Game {
	private context: CanvasRenderingContext2D;
	private player: IPlayer;
	private lastShot: number;
	private rateOfFire: number;
	private bullets: Array<IBullet>;
	private lastFrameTime: number;
	private enemies: Array<Enemy>;
	private lastEnemySpawn: number;
	private baseEnemySpeed: number;
	private spawnRate: number;
	private score: number;
	private lives: number;
	private state: GameState;
	private startGameTime: number;
	private mouseWasUp: boolean; // prevents people from flying through the menus
	private lastInput: IInput;
	private music: boolean;
	private musicGame: HTMLAudioElement;
	private audioMenuClick: HTMLAudioElement;
	private audioDead: HTMLAudioElement;

	constructor(public document: HTMLDocument, public canvas: HTMLCanvasElement) {
		this.context = this.canvas.getContext("2d");
		this.music = false;

		this.audioMenuClick = document.createElement("audio");
		this.audioMenuClick.src = "./media/click.mp3";

		this.audioDead = document.createElement("audio");
		this.audioDead.src = "./media/dead.mp3";

		this.musicGame = document.createElement("audio");
		this.musicGame.src = "./media/game.mp3";

		this.lastInput = {
			mousePosition: { x: 0, y: 0 },
			isMouseDown: false,
			arrowLeft: false,
			arrowUp: false,
			arrowRight: false,
			arrowDown: false
		};

		canvas.onmousemove = (e: MouseEvent): void => {
			var target: HTMLElement = <HTMLElement>e.currentTarget;

			this.lastInput.mousePosition = { x: (e.clientX - target.offsetLeft), y: (e.clientY - target.offsetTop) };
		};
		canvas.onmousedown = (): void => {
			this.lastInput.isMouseDown = true;
		};
		canvas.onmouseup = (): void => {
			this.lastInput.isMouseDown = false;
		};
		document.onkeydown = (e: KeyboardEvent): void => {
			switch (e.which) {
				case 37:
					this.lastInput.arrowLeft = true;
					break;
				case 38:
					this.lastInput.arrowUp = true;
					break;
				case 39:
					this.lastInput.arrowRight = true;
					break;
				case 40:
					this.lastInput.arrowDown = true;
					break;
			}
		};
		document.onkeyup = (e: KeyboardEvent): void => {
			switch (e.which) {
				case 37:
					this.lastInput.arrowLeft = false;
					break;
				case 38:
					this.lastInput.arrowUp = false;
					break;
				case 39:
					this.lastInput.arrowRight = false;
					break;
				case 40:
					this.lastInput.arrowDown = false;
					break;
			}
		};
	}

	private drawFrame(): void {
		if (!this.lastInput.isMouseDown) {
			this.mouseWasUp = true;
		}

		if (this.state === GameState.Menu) {
			this.drawGrid();
			this.drawMenu();
		} else if (this.state === GameState.Running) {
			this.setDifficulty();
			this.drawGrid();
			this.drawPlayer();
			this.shoot();
			this.drawAmmo();
			this.drawEnemies();
			this.drawScore();

			this.lastFrameTime = new Date().getTime();
		} else if (this.state === GameState.EndGame) {
			if (this.music) {
				this.musicGame.currentTime = 0;
				this.musicGame.pause();
			}
			this.drawGrid();
			this.drawEndScreen();
		} else if (this.state === GameState.Credits) {
			this.drawGrid();
			this.drawCredits();
		}

		requestAnimationFrame((): void => this.drawFrame());
	}

	private changeState(newState: GameState): void {
		this.mouseWasUp = false;
		this.state = newState;
	}

	private drawMenu(): void {
		var cursor: string = "default";

		this.context.globalAlpha = 1;
		this.context.font = "24px xirod, sans-serif";
		this.context.textBaseline = "middle";
		this.context.textAlign = "center";
		this.context.fillStyle = "#99ccff";

		this.context.fillText("GeoWars: The Revenge", this.canvas.width / 2, this.canvas.height * 1 / 4);

		// click to start
		var textWidth: number = this.context.measureText("Click to start").width;

		// check if mouse is over the text
		if (this.lastInput.mousePosition !== null &&
			this.lastInput.mousePosition.x > (this.canvas.width / 2 - textWidth / 2) &&
			this.lastInput.mousePosition.x < (this.canvas.width / 2 + textWidth / 2) &&
			this.lastInput.mousePosition.y > (this.canvas.height * 2 / 4 - 12) &&
			this.lastInput.mousePosition.y < (this.canvas.height * 2 / 4 + 12)) {
			this.context.fillStyle = "#ffffff";
			cursor = "pointer";
		} else {
			this.context.fillStyle = "#99ccff";
		}

		this.context.fillText("Click to start", this.canvas.width / 2, this.canvas.height * 2 / 4);

		if (this.context.fillStyle === "#ffffff" && this.lastInput.isMouseDown && this.mouseWasUp) {
			cursor = "crosshair";

			this.audioMenuClick.play();
			this.startGame();
		}

		// music on/off
		var musicText: string;

		if (this.music) {
			musicText = "music on";
		} else {
			musicText = "music off";
		}

		textWidth = this.context.measureText(musicText).width;

		// check if mouse is over the text
		if (this.lastInput.mousePosition !== null &&
			this.lastInput.mousePosition.x > (this.canvas.width / 2 - textWidth / 2) &&
			this.lastInput.mousePosition.x < (this.canvas.width / 2 + textWidth / 2) &&
			this.lastInput.mousePosition.y > (this.canvas.height * 3 / 4 - 12) &&
			this.lastInput.mousePosition.y < (this.canvas.height * 3 / 4 + 12)) {
			this.context.fillStyle = "#ffffff";
			cursor = "pointer";
		} else {
			this.context.fillStyle = "#99ccff";
		}

		this.context.fillText(musicText, this.canvas.width / 2, this.canvas.height * 3 / 4);

		if (this.context.fillStyle === "#ffffff" && this.lastInput.isMouseDown && this.mouseWasUp) {
			this.audioMenuClick.play();
			this.music = !this.music;
			this.mouseWasUp = false;
		}

		this.canvas.style.cursor = cursor;
	}

	private startGame(): void {
		this.player = { position: { x: this.canvas.width / 2, y: this.canvas.height / 2 }, speed: 0.25};
		this.rateOfFire = 100;

		this.score = 0;
		this.lives = 3;
		this.bullets = [];
		this.enemies = [];
		this.baseEnemySpeed = 0.08;
		this.spawnRate = 5500;
		if (this.music) {
			this.musicGame.play();
		}
		this.lastEnemySpawn = new Date().getTime();
		this.lastShot = new Date().getTime();
		this.startGameTime = new Date().getTime();
		this.changeState(GameState.Running);
	}

	private setDifficulty(): void {
		var gameLength: number = new Date().getTime() - this.startGameTime;

		if (gameLength > 75000) {
			this.baseEnemySpeed = 0.2;
			this.spawnRate = 300;
		} else if (gameLength > 68000) {
			this.baseEnemySpeed = 0.12;
			this.spawnRate = 150;
		} else if (gameLength > 56500) {
			this.spawnRate = 250;
		} else if (gameLength > 50000) {
			this.lastEnemySpawn = new Date().getTime(); // don't spawn enemies now
		} else if (gameLength > 40000) {
			this.spawnRate = 500;
		} else if (gameLength > 28000) {
			this.spawnRate = 600;
		} else if (gameLength > 24500) {
			this.lastEnemySpawn = new Date().getTime(); // don't spawn enemies now
		} else if (gameLength > 16500) {
			this.spawnRate = 750;
		} else if (gameLength > 5500) {
			this.spawnRate = 1000;
		}
	}

	private drawGrid(): void {
		var i: number;
		var width: number = this.canvas.width;
		var height: number = this.canvas.height;

		this.context.fillStyle = "#000";
		this.context.fillRect(0, 0, width,height);

		this.context.strokeStyle = "#639";
		this.context.globalAlpha = 0.25;
		this.context.lineWidth = 1;

		// tinygrid
		this.context.beginPath();
		for (i = 0; i < 37; i++) {
			this.context.moveTo(i * 15 + 7.5, 0);
			this.context.lineTo(i * 15 + 7.5, height);
		}
		for (i = 0; i < 20; i++) {
			this.context.moveTo(0, i * 15 + 7.5);
			this.context.lineTo(width, i * 15 + 7.5);
		}
		this.context.stroke();

		// maingrid
		this.context.strokeStyle = "#663399";
		this.context.lineWidth = 1;
		this.context.globalAlpha = 0.5;

		this.context.beginPath();
		for (i = 1; i < 36; i++) {
			this.context.moveTo(i * 15 + 0.5, 0);
			this.context.lineTo(i * 15 + 0.5, height);
		}
		for (i = 1; i < 20; i++) {
			this.context.moveTo(0, i * 15 + 0.5);
			this.context.lineTo(width, i * 15 + 0.5);
		}
		this.context.stroke();
	}

	private drawPlayer(): void {
		var timePassed: number = new Date().getTime() - this.lastFrameTime,
			x: number = this.player.position.x,
			y: number = this.player.position.y;

		// move player if arrow keys are pressed;
		if (this.lastInput.arrowUp) { y -= this.player.speed * timePassed; }
		if (this.lastInput.arrowDown) { y += this.player.speed * timePassed; }
		if (this.lastInput.arrowLeft) { x -= this.player.speed * timePassed; }
		if (this.lastInput.arrowRight) { x += this.player.speed * timePassed; }

		if (y < 0) {
			y = 0;
		}
		if (y > this.canvas.height) {
			y = this.canvas.height;
		}
		if (x < 0) {
			x = 0;
		}
		if (x > this.canvas.width) {
			x = this.canvas.width;
		}

		this.player.position = {x: x, y: y };

		this.context.lineWidth = 2;
		this.context.lineJoin = "miter";
		this.context.lineCap = "butt";
		this.context.strokeStyle = "#4395e1";
		this.context.globalAlpha = 1;

		this.context.save();
		this.context.translate(x, y);
		if (this.lastInput.mousePosition) {
			this.context.rotate(Math.atan2(this.lastInput.mousePosition.y - y, this.lastInput.mousePosition.x - x));
		}
		this.context.translate(-x, -y);

		this.context.beginPath();
		this.context.moveTo(x + 11, y - 5);
		this.context.lineTo(x, y - 12);
		this.context.lineTo(x - 12, y);
		this.context.lineTo(x, y + 12);
		this.context.lineTo(x + 11, y + 5);
		this.context.lineTo(x + 3, y + 9);
		this.context.lineTo(x - 6, y);
		this.context.lineTo(x + 3, y - 9);

		this.context.closePath();
		this.context.stroke();

		this.context.restore();
	}

	private shoot(): void {
		if (this.lastInput.isMouseDown && new Date().getTime() - this.lastShot >= this.rateOfFire) {
			var playerPos: IPos = this.player.position;
			var angle: number = Math.atan2(this.lastInput.mousePosition.y - playerPos.y, this.lastInput.mousePosition.x - playerPos.x);
			var startPos: IPos = { x: playerPos.x + Math.cos(angle) * 15, y: playerPos.y + Math.sin(angle) * 15 };
			var b: IBullet = {origin: startPos, position: playerPos, angle: angle, speed: 0.3 };

			this.bullets.push(b);
			this.lastShot = new Date().getTime();
		}
	}

	private drawAmmo(): void {
		var timePassed: number = new Date().getTime() - this.lastFrameTime;
		var newBulletArray: Array<IBullet> = [];

		this.context.strokeStyle = "#c09";
		this.context.lineWidth = 3;
		this.context.globalAlpha = 1;

		for (var i: number = 0; i < this.bullets.length; i++) {
			var b: IBullet = this.bullets[i];

			var x: number = b.position.x + Math.cos(b.angle) * (b.speed * timePassed);
			var y: number = b.position.y + Math.sin(b.angle) * (b.speed * timePassed);
			b.position = { x: x, y: y };

			this.context.beginPath();
			this.context.moveTo(x, y);
			this.context.lineTo(x - Math.cos(b.angle) * 10, y - Math.sin(b.angle) * 10);
			this.context.stroke();

			if (!(x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height)) {
				newBulletArray.push(b);
			}
		}

		this.bullets = newBulletArray;
	}

	private drawEnemies(): void {
		var e: Enemy;

		// create new enemies
		if (new Date().getTime() - this.lastEnemySpawn >= this.spawnRate && this.enemies.length < 50) {
			var x: number;
			var y: number;

			x = Math.random() * this.canvas.width * 2 - this.canvas.width / 2;
			if (x < 0 || x > this.canvas.width) {
				y = Math.random() * this.canvas.height;
			} else {
				y = Math.random() > 0.5 ? -50 : this.canvas.width + 50;
			}

			e = new Enemy({ x: x, y: y }, this.baseEnemySpeed + Math.random() * 0.03); // 0.08
			this.enemies.push(e);

			this.lastEnemySpawn = new Date().getTime();
		}

		var timePassed: number = new Date().getTime() - this.lastFrameTime;
		var newEnemies: Array<Enemy> = [];

		this.context.globalAlpha = 1;
		this.context.lineWidth = 2;

		for (var i: number = 0; i < this.enemies.length; i++) {
			e = this.enemies[i];

			var x1: number = e.position.x, // enemy location
				y1: number = e.position.y,
				x2: number = this.player.position.x, // player location
				y2: number = this.player.position.y,
				angle: number = Math.atan2(y2 - y1, x2 - x1),
				newX: number = x1 + Math.cos(angle) * (e.speed * timePassed), // calculate new position
				newY: number = y1 + Math.sin(angle) * (e.speed * timePassed);

			e.position = { x: newX, y: newY };

			e.drawPath(this.context, timePassed);

			// check if player got hit by enemy
			if (this.context.isPointInPath(x2, y2)) {
				console.log("Life lost - Enemy: " + i + " x:" + x1.toString() +
					" y:" + y1.toString() + " - Player: " + x2.toString() + " " + y2.toString());
				console.log("Time passed: " + timePassed + " - Speed: " + e.speed);

				this.audioDead.play();
				this.loseLife();
				return;
			}

			// check if enemy got hit by ammo
			var targetHit: boolean = false;
			for (var j: number = 0; j < this.bullets.length; j++) {
				var b: IBullet = this.bullets[j];

				if (this.context.isPointInPath(b.position.x, b.position.y)) {
					this.score += 100;
					targetHit = true;
				}
				if (targetHit) { break; }
			}
			if (targetHit) { continue; }

			newEnemies.push(e);
		}
		this.enemies = newEnemies;
	}

	private loseLife(): void {
		this.enemies = [];
		this.lives -= 1;

		if (this.lives === 0) {
			this.canvas.style.cursor = "default";
			this.changeState(GameState.EndGame);
		}
	}

	private drawScore(): void {
		this.context.globalAlpha = 1;
		this.context.fillStyle = "#99ccff";
		this.context.textBaseline = "top";
		this.context.font = "16px xirod, sans-serif";

		this.context.textAlign = "left";
		this.context.fillText(this.lives + (this.lives === 1 ? " life" : " lives"), 8, 8);

		this.context.textAlign = "right";
		this.context.fillText(this.score + " pts", this.canvas.width - 8, 8);

		if (new Date().getTime() - this.startGameTime < 5500) {
			var countDown: number = Math.floor((5500 - new Date().getTime() + this.startGameTime) / 1000);
			var countDownText: string;

			if (countDown === 0) {
				countDownText = "Start";
			} else {
				countDownText = countDown.toString();
			}
			this.context.textAlign = "center";
			this.context.fillText(countDownText, this.canvas.width / 2, this.canvas.height * 1 / 3);
		}
	}

	private drawEndScreen(): void {
		var cursor: string = "default";

		this.context.globalAlpha = 1;
		this.context.fillStyle = "#99ccff";
		this.context.textBaseline = "middle";
		this.context.font = "25px xirod, sans-serif";

		this.context.textAlign = "center";
		this.context.fillText("You scored: " + this.score, this.canvas.width / 2, this.canvas.height / 2);

		var textWidth: number = this.context.measureText("Try again?").width;

		// check if mouse is over the text
		if (this.lastInput.mousePosition !== null &&
			this.lastInput.mousePosition.x > (this.canvas.width / 2 - textWidth / 2) &&
			this.lastInput.mousePosition.x < (this.canvas.width / 2 + textWidth / 2) &&
			this.lastInput.mousePosition.y > (this.canvas.height * 3 / 4 - 12.5) &&
			this.lastInput.mousePosition.y < (this.canvas.height * 3 / 4 + 12.5)) {
			this.context.fillStyle = "#ffffff";
			cursor = "pointer";
		} else {
			this.context.fillStyle = "#99ccff";
		}

		this.context.fillText("Try again?", this.canvas.width / 2, this.canvas.height * 3 / 4);
		if (this.context.fillStyle === "#ffffff" && this.lastInput.isMouseDown && this.mouseWasUp) {
			cursor = "crosshair";
			this.audioMenuClick.play();
			this.startGame();
		}

		// credits
		this.context.font = "12px xirod, sans-serif";
		this.context.textBaseline = "bottom";
		this.context.textAlign = "right";
		textWidth = this.context.measureText("Credits").width;

		// check if mouse is over the text
		if (this.lastInput.mousePosition !== null &&
			this.lastInput.mousePosition.x > (this.canvas.width - 10 - textWidth) &&
			this.lastInput.mousePosition.x < (this.canvas.width - 10) &&
			this.lastInput.mousePosition.y > (this.canvas.height - 10 - 12) &&
			this.lastInput.mousePosition.y < (this.canvas.height - 10)) {
			this.context.fillStyle = "#ffffff";
			cursor = "pointer";
		} else {
			this.context.fillStyle = "#99ccff";
		}

		this.context.fillText("Credits", this.canvas.width - 10, this.canvas.height - 10);

		if (this.context.fillStyle === "#ffffff" && this.lastInput.isMouseDown && this.mouseWasUp) {
			cursor = "default";
			this.audioMenuClick.play();
			this.changeState(GameState.Credits);
		}

		this.canvas.style.cursor = cursor;
	}

	private drawCredits(): void {
		// show credits

		this.context.globalAlpha = 1;
		this.context.fillStyle = "#99ccff";
		this.context.textBaseline = "middle";
		this.context.font = "16px xirod, sans-serif";

		this.context.textAlign = "center";
		this.context.fillText("Programmer: Steve Vaneeckhout", this.canvas.width / 2, this.canvas.height * 1 / 5);
		this.context.fillText("Music: Cold Storage - Messij", this.canvas.width / 2, this.canvas.height * 2 / 5);
		this.context.fillText("Sounds: soundjay.com", this.canvas.width / 2, this.canvas.height * 3 / 5);
		this.context.fillText("Font: xirod - Ray Larabie", this.canvas.width / 2, this.canvas.height * 4 / 5);

		// back to score
		this.context.font = "12px xirod, sans-serif";
		this.context.textBaseline = "bottom";
		this.context.textAlign = "right";
		var textWidth: number = this.context.measureText("Score").width;
		var cursor: string = "default";

		// check if mouse is over the text
		if (this.lastInput.mousePosition !== null &&
			this.lastInput.mousePosition.x > (this.canvas.width - 10 - textWidth) &&
			this.lastInput.mousePosition.x < (this.canvas.width - 10) &&
			this.lastInput.mousePosition.y > (this.canvas.height - 10 - 12) &&
			this.lastInput.mousePosition.y < (this.canvas.height - 10)) {
			this.context.fillStyle = "#ffffff";
			cursor = "pointer";
		} else {
			this.context.fillStyle = "#99ccff";
		}

		this.context.fillText("Score", this.canvas.width - 10, this.canvas.height - 10);

		if (this.context.fillStyle === "#ffffff" && this.lastInput.isMouseDown && this.mouseWasUp) {
			cursor = "default";
			this.audioMenuClick.play();
			this.changeState(GameState.EndGame);
		}

		this.canvas.style.cursor = cursor;
	}

	start(): void {
		this.changeState(GameState.Menu);

		requestAnimationFrame((): void => this.drawFrame());
	}
}

var g: Game;

window.onload = (): void => {
	var canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("game");

	g = new Game(document, canvas);
	g.start();
};