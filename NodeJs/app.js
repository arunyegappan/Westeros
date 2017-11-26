var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/westeros";
var gameId;
var dbResponse;

//Handle from post data
var bodyParser = require('body-parser');
var connections = [];
var numberOfConnections = 2;

app.use(bodyParser.urlencoded({ extended: true })); 

//app.use(express.bodyParser());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


server.listen(8080, function() {
  console.log('Server running at http://127.0.0.1:8080/');
});

//handle socket connections
io.sockets.on('connection', function(socket) {
  
  connections.push(socket.id); 
  //console.log(connections);
  
  //wait until u have min required players to start a game
  if(connections.length == numberOfConnections)
  {
    //game can start. We Have required number of players
    //create new document in db for this game
    dbResponse = getInitialDb();
    createNewDocumentInDb(dbResponse, function(id) {
      gameId = id;  
    });
    
  }
  else
  {
    //tell the connected client to wait until other players join
    console.log('waiting for more players to join');
    socket.emit("wait");
  }

  //socket request handlers

  socket.on('rollDice', function (data) {
      getDocumentFromDb(gameId, processRollDice,data);
    });

  socket.on('closeConnection',function(){
      console.log('Client disconnects'  + socket.id);
      socket.disconnect();
      removePlayer(socket.id);
  });

  socket.on('disconnect', function() {
      console.log('Got disconnected!'  + socket.id);
      socket.disconnect();
      removePlayer(socket.id);
   });
});


function processRollDice(response,socketData){
        dbResponse = JSON.parse(response);
        playerId = socketData.playerId;
        var diceNumber = randomIntFromInterval(2,6);
        dbResponse.players[playerId-1].currentPositionInBoard = findNextPositionInBoard(dbResponse,playerId,diceNumber)    
        dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
        console.log(dbResponse);
        io.sockets.emit('move', { requestAction: false, movePlayer: dbResponse.nextTurn, from:1,to:dbResponse.players[playerId-1].currentPositionInBoard,diceNumber:diceNumber, dbResponse: dbResponse });
}

function findNextTurn(dbResponse,playerId){
  return playerId == 1 ? 2 : 1;
}

function findNextPositionInBoard(dbResponse,playerId,diceNumber){
  var newPosition;
  dbResponse.players.forEach(function(player){
          if (player.id == playerId) {
            //TODO: do updates here
            newPosition = player.currentPositionInBoard + diceNumber;
            if(newPosition > 26) {
              newPosition = newPosition - 26;
            } 
          }
        });

  return newPosition;
}

function getDocumentFromDb(gameId, callback,socketData) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection('game', function(error, collection) {
      collection.findOne({_id: gameId}, function(err, response) {
        if (err) throw err;
        var stringified = JSON.stringify(response);
        callback(stringified,socketData);
      });
    });
  });
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function removePlayer(item)
{
var index = connections.indexOf(item);
connections.splice(index, 1);
}


function createNewDocumentInDb(dbResponse, callback) {
  var gameId;
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      db.collection("game").insertOne(dbResponse, function(err, res) {
        if (err) throw err;
        console.log("Game created in DB");
        db.close();
        gameId = dbResponse._id;
        startGame(gameId);
        callback(gameId);
      });
    });
}

function startGame(gameId)
{
    console.log('starting game');
    //tell all clients to start the game and send their respective player id 
    for(var i=0; i<connections.length;i++)
    {
      var playerId = i + 1;
      io.to(connections[i]).emit('gameStart',{gameId:gameId,playerId:playerId,dbResponse:dbResponse});
    }
}



function getInitialDb()
{
  var db = {
  "status": "InProgess",
  "numberOfPlayers": 2,
  "currentNumberOfPlayers": 2,
  "nextTurn": 1,
  "players": [{
      "id": 1,
      "balance": 1500,
      "networth": 1500,
      "status": "playing",
      "currentPositionInBoard": 1
    },
    {
      "id": 2,
      "balance": 1500,
      "networth": 1500,
      "status": "playing",
      "currentPositionInBoard": 1
    }
  ],
  "properties": [{
    "id": 1,
    "name": "winterfell",
    "owner": "noone",
    "color": "blue",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 2,
    "name": "pyke",
    "owner": "noone",
    "color": "blue",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 3,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 4,
    "name": "castleblack",
    "owner": "noone",
    "color": "blue",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 5,
    "name": "casterlyrock",
    "owner": "noone",
    "color": "yellow",
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 6,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 7,
    "name": "crakehall",
    "owner": "noone",
    "color": "yellow",
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 8,
    "name": "cleganskeep",
    "owner": "noone",
    "color": "yellow",
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 9,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 10,
    "name": "meereen",
    "owner": "noone",
    "color": "orange",
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 11,
    "name": "astapor",
    "owner": "noone",
    "color": "orange",
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 12,
    "name": "yunkai",
    "owner": "noone",
    "color": "orange",
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 13,
    "name": "qarth",
    "owner": "noone",
    "color": "green",
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 14,
    "name": "slaversbay",
    "owner": "noone",
    "color": "green",
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 15,
    "name": "nightswatch",
    "owner": "noone",
    "color": "white",
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 16,
    "name": "braavos",
    "owner": "noone",
    "color": "green",
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 17,
    "name": "crasterskeep",
    "owner": "noone",
    "color": "white",
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 18,
    "name": "hardhome",
    "owner": "noone",
    "color": "white",
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 19,
    "name": "stormsend",
    "owner": "noone",
    "color": "brown",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 20,
    "name": "dragonstone",
    "owner": "noone",
    "color": "brown",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 21,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 22,
    "name": "moatcailin",
    "owner": "noone",
    "color": "brown",
    "rent": [10, 100, 200, 300],
    "currentState": 0
  }]
  }
  return db;
}