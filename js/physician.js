var socket = io.connect('localhost:3000');

//Loading the physician's patient data using socket and after I've iterated 
socket.on('therapiesPhys', function(therapiesPhys) {
	$("#activity").empty();
	var therTable = document.getElementById('activity');
	for (i=0; i<therapiesPhys.length; ++i) {
		for (j=0; j<therapiesPhys[i].testSessions.length; ++j) {
			var testSession = therapiesPhys[i].testSessions[j];
			var row = therTable.insertRow();
			var cell1 = row.insertCell(0);
			var cell2 = row.insertCell(1);
			var cell3 = row.insertCell(2);
			var cell4 = row.insertCell(3);
			var cell5 = row.insertCell(4);
			var cell6 = row.insertCell(5);
			cell1.innerHTML = therapiesPhys[i].name;
			cell2.innerHTML = testSession.test_SessionID;
			cell3.innerHTML = therapiesPhys[i].username;
			cell4.innerHTML = '<span onclick="loadPatData(this);">' + testSession.DataURL + '</span>';
			cell5.innerHTML = testSession.note;
			cell6.innerHTML = therapiesPhys[i].Dosage;
		}
	}
});



function loadPatData(element){
	//emptying the svg container
	$('#svgContainer').empty();
	//the variable dataUrl is determined by which csv file the user click on in the table (Data column)
	var dataUrl = $(element)[0].innerHTML;
	d3.csv(dataUrl + ".csv").then(function (data) {
		var points = [];
		//retrieving the x and y points was from the csv file and pushing them into the array variable called points
			for (var i = data.length - 1; i >= 0; i--) {
				points.push({
					"x": data[i].X,
					"y": data[i].Y,
					//"time": data[i].time
				});
			}
			//Creating the line with x and y values
			var line = d3.line()
				.x(function(d){return d.x})
				.y(function(d){return d.y})
				.curve(d3.curveLinear);
			//creating svg and appending it to the HTML page
			var svgC = d3.select("#svgContainer").append("svg")
				.attr("width", 300)
				.attr("height", 300);
			//adding the lines to svg
			var lineG = svgC.append("path")
				.attr("d", line(points))
				.attr("stroke", "green")
				.attr("stroke-width", 2)
				.attr("fill", "none")
	});
}