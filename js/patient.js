var socket = io.connect('localhost:3000');

//Loading some data for patient with the id 3, using the same socket as I am using for the physician
socket.on('therapiesPhys', function(therapiesPhys) {
    //Removing the data before loading new data to avoid duplicates
    $("#patientData").empty();
    //looping through the data and selecting the data I want
    for (i=0; i<therapiesPhys.length; ++i) {
        for (j=0; j<therapiesPhys[i].testSessions.length; ++j) {
            var testSession = therapiesPhys[i].testSessions[j];
           //Parsing the date and removing the text "GMT+0100 (centraleuropeisk normaltid)" from the date output
            new Date(testSession.dateTime);
            var d = new Date(testSession.dateTime);
            var date = d.toString();
            $("#patientData").append("<span class='inline'><p>Session: " + testSession.test_SessionID + "</p><p>" + date.replace("GMT+0100 (centraleuropeisk normaltid)", "") + "</p></span>");
        }
    }
});

//Using jQuery's document.ready function so my code doesn't execute before the page is successfully loaded
$(document).ready(function(){
//jQuery's get method, specifying what part of the data I want, the channel id and last but not least my API key
$.get("https://www.googleapis.com/youtube/v3/channels", {
    part: 'contentDetails',
    id: 'UClG8OYQyEAVELFT1T4XU0Wg',
    key: 'AIzaSyD19Hdf1oKt_cwvfQHnhV51aIW8O4caago'
}, 
    //Using jQuery's .each functionality for looping through the data and selecting what data I want. The "videos" consist of the playlistId which I'm using in the function below
    function(data){
        $.each(data.items, function(i, item) {
        videos = item.contentDetails.relatedPlaylists.uploads;
        loadVideos(videos);
        });
    });
    //Getting the videos with the playlistId that I retrieved in the function above. Also selecting the part "snippet" (you can see an image of this callback in the documentation) and limiting the results to 8 videos and again I am specifying my API key 
    function loadVideos(videos) {
        $.get("https://www.googleapis.com/youtube/v3/playlistItems", {
            part: 'snippet',
            maxResults: 8,
            playlistId: videos,
            key: 'AIzaSyD19Hdf1oKt_cwvfQHnhV51aIW8O4caago'
        },
            //Looping out the title with label tags and the videos into iframe tags in the HTML page where the id videos exists
            function (data) {
                var data;
                $.each(data.items, function (i, item) {
                   var video = item.snippet.resourceId.videoId;
                   var title = item.snippet.title;
                    $("#videos").append("<div><label>" + title + "</label><iframe src='//www.youtube.com/embed/" + video + "'></iframe></div>");
                });
            });
    }
});


