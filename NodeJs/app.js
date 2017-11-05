var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

//Handle from post data
var bodyParser = require('body-parser');
var connections = [];

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
  console.log(connections);
  
  socket.emit('gameStart',{playerId:connections.length});


  socket.on('rollDice', function (data) {
      console.log("playerId" +data.playerId);
      var diceNumber = randomIntFromInterval(2,12);
      console.log("rollDice: "+diceNumber)
      io.sockets.emit('move', { playerId:data.playerId,diceNumber:diceNumber });
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

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function removePlayer(item)
{
var index = connections.indexOf(item);
connections.splice(index, 1);
}