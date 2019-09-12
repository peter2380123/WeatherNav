//-----------------------------------------------------------------------------------//
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script
// src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false,
    center: {lat: -27.46794, lng: 153.02809},
    zoom: 13,
    streetViewControl: false
  });


  
  new AutocompleteDirectionsHandler(map);
}

// client-side saved waypoints
var waypts = [];

/**
 * @constructor
 */
function AutocompleteDirectionsHandler(map) {
  this.map = map;
  this.originPlaceId = null;
  this.destinationPlaceId = null;
  this.travelMode = 'DRIVING';
  this.directionsService = new google.maps.DirectionsService;
  this.directionsRenderer = new google.maps.DirectionsRenderer;
  this.directionsRenderer.setMap(map);

  var originInput = document.getElementById('origin-input');
  var destinationInput = document.getElementById('destination-input');
  var stopoverInput = document.getElementById('stopover-input');
  var clearStops = document.getElementById('clear-all-button');
  var stopList = document.getElementById('right-panel');
  let dropdownList = document.getElementById('dropdown-list');
  let copyrightControl = document.getElementById('copyright');

  var originAutocomplete = new google.maps.places.Autocomplete(originInput);
  // Specify just the place data fields that you need.
  originAutocomplete.setFields(['place_id', 'geometry']);

  var destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
  // Specify just the place data fields that you need.
  destinationAutocomplete.setFields(['place_id', 'geometry']);

  var stopoverAutocomplete = new google.maps.places.Autocomplete(stopoverInput);
  stopoverAutocomplete.setFields(['place_id', 'geometry']);

  // Setup click event listener at clear button
  this.setupClickListener('clear-all-button')

  this.setupPlaceChangedListener(originAutocomplete, 'ORIG');
  this.setupPlaceChangedListener(destinationAutocomplete, 'DEST');
  this.setupPlaceChangedListener(stopoverAutocomplete, 'STOP');

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(destinationInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(stopoverInput);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(stopList);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(clearStops);

  // Try add dropdown list @ top left
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(dropdownList);

  this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(copyrightControl);
}

// Handles event upon clear button being clicked
AutocompleteDirectionsHandler.prototype.setupClickListener = function(id) {
  var clearAllButton = document.getElementById(id);
    var me = this;
    clearAllButton.addEventListener('click', function(){
      if(waypts.length == 0) // only clear stops if there's content (prevents routing spam)
      {
        return;
      }
      waypts = [];
      document.getElementById('stops').innerHTML = "";
      document.getElementById('rain-chance').innerHTML = "";
      document.getElementById('date-list').innerHTML = "";
      me.route();
      console.log('Re-routing after stop clear');
    });
  };

AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function(
    autocomplete, mode) {
  var me = this;
  autocomplete.bindTo('bounds', this.map);

  autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();

    if (!place.place_id) {
      window.alert('Please select an option from the dropdown list.');
      return;
    }
    let forecast = document.getElementById('dropdown-list').value; // Of what day are we forcasting?

    if (mode === 'ORIG') {
      me.originPlaceId = place.place_id;
      // addOrigin(place); // DEPRECATED
      updateOD(place, forecast, 'origin-date', 'origin-rain');
      document.getElementById('origin-text').innerHTML = "Origin: " + document.getElementById('origin-input').value;
    } else if (mode === 'DEST') {
      me.destinationPlaceId = place.place_id;
      // addDest(place); // DEPRECATED
      updateOD(place, forecast, 'dest-date', 'dest-rain');
      document.getElementById('dest-text').innerHTML = "Dest: " + document.getElementById('destination-input').value;
    } else if (mode === 'STOP') { // this should keep track to stopovers
      if(!me.destinationPlaceId || !me.destinationPlaceId){
        alert("Please set origin and destination first.")
        document.getElementById('stopover-input').value = ""; // clears input textbox
        return
      }
      if(waypts.length >= 8){
        alert("You have reached the limit of 10 total waypoints!");
        document.getElementById('stopover-input').value = ""; // clears input textbox
        return
      }
      me.stopoverPlaceId = place.place_id;
      addStopover(place, forecast);
      
    }
    me.route();
  });
};

function addOrigin(place){ // DEPRECATED
  let li = document.getElementById('origin-rain');
  let time = document.getElementById('forcast-time');
  // try fetch
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue()
    },
    // processData: false,
    success: function(response) {
      // response behavior
      time.textContent = response[0];
      li.textContent = response[1];
    }
  });
  // end try fetch
}

function updateOD(place, forecast, dateId, rainId){
  let dateLi = document.getElementById(dateId);
  let rainLi = document.getElementById(rainId);
  // try fetch
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: forecast
    },
    // processData: false,
    success: function(response) {
      // response behavior
      dateLi.textContent = response[0];
      rainLi.textContent = response[1];
    }
  });
  // end try fetch
}

function addDest(place){ // DEPRECATED
  let li = document.getElementById('dest-rain');
  // try fetch
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue()
    },
    // processData: false,
    success: function(response) {
      // response behavior
      li.textContent = response;
    }
  });
  // end try fetch
}

function addStopover(place, forecast){
  var waypointElmts = document.getElementById('stopover-input').value;
  var ol = document.getElementById('stops');
  var li = document.createElement('li');
  let ul = document.getElementById('date-list');
  let li2 = document.createElement('li');
  let ul2 = document.getElementById('rain-chance');  
  let li3 = document.createElement('li');

  // log stop info on pagination
  li.textContent = waypointElmts;
  ol.appendChild(li);
    
  // try fetch
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: forecast
    },
    // processData: false,
    success: function(response) {
      /* response behavior */
      // log date info
      li2.textContent = response[0];
      ul.appendChild(li2);
      // log rain chance
      li3.textContent = response[1];
      ul2.appendChild(li3); 
    }
  });
  // end try fetch

  if(waypointElmts.length > 0) // sanity check (?)
  {
    waypts.push({
      location: waypointElmts,
      stopover: true
    });
    document.getElementById('stopover-input').value = ""; // clears input textbox
  }
  
}

AutocompleteDirectionsHandler.prototype.route = function() {
  if (!this.originPlaceId || !this.destinationPlaceId) {
    return;
  }
  
  var me = this;

  this.directionsService.route(
      {
        origin: {'placeId': this.originPlaceId},
        destination: {'placeId': this.destinationPlaceId},
        waypoints: waypts,
        optimizeWaypoints:false,
        travelMode: 'DRIVING'
      },
      function(response, status) {
        if (status === 'OK') {
          me.directionsRenderer.setDirections(response);
        } else {
          window.alert('Directions request failed due to ' + status + '\nIf an impossible stop is lodged, please clear all stops and redo.');
        }
      });
};

//-----------------------------------------------------------------------------------//