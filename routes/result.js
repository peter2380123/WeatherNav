var express = require('express');
var router = express.Router();
const axios = require('axios');

/* DarkSky API */
const key = '3a99ff2b11da6f628cbc490e08c7c80b';

router.get('/', function(req, res, next) {
  // let latlng = req.query.lat + "," + req.query.lng;
  let latlng = req.query.latlng;
  let forecast = req.query.time;
  
  axios.get(`https://api.darksky.net/forecast/${key}/${latlng}?exclude=currently,minutely,hourly,alerts,flags`)
  .then(function(darkSky){
    // console.log(darkSky);
    let date = new Date(darkSky.data.daily.data[forecast].time * 1000);
    let year = date.getFullYear();
    let months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let month = months[date.getMonth()];
    let day = date.getDate();
    let ftime = day + ' ' + month + ' ' + year;
    
    let s_format = Math.trunc(darkSky.data.daily.data[0].precipProbability*100) + "%";
    let result = [ftime, s_format];
    res.send(result);

  })
  .catch(function(error){
    console.log(error);
  });
  
});

module.exports = router;
