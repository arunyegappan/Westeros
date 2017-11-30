var socket = io.connect('http://localhost:8080');
var app = angular.module("westeros", []); 
var dbResponse;

app.controller("myCtrl", function($scope) {
      $scope.message = "";
      $scope.balance = 0;
      $scope.networth = 0;
      $scope.properties = 0;
      
      $scope.rollDice = function(){
         console.log('rolling the dice');
         socket.emit('rollDice', { playerId: sessionStorage.playerId }); 
    }

    $scope.showProperties = function()
    {      
          showPropertiesPopup();
    }
    //Game cannot start. Have to wait until server tells me to start.
    //disable roll button
    socket.on('wait',function(data){
        console.log('waiting for more players to join');
        $scope.message = "waiting for more players to join";
        $scope.disableButton = true;
        $scope.$apply();
    });

    socket.on('gameStart',function(data){
        console.log('Starting game. My player id is '+data.playerId);
        sessionStorage.playerId = data.playerId;
        sessionStorage.gameId = data.gameId;
        dbResponse = data.dbResponse;
        updateBoard(dbResponse);
        /*if($scope.disableButton)
        {
          rotateBoard(document.getElementById('gameboard'),180);
          rotateBoard(document.getElementById('dialogdiv'),180);
        }*/
       });
    
    socket.on('move',function(data){
      console.log(data);
      //animateMovement(data.playerId,data.diceNumber);
      dbResponse = data.dbResponse;

      animateMovement(data.playerId,data.from,data.to,data.diceNumber,dbResponse,data.requestAction);
      //processPlayerLanding(data.playerId,data.from,data.to,dbResponse,data.requestAction);
      
    });

    socket.on('nextPlayerTurn',function(data){
      console.log(data);
      //animateMovement(data.playerId,data.diceNumber);
      dbResponse = data.dbResponse;
      updateBoard(dbResponse);
    });

    updateBoard = function(dbResponse){
        $scope.balance = dbResponse.players[Number(sessionStorage.playerId)-1].balance;
        $scope.networth = dbResponse.players[Number(sessionStorage.playerId)-1].networth;
        $scope.disableButton = toggleRollButton(dbResponse);
        $scope.message = getNextTurn($scope.disableButton)+" turn";  
        $scope.properties = getProperties(dbResponse);       
        $scope.$apply();
    }

});

