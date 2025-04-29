/**
 * BLADES, BASTIONS, AND BARDS
 * 
 * 3 types of token:
 *  - blades - have 3 hp
 *  - bastions - have 5 hp
 *  - bards - have 2 hp
 * 
 * There is
 * 
 */

/**@type {HTMLCanvasElement} */
let canvas;
/**@type {CanvasRenderingContext2D} */
let ctx;

//
// :UTILS
//

class Rect {
    x;
    y;
    w;
    h;

    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

class Vector2 {
    x;
    y;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

const EaseType = {
    inOut: easeInOut,
}

function easeInOut(t) {
    // Cubic easing
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(start, end, t, ease = EaseType.inOut) {
    const easedT = ease(t);
    return start * (1 - easedT) + end * easedT;
}

//
// :IMAGES
//

let imagePaths = {
    "white_token_question": "./res/white_token_question.png",
    "white_token_blade": "./res/white_token_blade.png",
    "white_token_bastion": "./res/white_token_bastion.png",
    "white_token_bard": "./res/white_token_bard.png",
    "black_token_question": "./res/black_token_question.png",
    "black_token_blade": "./res/black_token_blade.png",
    "black_token_bastion": "./res/black_token_bastion.png",
    "black_token_bard": "./res/black_token_bard.png",
    // sacred sites
    "white_sacred_site": "./res/white_sacred_site.png",
    "black_sacred_site": "./res/black_sacred_site.png",
    "neutral_sacred_site": "./res/neutral_sacred_site.png",
    // main menu
    "god_fight": "./res/god_fight.png",
}

/** @type {Map<string, HTMLImageElement>} */
let images = {}

function loadImages() {
    for (const key in imagePaths) {
        const val = imagePaths[key];
        let img = new Image();
        img.src = val;
        images[key] = img;
        console.log("loaded image: ", key)
    }
}

//
// :ANIMATION
//

class AnimatedSprite2D {
    position = new Vector2(0, 0);
    scale = 1.0;
    spriteWidth = 16;
    spriteHeight = 16;
    /** @type {HTMLImageElement} */
    frames;
    currentFrame = 0;
    frameCount = 1;
    elapsedTime = 0.0;
    frameDuration = 0.2;
    /** @type {Function}*/
    finishedFunc;
    finished = false;
    loop = false;


    /**
     * 
     * @param {HTMLImageElement} framesImage - the image
     * @param {number} frameCount - the number of frames in the image
     * @param {Function} finishedFunc - function that fires after the animation is finished 
     */
    constructor(framesImage, frameCount, finishedFunc, scale = 1.0) {
        this.frames = framesImage;
        this.frameCount = frameCount;
        this.scale = scale;
        this.finishedFunc = () => {
            finishedFunc();
            if (this.loop) {
                this.elapsedTime = 0.0;
                this.currentFrame = 0;
                this.finished = false;
            }
        }
    }

    play(deltaTime) {
        ctx.drawImage(this.frames,
            this.currentFrame * this.spriteWidth, 0,
            this.spriteWidth, this.spriteHeight,
            this.position.x - (CellData.width / 2) * this.scale, this.position.y - (CellData.height / 2) * this.scale,
            this.spriteWidth * this.scale,
            this.spriteHeight * this.scale
        );
        if (this.finished) return;
        this.elapsedTime += deltaTime;
        // console.log(this.currentFrame)


        if (this.elapsedTime > this.frameDuration * 1000) {
            this.currentFrame += 1;
            this.elapsedTime = 0.0;
        }

        if (this.currentFrame >= this.frameCount) {
            this.finished = true;
            this.finishedFunc();
            return;
        }
    }

}

let anims = {}

function loadAnims() {
    // anims = {
    //     sacredSite: new AnimatedSprite2D(images["neutral_sacred_site"], 4, () => { }, 3.5),
    // }
}

//
// :MOUSE
//

class Mouse {
    x = -1;
    y = -1;

    setCoords(x, y) {
        this.x = x;
        this.y = y;
    }

    isValidCoords() {
        return this.x > -1 && this.y > -1
    }

    reset() {
        this.x = -1;
        this.y = -1;
    }

    rectIsHovered(r) {
        return this.x >= r.x && this.y >= r.y && this.x < r.x + r.w && this.y < r.y + r.h;
    }
}

/**@type {Mouse} */
let mouse = new Mouse();

function handleMouseMove(event) {
    mouse.setCoords(event.offsetX, event.offsetY);

    // place token if mouse click is inside region
    let hoverRects = getTokenMouseOverRects();
    let showPlaceholder = false;
    for (const r of hoverRects) {
        if (mouse.rectIsHovered(r)) {
            Token.currentPlaceholderGridPosition = r;
            showPlaceholder = true;
            break;
        }
    }
    Token.showPlaceholderToken = showPlaceholder;

    // do other stuff
}

function handleMouseExitCanvas() {
    mouse.reset();
}

/**
 * @param {MouseEvent} event - mouse event
 */
function handleMouseClick(event) {
    if (!GameState.isHumanPlayerTurn) return;
    if (event.button == 0) { // left click
        let data = new CellData();
        data.owner = GameState.humanPlayer;
        const type = GameState.currentSelectionTokenType;
        data.token = new Token(type);
        const pos = mouseToGridPosition();
        if (!isInGridBounds(pos.x, pos.y)) return;
        /**@type {CellData} */
        const currData = getCellAtPosition(pos.x, pos.y);
        if (currData.isOccupied() || currData.hasSacredSite()) {
            console.log("occupied");
            return;
        }
        data.x = currData.x;
        data.y = currData.y;
        setCellAtPosition(pos.x, pos.y, data);
        console.log("placing token: ", type)
        handleAiTurn();
    }
    if (event.button == 2) { // right click
        gameState.cycleSelectionToken();
    }
}

function getTokenMouseOverRects() {
    /** @type {Array[Rect]} */
    let retRects = [];

    let padX = CellData.pad;
    let padY = CellData.pad;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;
    let rectOffsetX = (cellWidth / 2 - 5);
    let rectOffsetY = (cellHeight / 2 - 5);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let xpos = x * cellWidth + padX;
            let ypos = y * cellHeight + padY;
            var centerX = xpos + cellWidth / 2;
            var centerY = ypos + cellHeight / 2;
            let rect = new Rect(centerX - rectOffsetX, centerY - rectOffsetY, rectOffsetX * 2, rectOffsetY * 2)
            const data = getCellAtPosition(x, y);
            if (data.hasSacredSite()) continue;
            retRects.push(rect)
            padX += CellData.pad;
        }
        padY += CellData.pad;
        padX = CellData.pad;
    }
    return retRects;
}

//
// :TOKEN (Game Piece)
//

const TokenType = {
    blade: "blade",
    bastion: "bastion",
    bard: "bard",
}

// const tokenControlValues = {
//     [TokenType.blade]: 1,
//     [TokenType.bastion]: 1,
//     [TokenType.bard]: 1,
// }

class Token {
    static showPlaceholderToken = false;
    /** @type {Rect} */
    static currentPlaceholderGridPosition;
    tokenType = TokenType.blade;

    // animation
    isSlidingIntoPosition = false;
    /** @type {Vector2} */
    slideStartPosition = new Vector2(-1, -1);
    slideElapsed = 0.0
    static slideDuration = 1.0;

    constructor(type) {
        this.tokenType = type;
        this.control = 1  // tokenControlValues[this.tokenType];

        let slideRand = randInt(0.0, 100.0) / 100.0;
        let lineStart = new Vector2(0, canvas.height + 50);
        let lineEnd = new Vector2(canvas.width, canvas.height + 50);
        let x = lerp(lineStart.x, lineEnd.x, slideRand);
        this.slideStartPosition = new Vector2(x, lineStart.y);
        this.isSlidingIntoPosition = true;
    }
}



function drawPlaceholderToken() {
    if (!Token.showPlaceholderToken || !GameState.isHumanPlayerTurn) {
        return;
    }
    const rect = Token.currentPlaceholderGridPosition;
    const imgStr = `${playerColors[GameState.humanPlayer]}_token_${GameState.currentSelectionTokenType}`;
    /**@type {HTMLImageElement} */
    let img = images[imgStr];
    if (img === undefined) return;
    ctx.globalAlpha = .3;
    ctx.drawImage(img, rect.x + rect.w / 2 - img.width * pieceScale / 2, rect.y + rect.h / 2 - img.height * pieceScale / 2, img.width * pieceScale, img.height * pieceScale)
    ctx.globalAlpha = 1;
}

function drawPlacedTokens(deltaTime) {
    if (GameState.showTokenControlNumbers) ctx.globalAlpha = .5;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            /**@type {CellData} */
            let data = getCellAtPosition(x, y);
            if (!data.isOccupied()) continue;
            if (data.hasSacredSite()) continue;

            const rect = rectOfGridPosition(x, y);
            const imgStr = `${playerColors[data.owner]}_token_${data.token.tokenType}`;
            // console.log(imgStr);
            let img = images[imgStr];

            if (data.token.isSlidingIntoPosition) {
                // Get the start and target positions
                let spos = data.token.slideStartPosition;
                let target = new Vector2(
                    rect.x + rect.w / 2 - img.width * pieceScale / 2,
                    rect.y + rect.h / 2 - img.height * pieceScale / 2
                );

                const deltaTimeSeconds = deltaTime / 1000; // Convert - deltaTime is in milliseconds but duration is in seconds
                data.token.slideElapsed += deltaTimeSeconds;
                data.token.slideElapsed = Math.min(data.token.slideElapsed, Token.slideDuration);
                const progress = data.token.slideElapsed / Token.slideDuration;

                let x = lerp(spos.x, target.x, progress);
                let y = lerp(spos.y, target.y, progress);
                ctx.drawImage(img, x, y, img.width * pieceScale, img.height * pieceScale);

                if (data.token.slideElapsed >= Token.slideDuration) {
                    data.token.isSlidingIntoPosition = false;
                    data.token.slideElapsed = 0;
                    const raudio = randInt(1, 20);
                    playAudio(`place_${raudio}`)
                }
            } else {
                // Draw the image at the final position
                ctx.drawImage(
                    img,
                    rect.x + rect.w / 2 - img.width * pieceScale / 2,
                    rect.y + rect.h / 2 - img.height * pieceScale / 2,
                    img.width * pieceScale,
                    img.height * pieceScale
                );
            }

        }
    }
    ctx.globalAlpha = 1;
}

function drawTokenControlNumbers() {
    if (!GameState.showTokenControlNumbers) return;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            /**@type {CellData} */
            let data = getCellAtPosition(x, y);
            if (!data.isOccupied()) continue;
            const pos = localOfGridPosition(x, y);
            drawText(ctx, data.token.control, 46, pos.x, pos.y);
        }
    }
}

//
// :SACRED SITES
//

class SacredSite {
    static siteCount = 5
    /**@type {Player} */
    controllingPlayer = Player.none;
    fadeInAnimation = new AnimatedSprite2D(images["neutral_sacred_site"], 4, () => { }, 3.5);

    static isSacredSiteInRadius(x, y) {
        const distance = 2
        const sites = cells.filter(x => x.hasSacredSite());
        for (const s of sites) {
            if (Math.abs(s.x - x) < distance || Math.abs(s.y - y) < distance) {
                return true;
            }
        }
        return false;
    }
}

async function generateSacredSites() {
    await delay(1000);
    for (let i = 0; i < SacredSite.siteCount; i++) {
        let x = randInt(1, gridWidth - 2);
        let y = randInt(1, gridHeight - 2);
        while (getCellAtPosition(x, y).hasSacredSite() || SacredSite.isSacredSiteInRadius(x, y)) {
            x = randInt(1, gridWidth - 2);
            y = randInt(1, gridHeight - 2);
        }

        getCellAtPosition(x, y).sacredSite = new SacredSite()
        await delay(500);
    }
}

function drawSacredSites(deltaTime) {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            /**@type {CellData} */
            let data = getCellAtPosition(x, y);
            if (!data.hasSacredSite()) continue;

            const anim = data.sacredSite.fadeInAnimation;
            anim.position = localOfGridPosition(x, y);
            anim.play(deltaTime);

            // let imgStr;
            // switch (data.sacredSite.controllingPlayer) {
            //     case Player.none:
            //         imgStr = "neutral_sacred_site";
            //         break;
            //     case Player.one:
            //         imgStr = "white_sacred_site";
            //         break;
            //     case Player.two:
            //         imgStr = "black_sacred_site";
            //         break;
            // }

            // let img = images[imgStr];
            // const rect = rectOfGridPosition(x, y);
            // ctx.drawImage(img, rect.x + rect.w / 2 - img.width * pieceScale / 2, rect.y + rect.h / 2 - img.height * pieceScale / 2, img.width * pieceScale, img.height * pieceScale)
        }
    }
}

//
// :GRID
//

const gridWidth = 14;
const gridHeight = 14;
const pieceScale = 3;
/**@type {Array[Array[CellData]]} */
let cells = [];

class CellData {
    static width = 16;
    static height = 16;
    static pad = 0;

    x = -1;
    y = -1;

    owner = Player.none;
    /**@type {Token} */
    token = null;
    /**@type {SacredSite} */
    sacredSite = null;

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    setOwner(owner, token = null) {
        if (owner == Player.none) {
            this.clear();
            return;
        }
        this.owner = owner;
        this.token = token;
    }

    isOccupied() {
        return this.token != null;
    }

    hasSacredSite() {
        return this.sacredSite != null;
    }

    clear() {
        this.owner = Player.none;
        this.token = null;
    }
}


function initGrid() {
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            cells.push(new CellData(x, y));
        }
    }
}

function renderGrid() {
    // fill bg first
    ctx.fillStyle = "rgb(61, 77, 54)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let padX = CellData.pad;
    let padY = CellData.pad;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let xpos = x * cellWidth + padX;
            let ypos = y * cellHeight + padY;
            // ctx.fillStyle = "rgb(71, 104, 77)";
            // ctx.fillRect(xpos, ypos, cellWidth, cellHeight);

            // draw center lines
            ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xpos + cellWidth / 2, ypos);
            ctx.lineTo(xpos + cellWidth / 2, ypos + cellHeight / 2);
            ctx.stroke();

            ctx.beginPath()
            ctx.moveTo(xpos + cellWidth / 2, ypos + cellHeight);
            ctx.lineTo(xpos + cellWidth / 2, ypos + cellHeight / 2);
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(xpos, ypos + cellHeight / 2);
            ctx.lineTo(xpos + cellWidth / 2, ypos + cellHeight / 2);
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(xpos + cellWidth, ypos + cellHeight / 2);
            ctx.lineTo(xpos + cellWidth / 2, ypos + cellHeight / 2);
            ctx.stroke()

            ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
            ctx.beginPath();
            ctx.arc(xpos + cellWidth / 2, ypos + cellHeight / 2, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "rgb(50, 63, 56)";
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = 1;

            padX += CellData.pad;

        }
        padY += CellData.pad;
        padX = CellData.pad;
    }
}

function renderClickRegisterPositions() {
    let padX = CellData.pad;
    let padY = CellData.pad;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;
    let rectOffsetX = (cellWidth / 2 - 10);
    let rectOffsetY = (cellHeight / 2 - 10);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let xpos = x * cellWidth + padX;
            let ypos = y * cellHeight + padY;
            var centerX = xpos + cellWidth / 2;
            var centerY = ypos + cellHeight / 2;
            ctx.fillStyle = "red";
            ctx.fillRect(centerX - rectOffsetX, centerY - rectOffsetY, rectOffsetX * 2, rectOffsetY * 2);
            padX += CellData.pad;
        }
        padY += CellData.pad;
        padX = CellData.pad;
    }
}

function getCellAtPosition(x, y) {
    for (const c of cells) {
        if (c.x == x && c.y == y) {
            return c;
        }
    }
    return null
}

function setCellAtPosition(x, y, cellData) {
    for (let i = 0; i < cells.length; i++) {
        if (cells[i].x == x && cells[i].y == y) {
            cells[i] = cellData;
            return;
        }
    }
    console.log(`did not set cell data at (${x}, ${y})`)
}

function mouseToGridPosition() {
    let padX = CellData.pad;
    let padY = CellData.pad;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;
    let rectOffsetX = (cellWidth / 2 - 5);
    let rectOffsetY = (cellHeight / 2 - 5);
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let xpos = x * cellWidth + padX;
            let ypos = y * cellHeight + padY;
            var centerX = xpos + cellWidth / 2;
            var centerY = ypos + cellHeight / 2;
            let rect = new Rect(centerX - rectOffsetX, centerY - rectOffsetY, rectOffsetX * 2, rectOffsetY * 2)
            if (mouse.rectIsHovered(rect)) {
                return new Vector2(x, y);
            }
            padX += CellData.pad;
        }
        padY += CellData.pad;
        padX = CellData.pad;
    }
    return new Vector2(-1, -1);
}

// @TODO: refactor others to use this function
function rectOfGridPosition(x, y) {
    let padX = CellData.pad * x;
    let padY = CellData.pad * y;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;
    let rectOffsetX = (cellWidth / 2 - 5);
    let rectOffsetY = (cellHeight / 2 - 5);

    let xpos = x * cellWidth + padX;
    let ypos = y * cellHeight + padY;
    var centerX = xpos + cellWidth / 2;
    var centerY = ypos + cellHeight / 2;
    return new Rect(centerX - rectOffsetX, centerY - rectOffsetY, rectOffsetX * 2, rectOffsetY * 2)
}

function localOfGridPosition(x, y) {
    let padX = CellData.pad * x;
    let padY = CellData.pad * y;
    let cellWidth = ((canvas.width - padX) - (padX) * gridWidth) / gridWidth;
    let cellHeight = ((canvas.height - padY) - (padY) * gridHeight) / gridHeight;

    let xpos = x * cellWidth + padX;
    let ypos = y * cellHeight + padY;
    var centerX = xpos + cellWidth / 2;
    var centerY = ypos + cellHeight / 2;
    return new Vector2(centerX, centerY);
}

/**
 * get adjacent cell data to the provided data
 * @param {CellData} originData
 */
function getNeighborCellData(originData) {
    let retCellData = [];
    const ox = originData.x;
    const oy = originData.y;
    let positions = [
        new Vector2(ox - 1, oy), // left
        new Vector2(ox + 1, oy), // right
        new Vector2(ox, oy - 1), // up
        new Vector2(ox, oy + 1), // down
    ];

    for (const p of positions) {
        /**@type {CellData} */
        if (!isInGridBounds(p.x, p.y)) continue;
        const data = getCellAtPosition(p.x, p.y);
        if (data.isOccupied() || data.hasSacredSite()) retCellData.push(data);
    }

    return retCellData;
}

function isInGridBounds(x, y) {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

/**
 * get all cell data that is touching originData using flood fill
 * @param {CellData} originData
 */
function floodFindCellData(originData) {
    let retCellData = [];
    let visited = [];

    const fill = (cellData) => {
        visited.push(cellData);
        for (const c of getNeighborCellData(cellData)) {
            if (!visited.includes(c) && (c.isOccupied() || c.hasSacredSite())) {
                retCellData.push(c);
                fill(c);
            }
        }
    };
    retCellData.push(originData);
    fill(originData);
    return retCellData;
}

//
// :GAME STATE
//

const Player = {
    none: 0,
    one: 1,
    two: 2
}

const Stage = {
    mainMenu: 0,
    Game: 1,
    EndGame: 2,
}

class GameState {
    // faith win condition
    static faithGoal = 50;
    faithScores = {
        [Player.one]: 0,
        [Player.two]: 0,
    }

    static currentStage = Stage.mainMenu;

    static humanPlayer = Player.one;
    static isHumanPlayerTurn = true;
    static aiPlayer = Player.two;
    static currentSelectionTokenType = TokenType.blade;
    static showTokenControlNumbers = false;

    cycleSelectionToken() {
        switch (GameState.currentSelectionTokenType) {
            case TokenType.blade:
                GameState.currentSelectionTokenType = TokenType.bastion;
                break;
            case TokenType.bastion:
                GameState.currentSelectionTokenType = TokenType.bard;
                break;
            case TokenType.bard:
                GameState.currentSelectionTokenType = TokenType.blade;
                break;
        }
        console.log("cycling selection: ", GameState.currentSelectionTokenType)
    }

    addFaith(player, ammount) {
        this.faithScores[player] += ammount;
    }
}

let gameState = new GameState();

let playerColors = {
    [Player.one]: "white",
    [Player.two]: "black",
}

//
// :AI
//

async function handleAiTurn() {
    GameState.isHumanPlayerTurn = false;
    await delay(1000);
    let ffVisited = [];
    outerLoop: for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            /**@type {CellData} */
            let data = getCellAtPosition(x, y);
            if (!ffVisited.includes(data) && data.isOccupied()) {
                let fill = floodFindCellData(data);

                for (const c of fill) {
                    const pos = getFreeGridPosition(c);
                    if (isInGridBounds(pos.x, pos.y)) {
                        const data = new CellData();
                        data.owner = Player.two;
                        data.x = pos.x;
                        data.y = pos.y;
                        const rtype = randInt(0, 2);
                        let type;
                        switch (rtype) {
                            case 0:
                                type = TokenType.blade;
                                break;
                            case 1:
                                type = TokenType.bastion;
                                break;
                            case 2:
                                type = TokenType.bard;
                                break;
                        }

                        data.token = new Token(type);
                        setCellAtPosition(pos.x, pos.y, data);
                        console.log("placing ai token");
                        break outerLoop;
                    }
                }
            }
        }
    }
    await delay(Token.slideDuration * 1000);
    GameState.isHumanPlayerTurn = true;
}

function getFreeGridPosition(cellData) {
    const ox = cellData.x;
    const oy = cellData.y;
    let positions = [
        new Vector2(ox - 1, oy), // left
        new Vector2(ox + 1, oy), // right
        new Vector2(ox, oy - 1), // up
        new Vector2(ox, oy + 1), // down
    ];

    for (const p of positions) {
        if (!isInGridBounds(p.x, p.y)) continue;
        const data = getCellAtPosition(p.x, p.y);
        if (!data.isOccupied() && !data.hasSacredSite()) return p;
    }
    return new Vector2(-1, -1);
}

//
// :AUDIO
//


function playAudio(name, loop = false, volume = 1.0) {
    const audio = document.getElementById(`${name}`);
    audio.loop = loop;
    audio.play(); // Plays the audio
    audio.volume = volume;
}

function toggleSoundEffects() {
    let sfxs = document.getElementsByClassName("sfx");
    for (const sfx of sfxs) {
        sfx.muted = !sfx.muted;
    }

    /** @type {HTMLImageElement} */
    const iconImg = document.getElementById("sfx-icon");
    if (sfxs[1].muted) {
        iconImg.src = "./res/sfx_icon_disabled.png";
    } else {
        iconImg.src = "./res/sfx_icon_enabled.png";
    }
}

/**
 * 
 * @returns {HTMLAudioElement} 
 */
const getAudio = (name) => document.getElementById(`${name}`);

//
// :TEXT
//

function loadFont() {
    const font = new FontFace('game-font', 'url(./res/font/alagard.ttf)');
    font.load().then(function (loadedFont) {
        document.fonts.add(loadedFont);
    }).catch(function (error) {
        // Handle the error if the font fails to load
        console.error('Font loading error:', error);
    });
}

function drawText(context, text, font_size, x, y, color = "red") {
    context.font = `${font_size}px game-font`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, x, y);
    // ctx.lineWidth = 2;
    context.strokeStyle = 'black';
    context.strokeText(text, x, y);
    // ctx.lineWidth = 1;
}

//
// :MAIN MENU
//

const MainMenuScreen = {
    start: 0,
    prologue: 1
}

class MainMenu {
    static currentScreen = MainMenuScreen.start;
    /** @type {HTMLCanvasElement} */
    static mmCanvas;
    static showStartMenu = true;
    static showPrologue = false;
    startMenuFadeElapsed = 0.0;
    prologueFadeInElapsed = 0.0;

    constructor() {
        MainMenu.mmCanvas = document.createElement("canvas");
        canvas.hidden = true;
        document.getElementById("game-container").appendChild(MainMenu.mmCanvas);
        MainMenu.mmCanvas.addEventListener('mousedown', MainMenu.handleMouseClick, false);
        MainMenu.mmCanvas.width = 768;
        MainMenu.mmCanvas.height = 768;

        // pixel perfect
        let mmCtx = MainMenu.mmCanvas.getContext("2d");
        MainMenu.mmCanvas.style.imageRendering = "pixelated";
        MainMenu.mmCanvas.oncontextmenu = (e) => e.preventDefault();
        mmCtx.imageSmoothingEnabled = false; // Standard
        mmCtx.msImageSmoothingEnabled = false; // For IE and Edge
        mmCtx.webkitImageSmoothingEnabled = false; // For Safari and Chrome
    }

    static handleMouseClick() {
        switch (MainMenu.currentScreen) {
            case MainMenuScreen.start:
                MainMenu.currentScreen = MainMenuScreen.prologue;
                MainMenu.showStartMenu = false;
                break;
            case MainMenuScreen.prologue:
                canvas.hidden = false;
                MainMenu.mmCanvas.hidden = true;
                playAudio("bgm_1", true, 0.1); // hack to get passed autoplay restrictions
                generateSacredSites();
                GameState.currentStage = Stage.Game;
                break;
        }
    }
}

/** @type {MainMenu} */
let mainMenu;

function drawMainMenu(deltaTime) {
    let mmCtx = MainMenu.mmCanvas.getContext("2d");
    playAudio("bgm_1", false, 1.0);
    mmCtx.fillStyle = "rgba(0, 0, 0, 1)"
    mmCtx.fillRect(0, 0, canvas.width, canvas.height);

    let startAlpha = 1.0;
    if (startAlpha > 0.0) {
        if (MainMenu.showStartMenu) {
            startAlpha = Math.max(0.7, Math.min(Math.sin(Date.now() / 700), 1.0));
        } else {
            mainMenu.startMenuFadeElapsed += deltaTime / 1000;
            startAlpha = lerp(1.0, 0.0, mainMenu.startMenuFadeElapsed / 1.0);
            // console.log(startAlpha)
            if (startAlpha <= 0.0) {
                MainMenu.showPrologue = true;
            }
        }
        const headerTextColor = `rgba(142, 120, 74, ${startAlpha})`;
        const clickStartTextColor = `rgba(255,255,255, ${startAlpha})`;
        drawText(mmCtx, "Blades", 110, canvas.width / 2 - 125, 110, headerTextColor);
        drawText(mmCtx, "Bastions", 110, canvas.width / 2, 210, headerTextColor);
        drawText(mmCtx, "& Bards", 110, canvas.width / 2 + 75, 310, headerTextColor);

        const textOffset = 110 + Math.sin(Date.now() / 300) * 5;
        drawText(mmCtx, "Click to Start...", 48, canvas.width / 2, canvas.height - textOffset, clickStartTextColor);

    }

    let pAlpha = 0.0;
    if (MainMenu.showPrologue) {
        // console.log("test")
        mainMenu.prologueFadeInElapsed += deltaTime / 1000;
        pAlpha = lerp(0.0, 1.0, mainMenu.prologueFadeInElapsed / 1.0);
        const bodyTextColor = `rgba(255,255,255, ${pAlpha})`;
        const bodyText = [
            "Two gods are locked",
            "in a battle of rememberance.",
            "Their followers must seek",
            "The lesser elohim.",
            "In order to inspire faith",
            "among non-believers.",
            "They must be remembered."
        ];
        let textOrigin = 420;
        let textOffset = textOrigin + Math.sin(Date.now() / 300) * 5;
        for (const text of bodyText) {
            drawText(mmCtx, text, 48, canvas.width / 2, canvas.height - textOffset, bodyTextColor);
            textOrigin -= 50;
            textOffset = textOrigin + Math.sin(Date.now() / 300) * 5;
        }

        const img = images["god_fight"];
        mmCtx.drawImage(img, canvas.width / 2 - img.width / 2, 75);
    }
}

//
// :GAME LOOP
// 
let lastTime = 0;

function gameLoop(timestamp) {
    // console.log("x: ", mouse.x, "y: ", mouse.y);
    const deltaTime = timestamp - lastTime;


    ctx.clearRect(0, 0, canvas.width, canvas.height); // clears to transparent

    update(deltaTime);
    render(deltaTime);

    // Store the current timestamp for the next frame
    // Request the browser to call this function again on the next animation frame
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Code to update game elements, physics, AI, etc.
}

function render(deltaTime) {
    // Code to draw the game on the screen
    switch (GameState.currentStage) {
        case Stage.mainMenu:
            drawMainMenu(deltaTime);
            break;
        case Stage.Game:
            renderGrid();
            drawPlaceholderToken();
            drawPlacedTokens(deltaTime);
            drawTokenControlNumbers();
            drawSacredSites(deltaTime);
            // renderClickRegisterPositions();
            break;
        case Stage.EndGame:
            console.log("end game not implemented!")
            break;
    }
}

function main() {
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseout', handleMouseExitCanvas);
    canvas.addEventListener('mousedown', handleMouseClick, false);

    mainMenu = new MainMenu();
    loadFont();
    loadImages();
    loadAnims();
    initGrid();
    requestAnimationFrame(gameLoop);
    console.log("game initialized")
}

main()