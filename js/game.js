var socket = io.connect('http://localhost:8080');
var app = angular.module("westeros", []); 
app.controller("myCtrl", function($scope) {
    $scope.quantity = 1;
    
    socket.on('gameStart',function(data){
        console.log('player id: '+data.playerId);
        sessionStorage.playerId = data.playerId;
    });


    $scope.rollDice = function(){
       console.log('player turn');
       socket.emit('rollDice', { playerId: sessionStorage.playerId }); 
    }

    
    socket.on('move',function(data){
      console.log('move player'+data.playerId+' : ' + data.diceNumber);
      //animateMovement(data.playerId,data.diceNumber);
      movePlayerInUi(data.playerId,data.diceNumber);
  });

});

function movePlayerInUi(playerId,diceNumber)
{   
    document.getElementById(diceNumber).appendChild( document.getElementById('player'+playerId));
}

function animateMovement(playerId,diceNumber) {
  var elem = document.getElementById("player1"); 
  elem.classList.add("animation_down");
  var pos = 0;
  var id = setInterval(frame, 5);
  function frame() {
    if (pos == 350) {
      clearInterval(id);
      elem.classList.remove("animation_down");
      elem.style.top = '0px'; 
      elem.style.left = '0px'; 
      movePlayerInUi(playerId,diceNumber)
    } else {
      pos++; 
      elem.style.top = pos + 'px'; 
      elem.style.left = pos + 'px'; 
    }
  }
}


/*
function createInnerDivs()
{
    var i,j;
    var iDiv = document.createElement('div');
    iDiv.className = 'iDiv';
    var N = 30;
    var j = 1;
    for(var i=1;i<=N;i++)
  {
                
        var iDiv = document.createElement('div');
        if(i==1 || i==9 || i==22 || i==30)
        {
            iDiv.className = "corner";
            iDiv.id = j++;
        }
        else if(i==11 || i==14 || i==17 || i==20)
        {
            iDiv.className="middle";
        }
        else if(i==10 || i==12 || i==13 || i==15 || i==16 || i==18 || i==19 || i==21)
        {
            iDiv.className="vertical";
            iDiv.id = j++;
        }
        else
        {
            iDiv.className="horizontal";
            iDiv.id = j++;
        }
        
        iDiv.innerHTML = iDiv.id;
        
        console.log(" a "+iDiv.id);
       
        document.getElementById('gameboard').appendChild(iDiv);
    
    }
    //document.write('<br/>');
  
}

*/