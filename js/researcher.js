var socket = io.connect('localhost:3000');

//Socket connection getting the rss feed and inserting it into a table in the researchers web page
socket.on('feedData', function(feedData) {
	var rssTable = document.getElementById("rssData");
	var feedD = feedData.items;
	for (i=0; i< feedD.length; ++i) {
		var row = rssTable.insertRow();
		var cell1 = row.insertCell(0);
		var cell2 = row.insertCell(1);
		var cell3 = row.insertCell(2);
		cell1.innerHTML = "<a href='" + feedD[i].link  + "'>" + feedD[i].title  + "</a>";
		cell2.innerHTML = feedD[i].contentSnippet;
		cell3.innerHTML = feedD[i].pubDate;
	}	
});
	
//Loading the activity for all patients in database and inserting it into a table 
socket.on('therapiesRese', function(therapiesRese) {
	//Table in the HTML
	var therTable = document.getElementById('therSession');
	//Variable used in the function for editing the notes
	var count = 1;
	for (i=0; i<therapiesRese.length; ++i) {
		for (j=0; j<therapiesRese[i].testSessions.length; ++j) {
			var testSession = therapiesRese[i].testSessions[j];
			var user_IDmed = therapiesRese[i].User_IDmed;
			//Variable for inserting rows into the table
			var row = therTable.insertRow();
			//Variables for inserting the cells to the selected rows
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);
			var cell3 = row.insertCell(2);
			var cell4 = row.insertCell(3);
			var cell5 = row.insertCell(4);
			var cell6 = row.insertCell(5);
			//Appending data to the table cells
			cell1.innerHTML = therapiesRese[i].name;
			cell2.innerHTML = therapiesRese[i].username;
			cell3.innerHTML = testSession.test_SessionID;
			cell4.innerHTML = '<span onclick="loadData(this);">' + testSession.DataURL + '</span>';
			cell5.innerHTML = testSession.note;
			cell6.innerHTML = therapiesRese[i].Dosage;

			//Function for updating/inserting the notes in the table, using the variable count since the data from the for loop didn't work.
			$("#therSession > tr:nth-child(" + (count) + ") > td:nth-child(5)").click({noteID: testSession.noteID, sessionID: testSession.test_SessionID, user_IDmed: user_IDmed}, function(event) {
            	//If the note is clicked it won't display another input
            	if($(this).children("input").length > 0)
               		return false;
               	//Var for the text
            	var tdObj = $(this);
            	//Var for the old text, before the text is updated correctly, used for resetting the input if the user clicks esc instead of enter
            	var preText = tdObj.html();
            	var inputObject = $("<input type='text' />");
            	tdObj.html("");
            	inputObject.width(tdObj.width())
	                .height(tdObj.height())
	                .css({border:"0px",fontSize:"15px"})
	                .val(preText)
	                .appendTo(tdObj)
	                .trigger("focus")
	                .trigger("select");
	            //Function for key events
           		inputObject.keyup(event.data, function(event) {
           			// 13 = Enter-key, if it's clicked it will update the note with the new value
	                if(13 == event.which) {
	                    var text = $(this).val();
	                    tdObj.html(text);
	                    //Emitting the data to the server so it can be sent in a query to the database
	                    socket.emit('updateNote', {noteID: event.data.noteID, text: text, sessionID: event.data.sessionID , user_IDmed: event.data.user_IDmed});
                		// 27 = Esc, If Esc-key is clicked the text will reset to the old value
                	} else if(27 == event.which) {  
                    	tdObj.html(preText);
                	}
              	});
            	inputObject.click(function() {
                    return false;
            	});
        	});
        	count++;
		}
	}
});

//Using d3 to laod the csv file and specifying the url with the dataUrl variable 
function loadData(element){
  	$('#svgContainer').empty();
	var dataUrl = $(element)[0].innerHTML;
	d3.csv(dataUrl + ".csv").then(function (data) {
		var points = [];
		//retrieving the x and y points was from the csv file and pushing them into the array variable points
			for (var i = data.length - 1; i >= 0; i--) {
				points.push({
					"x": data[i].X,
					"y": data[i].Y,
					"time": data[i].time
				});
			}
			//Creating the line variable and adding x and y
			var line = d3.line()
				.x(function(d){return d.x})
				.y(function(d){return d.y})
				.curve(d3.curveLinear);
			//creating svg
			var svgC = d3.select("#svgContainer").append("svg")
				.attr("width", 300)
				.attr("height", 300);
				
				//adding the lines to the svg
			var lineG = svgC.append("path")
				.attr("d", line(points))
				.attr("stroke", "green")
				.attr("stroke-width", 2)
				.attr("fill", "none")		
	});
}

//Using jquery to hide/show divs for the researcher web page
$(document).ready(function(){
 
$("#rss").removeClass("active");
	$("#rssFeed").hide();
	$("#rss").click(function() {
		$("#therSess").removeClass("active");
		$("#rss").addClass("active");
		$("#sessFeed").hide();
		$("#exData").hide();
		$("#rssFeed").show();
	});

	$("#therSess").click(function() {
		$("#rss").removeClass("active");
		$("#therSess").addClass("active");
		$("#rssFeed").hide();
		$("#exData").show();
		$("#sessFeed").show();
	});

});