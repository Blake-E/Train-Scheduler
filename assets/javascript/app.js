 // Initialize Firebase
 var config = {
  apiKey: "AIzaSyDtLefK_pVKnxPBr_h0f1vGDHTQkNLr8VE",
    authDomain: "train-scheduler-ead26.firebaseapp.com",
    databaseURL: "https://train-scheduler-ead26.firebaseio.com",
    projectId: "train-scheduler-ead26",
    storageBucket: "train-scheduler-ead26.appspot.com",
    messagingSenderId: "305571801851"
  };
  firebase.initializeApp(config);
  var database = firebase.database();
  
  var data; 
  database.ref().on("value", function(snapshot) {
    data = snapshot.val();
    refreshTable();
  }); 
  
  // Submit button click, collect values and update firebase
  $("#addTrainButton").on('click', function(){
  
    // Collect values from the HTML form
    var trainName = $("#nameInput").val().trim();
    var trainDestination = $("#destinationInput").val().trim();
    var trainFirstArrivalTime = $("#firstArrivalInput").val().trim();
    var trainFreq = $("#frequencyInput").val().trim();
  
    // Checks for user inputs  
    if(trainName == "" || trainName == null){
      alert("Please enter a Train Name!");
      return false;
    }
    if(trainDestination == "" || trainDestination == null){
      alert("Please enter a Train Destination!");
      return false;
    }
    if(trainFirstArrivalTime == "" || trainFirstArrivalTime == null){
      alert("Please enter a First Arrival Time!");
      return false;
    }
    if(trainFreq == "" || trainFreq == null || trainFreq < 1){
      alert("Please enter an arrival frequency (in minutes)!" + "\n" + "It must be an integer greater than zero.");
      return false;
    }
    // Parse the First Arrival Time to Check if its in military time
    if(trainFirstArrivalTime.length != 5 || trainFirstArrivalTime.substring(2,3) != ":"){
      alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
      return false;
    }
    // Check for that Numbers are to the left and right of the semi-colon
    else if( isNaN(parseInt(trainFirstArrivalTime.substring(0, 2))) || isNaN(parseInt(trainFirstArrivalTime.substring(3))) ){
      alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
      return false;
    }
    // Check if left hand side is from 00 to 23 
    else if( parseInt(trainFirstArrivalTime.substring(0, 2)) < 0 || parseInt(trainFirstArrivalTime.substring(0, 2)) > 23 ){
      alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
      return false;
    }
    // Check if right hand side is from 00 to 59
    else if( parseInt(trainFirstArrivalTime.substring(3)) < 0 || parseInt(trainFirstArrivalTime.substring(3)) > 59 ){
      alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
      return false;   
    }
    // Edit the First Arrival Time to include the date of new data submission (for use in moment.js)
    // Collect the date upon user click
    var today = new Date();
    var thisMonth = today.getMonth() + 1;
    var thisDate = today.getDate();
    var thisYear = today.getFullYear();
  
    // Create a String from the Date 
    var dateString = "";
    var dateString = dateString.concat(thisMonth, "/", thisDate, "/", thisYear);
  
    // Create a Date and Time String for Storage
    var trainFirstArrival = dateString.concat(" ", trainFirstArrivalTime);
  
    // Push New Data to FireBase
    database.ref().push({
      name: trainName,
      destination: trainDestination,
      firstArrival: trainFirstArrival,
      frequency: trainFreq
    });
  
    // Clear Input Fields After successful submission
    $("#nameInput").val("");
    $("#destinationInput").val("");
    $("#firstArrivalInput").val("");
    $("#frequencyInput").val("");
  
    // Prevent Default Refresh of Submit Button
    return false;
  });  
  
  // Function to Update the HTML Table on the DOM
  function refreshTable(){
  
    // Clear Old Data from Browser Table
    $('.table-body-row').empty();
  
    // Initialize Array of Objects
    var arrayOfObjects = [];
  
    // Initialize Array of Minutes Left to Departure
    var arrayOfTimes = [];

    // Parse & Scrub the Firebase Data and then Append to HTML Table
    $.each(data, function(key, value){

      // Collect variables
      var trainName = value.name;
      var trainDestination = value.destination;
      var trainFreq = value.frequency;
      var trainFirstArrivalTime = value.firstArrival;
      
      // Initialize variables to be calculated
      var trainNextDeparture;
      var trainMinutesAway;
  
      // Calculate values using Moment.js
      var convertedDate = moment(new Date(trainFirstArrivalTime));
      
      // Find How Many Minutes Ago the very First Train Departed
      var minuteDiffFirstArrivalToNow = moment(convertedDate).diff( moment(), "minutes")*(-1);
  
        // Negative Value - If the Train never arrived yet
        if(minuteDiffFirstArrivalToNow <= 0){
  
          // Train Departure = Current Time - First Arrival Time
          trainMinutesAway = moment(convertedDate).diff( moment(), "minutes");
  
          // Next Depature Time = First Departure Time
          trainNextDepartureDate = convertedDate;
  
        }
        // Otherwise, the train arrvied in the past, so do the math
        else{
  
          // Next Train Departure = Frequency
          trainMinutesAway = trainFreq - (minuteDiffFirstArrivalToNow % trainFreq);
  
          // Next Departure Time = Current Time + Minutes Away
          var trainNextDepartureDate = moment().add(trainMinutesAway, 'minutes');
        }
        
      // Re-Format Time to AM/PM
      trainNextDeparture = trainNextDepartureDate.format("hh:mm A");

      // Create a new Object for the train locally 
      var newObject = {
        name: trainName,
        destination: trainDestination,
        freq: trainFreq,
        nextDeparture: trainNextDeparture,
        minAway: trainMinutesAway
      };
  
      // Push the new Object to the array of Objects
      arrayOfObjects.push(newObject);
  
      // Push the time left until depature to the array of Times
      arrayOfTimes.push(trainMinutesAway);
  
    });
  
    // Sort the array of Time from smallest to largest
    arrayOfTimes.sort(function(a, b){return a-b});
  
    // Remove any duplicate values from the array
    $.unique(arrayOfTimes)
      
    // Loop through all the time values and append the values to the HTML Table in order of departure time
    for(var i = 0; i < arrayOfTimes.length; i++){
  
      // First Loop checks through all the times, second loop checks if any of the objects match that time
      for(var j = 0; j < arrayOfObjects.length; j++){
  
        // The object's minutes to departue equals the next lowest value
        if(arrayOfObjects[j].minAway == arrayOfTimes[i]){
  
          // Append the Object's elements to the HTML Table
            // Append New HTML Table Row
          var newRow = $('<tr>');
          newRow.addClass("table-body-row");
  
            // Create New HTML Data Cells
          var trainNameTd = $('<td>');
          var destinationTd = $('<td>');
          var frequencyTd = $('<td>');
          var nextDepartureTd = $('<td>');
          var minutesAwayTd = $('<td>');
  
            // Add text to the HTML Data Cells
          trainNameTd.text(arrayOfObjects[j].name);
          destinationTd.text(arrayOfObjects[j].destination);
          frequencyTd.text(arrayOfObjects[j].freq);
          nextDepartureTd.text(arrayOfObjects[j].nextDeparture);
          minutesAwayTd.text(arrayOfObjects[j].minAway);
  
            // Append HTML Data Cells to the new Row
          newRow.append(trainNameTd);
          newRow.append(destinationTd);
          newRow.append(frequencyTd);
          newRow.append(nextDepartureTd);
          newRow.append(minutesAwayTd);
  
          // Append new Row to the HTML Table
          $('.table').append(newRow);
  
        };
      };
    };
  };

  // Update the Current Time every second
  var timeStep = setInterval(currentTime, 1000);
  
  function currentTime(){
    var timeNow = moment().format("hh:mm:ss A");
    $("#current-time").text(timeNow);
  
    // Refresh the Page every minute
    var secondsNow = moment().format("ss");
    if(secondsNow == "00"){
      refreshTable();
    };
  };