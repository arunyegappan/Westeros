var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/westeros";
var gameId;
var dbResponse;
var ObjectID = require('mongodb').ObjectID;
var requestAction = false;

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

  socket.on('buy', function (data) {
      getDocumentFromDb(gameId, processBuyProperty,data);
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
        var action="none";
        var from = dbResponse.players[playerId-1].currentPositionInBoard;
        var nextPosition = dbResponse.players[playerId-1].currentPositionInBoard = findNextPositionInBoard(dbResponse,playerId,diceNumber)    
        var property = getProperty(dbResponse,nextPosition);
        if(property.color!="none")
        {
          switch(property.owner)
          {
            case "noone":
                      console.log("noone. Do you want to buy?");
                      requestAction = true;
                      action="buy";
                      dbResponse.nextTurn = "noone";
                      break;
            case playerId:
                      console.log("you are the owner. Do you want to build?");
                      requestAction = true;
                      action="build";
                      dbResponse.nextTurn = "noone";
                      break;
            default:
                      dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
                      requestAction = false;
                      console.log("some one else's property");
          }
        }
        else
        {
          //logic for valar morgulis, jail and non-color properties
          requestAction = false;
          dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
        }

        //console.log(dbResponse);
        updateDocument(gameId, dbResponse);
        io.sockets.emit('move', { requestAction: requestAction,action:action, from:from,to:nextPosition,playerId : playerId, diceNumber:diceNumber, dbResponse: dbResponse });
    }

function processBuyProperty(response,socketData){
    dbResponse = JSON.parse(response);
    playerId = socketData.playerId;   

    if(socketData.answer=="yes")
    {
        var currentPosition = dbResponse.players[playerId-1].currentPositionInBoard 
        var property = getProperty(dbResponse,currentPosition); 
        
        dbResponse.players[playerId-1].balance -= property.value;
        dbResponse.players[playerId-1].networth += property.value;
        dbResponse.properties[currentPosition-1].owner = playerId;
    }
    dbResponse.nextTurn = findNextTurn(dbResponse,playerId);
    updateDocument(gameId, dbResponse);
    io.sockets.emit('nextPlayerTurn',{dbResponse:dbResponse});
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

function getProperty(dbResponse,nextPosition){
  return dbResponse.properties[nextPosition-1];
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

function updateDocument(gameId, dbResponse){
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    delete dbResponse._id;
    db.collection("game").replaceOne({_id: ObjectID(gameId)}, dbResponse, true);
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
  "status": "InProgress",
  "numberOfPlayers": 2,
  "currentNumberOfPlayers": 2,
  "nextTurn": "1",
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
    "name": "start",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [0],
    "currentState": 0
  },{
    "id": 2,
    "name": "stormsend",
    "owner": "noone",
    "color": "brown",
    "value" : 200,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 3,
    "name": "dragonstone",
    "owner": "noone",
    "color": "brown",
    "value" : 180,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 4,
    "name": "valardohaeris",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 5,
    "name": "moatcailin",
    "owner": "noone",
    "color": "brown",
    "value" : 180,
    "buildValue": 100,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 6,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [50],
    "currentState": 0
  },{
    "id": 7,
    "name": "winterfell",
    "owner": "noone",
    "color": "blue",
    "value" : 320,
    "buildValue": 50,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 8,
    "name": "pyke",
    "owner": "noone",
    "color": "blue",
    "value" : 300,
    "buildValue": 60,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 9,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 10,
    "name": "castleblack",
    "owner": "noone",
    "color": "blue",
    "value" : 300,
    "buildValue": 80,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 11,
    "name": "casterlyrock",
    "owner": "noone",
    "color": "yellow",
    "value" : 200,
    "buildValue": 80,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 12,
    "name": "valardohaeris",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [10, 100, 200, 300],
    "currentState": 0
  },{
    "id": 13,
    "name": "crakehall",
    "owner": "noone",
    "color": "yellow",
    "value" : 100,
    "buildValue": 20,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 14,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [50],
    "currentState": 0
  },{
    "id": 15,
    "name": "cleganskeep",
    "owner": "noone",
    "color": "yellow",
    "value" : 160,
    "buildValue": 50,
    "rent": [5, 50, 150, 250],
    "currentState": 0
  },{
    "id": 16,
    "name": "valarmorghulis",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 100,
    "rent": [50],
    "currentState": 0
  },{
    "id": 17,
    "name": "meereen",
    "owner": "noone",
    "color": "orange",
    "value" : 280,
    "buildValue": 60,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 18,
    "name": "astapor",
    "owner": "noone",
    "color": "orange",
    "value" : 260,
    "buildValue": 40,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 19,
    "name": "gotojail",
    "owner": "noone",
    "color": "none",
    "value" : 0,
    "buildValue": 0,
    "rent": [50],
    "currentState": 0
  },{
    "id": 20,
    "name": "yunkai",
    "owner": "noone",
    "color": "orange",
    "value" : 260,
    "buildValue": 40,
    "rent": [15, 150, 250, 350],
    "currentState": 0
  },{
    "id": 21,
    "name": "qarth",
    "owner": "noone",
    "color": "green",
    "value" : 240,
    "buildValue": 50,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 22,
    "name": "slaversbay",
    "owner": "noone",
    "color": "green",
    "value" : 220,
    "buildValue": 40,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 23,
    "name": "nightswatch",
    "owner": "noone",
    "color": "white",
    "value" : 100,
    "buildValue": 20,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 24,
    "name": "braavos",
    "owner": "noone",
    "color": "green",
    "value" : 200,
    "buildValue": 40,
    "rent": [10, 50, 80, 100],
    "currentState": 0
  },{
    "id": 25,
    "name": "crasterskeep",
    "owner": "noone",
    "color": "white",
    "value" : 120,
    "buildValue": 10,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  },{
    "id": 26,
    "name": "hardhome",
    "owner": "noone",
    "color": "white",
    "value" : 100,
    "buildValue": 10,
    "rent": [5, 20, 50, 100],
    "currentState": 0
  }]
  }
  return db;
}