var express = require('express');
var router = express.Router();
const axios = require('axios');

/* DarkSky API */
const key = '<YOUR_API_KEY>';

// Fetch sequence
router.get('/', function(req, res, next) {
  // jQuery parameters received from client
  let latlng = req.query.latlng;
  let forecast = req.query.time;
  
  // Axios fetch (get)
  axios.get(`https://api.darksky.net/forecast/${key}/${latlng}?exclude=currently,minutely,hourly,alerts,flags&units=si`)
  .then(function(darkSky){
    // Processing
    let date = new Date(darkSky.data.daily.data[forecast].time * 1000);
    let year = date.getFullYear();
    let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let month = months[date.getMonth()];
    let day = date.getDate();
    let ftime = day + ' ' + month + ' ' + year;
    let timezone = darkSky.data.timezone;
    let summary = darkSky.data.daily.summary;
    
    let s_format = Math.trunc(darkSky.data.daily.data[0].precipProbability*100) + "%";
    let result = [ftime, s_format, timezone, summary];
    
    // Result ready. Send back to client. 
    res.send(result);

  })
  .catch(function(error){
    console.log(error);
  });
  
});

module.exports = router;
