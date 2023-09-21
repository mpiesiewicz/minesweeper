var timerInterval;
var seconds;
var minesArray;
var MinesCoords;
var SafesCoords;
var map;
var minesNumber;
var tilesNumber;
var columnsNumber;
var level;
var minesCounter;
var gameRunning;
var gameOver;
var boomTimeout;

$(document).ready(function() {
    initGame();
});

function initGame() {
    // main game init function
    // generates the map and sets counters

    $('#board').empty();
    seconds = 0;
    clearInterval(timerInterval);
    document.querySelector('#timer').textContent = seconds;

    // if game was not started yet or game over was hit
    gameRunning = false;

    // if game is running - false, if lost or won - true
    gameOver = false;

    // get initial level
    level = document.getElementById('level-drop-down').value
    
    // setup game difficulty
    switch (level) {
        case 'easy':
            minesNumber = 15;
            columnsNumber = 10;
            break;
        case 'medium':
            minesNumber = 50;
            columnsNumber = 15;
            break;
        case 'hard':
            minesNumber = 100;
            columnsNumber = 20;
            break;
        case 'impossible':
            minesNumber = 140;
            columnsNumber = 20; 
            break;
    }
    minesCounter = minesNumber;
    tilesNumber = Math.pow(columnsNumber, 2)
    
    // hide game over / won messages
    document.getElementById('game-over-message').style.display = 'none';
    document.getElementById('game-won-message').style.display = 'none';
    
    generateTiles(columnsNumber, tilesNumber);
    document.querySelector('#mines-counter').innerHTML = minesNumber

    $('.hidden-tile').off();

    assignEventListeners();
}

function assignEventListeners() {
    // Get all elements with the class "tile"
    tiles = $('.hidden-tile');
    
    // Loop through the tiles and assign event listeners
    tiles.each(function(index) {
        $(this).on("click", function(event) {
            if (event.which === 1 && !gameOver) {
                // Left-click
                reveal(index, map);
                checkWin();

            } else if (event.which === 3 && !gameOver) {
                // Right-click
                event.preventDefault(); // Prevent the context menu from appearing
                postFlag(index);
                
            }
        });
        
        // Right-click event (contextmenu)
        $(this).on('contextmenu', function(event) {
            event.preventDefault(); // Prevent the context menu from appearing
            if(!gameOver) {
                postFlag(index);
            }
        });
    });
}

function startGame(firstChoiceIndex) {

    gameRunning = true;

    // Update clock
    timerInterval = setInterval(function() {
        seconds++;
        updateTimer();
    }, 1000);

    minesArray = createMinesArray(columnsNumber, minesNumber);

    // if first choice is a bomb, redistribute mines again
    // prevents instant boom
    while (minesArray[firstChoiceIndex] == 1) {
        minesArray = createMinesArray(columnsNumber, minesNumber);
    }

    [MinesCoords, SafesCoords] = getMinesCoordinates(minesArray);
    map = generateMap(minesArray, MinesCoords);

}

function createMinesArray(columnsNumber, minesNumber) {
    // creates an array with mines locations
    // 1 - mine, 0 - empty field

    const length = Math.pow(columnsNumber, 2);
    const zerosCount = length - minesNumber;

    // Create an array with 
    let array = new Array(zerosCount).fill(0);

    // Add mines randomly
    for (let i = 0; i < minesNumber; i++) {
        const randomIndex = Math.floor(Math.random() * array.length);
        array.splice(randomIndex, 0, 1);
    }

    return array;
}

function getMinesCoordinates(array) {
    // get mines array and add return coordinates array

    let minesCoordinates = [];
    let safesCoordinates = []

    for (i=0; i<array.length; i++) {
        if (array[i] == 1) {
            minesCoordinates.push(getCoordinates(i));
        }
        else {
            safesCoordinates.push(getCoordinates(i));
        }
    }
    return [minesCoordinates, safesCoordinates];
}

function generateMap(minesArray, minesCoordinates) {
    // iterate each safe field and check how many attached mines
    let map = []
    for (let i = 0; i < minesArray.length; i++) {
        if (minesArray[i] == 0) {
            // 0
            let counter = countAttachedMines(i, minesCoordinates);
            map.push(counter);
        } else {
            let counter = 'X';
            map.push(counter);
        }
    }
    return map;
}

function countAttachedMines(index, minesCoordinates) {
    // Count how many mines is attached to the index

    let [ax, ay] = getCoordinates(index);
    let counter = 0

    for (i = 0; i < minesCoordinates.length; i++) {

        let [bx, by] = minesCoordinates[i];

        let distance = Math.max(Math.abs(bx-ax), Math.abs(by-ay));
        if (distance == 1) counter++;
    }

    return counter;
}

function generateTiles(columnsNumber, tilesNumber) {
    // add tiles to the board

    var div_content = "";

    for (let i = 0; i <= tilesNumber - 1; i++) {
        div_content += '<div class="tile hidden-tile" id="t' + i + '"></div>';
    }
    $('#board').html(div_content);
    document.querySelector('#board').style.gridTemplateColumns = 'repeat(' + columnsNumber + ', 1fr)';
    
}

function getCoordinates(index) {
    // convert index to coordinates

    const x = index % columnsNumber;
    const y = Math.floor(index / columnsNumber);
    return [x, columnsNumber - 1 - y];
}

function getIndex(x, y) {
    // get index from coordinates

    return (columnsNumber-1-y)*columnsNumber+(x);
}
        
function reveal(index) {
    // Unhide selected tile

    if (!gameRunning) startGame(index);

    // Explode if mine is revealed
    if (map[index] == 'X') {
        boom(index); 
        return;
    }

    tile = document.querySelector('#t' + index)
    tile.className = '';
    tile.classList.add('tile');
    tile.classList.add('revealed-tile');
    tile.classList.add('v' + map[index])
    tile.innerHTML = map[index];

    updateCounters();

    // if tile value is not 0, end
    // if tile value is 0, reveal connected 0s and adjacent tiles
    if (map[index] != 0) return;

    // tile value is 0
    tile.classList.add('v0')
    
    // Check adjacent tiles (8 directions)
    const directions = [
        [-1, -1], [-1, 0],  [-1, 1],
        [0, -1] ,            [0, 1],
        [1, -1] ,  [1, 0],   [1, 1]
    ];

    const [x, y] = getCoordinates(index);

    // if adjacent tile value is 0, reveal it's neighbours
    for (const [dx, dy] of directions) {
        const newX = x + dx;
        const newY = y + dy;
        if (newX < 0 || newY < 0 || newX >= columnsNumber || newY >= columnsNumber) continue;
        const newIndex = getIndex(newX, newY);
        if(document.querySelector('#t' + newIndex).classList.contains('hidden-tile')) reveal(newIndex);
    }
}

function postFlag(index) {
    if (!gameRunning) startGame();

    const field = document.querySelector('#t' + index)
    // Remove or post flag
    if (field.classList.contains('flag')) {
        field.classList.remove('flag');
        field.innerHTML = ''
    } else if (field.classList.contains('hidden-tile')) {
        field.classList.add('flag');
        field.innerHTML = '🚩';
        checkWin();
    }
    updateCounters();
}


function boom(index) {
    // when this is run, explode and close the game

    gameOver = true;
    gameRunning = false;

    function revealNextMine(tileValue, id) {
        if (gameOver == false) {
            clearTimeout(boomTimeout);
            return;
        }
        let tile = document.querySelector('#t' + id);

        if (tileValue == 1 && id != index) {
            if (tile.classList.contains('flag')) {
                tile.classList.add('correct-flag')
        } else if (id != index) {
            tile.className = '';
            tile.classList.add('tile', 'mine');
            tile.innerHTML = "💣"
            }
        }
    }

    // Explode mines one by one for a nice effect
    minesArray.forEach((tileValue, id) => {
        boomTimeout = setTimeout(() => {
            revealNextMine(tileValue, id);
        }, randomIntFromInterval(300, 2000));
    });

    const mineField = document.querySelector('#t' + index)
  
    mineField.innerHTML = '💥';
    mineField.className = '';
    mineField.classList.add('tile', 'mine');

    ShowGameOver();
}

function ShowGameOver () {
        // Show the Game Over message
        const gameOverMessage = document.getElementById('game-over-message');
        gameOverMessage.style.display = 'flex';
    }

function ShowGameWon () {

        gameOver = true;
        gameRunning = false;

        // Show statistics
        document.getElementById("winner-mines").innerHTML = minesNumber
        document.getElementById("winner-seconds").innerHTML = seconds

        // Show the Game Won message
        const gameWonMessage = document.getElementById('game-won-message');
        gameWonMessage.style.display = 'flex';
}

function updateCounters() {
    // update mines counter
    var flagsCounter = minesNumber - document.querySelectorAll('.flag').length;
    document.querySelector('#mines-counter').innerHTML = flagsCounter;
}

function checkWin() {
    // Check if win conditions are met
    // Show winning screen if yes

    let correctCounter = 0

    minesArray.forEach((field, index) => {
        let isRevealed = document.querySelector('#t' + index).classList.contains('revealed-tile');
        let isFlagged = document.querySelector('#t' + index).classList.contains('flag');
        if ((isRevealed && field == 0) || (isFlagged && field == 1)) {
            correctCounter += 1;
        } else {
            return;
        }
    });
    if (correctCounter == tilesNumber) ShowGameWon();
}

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}
  
function updateTimer() {
    // Update clock
    if (gameRunning) {
        const timerElement = document.querySelector('#timer');
        timerElement.textContent = seconds;
    }
}

function levelChange(control) {
    // Change difficulty level
    level = control.value;
    initGame();
}