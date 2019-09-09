//-----------------------------------------------------------------------------------//
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script
// src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false,
    center: {lat: -33.8688, lng: 151.2195},
    zoom: 13,
    streetViewControl: false
  });

  new AutocompleteDirectionsHandler(map);
}

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

  var originAutocomplete = new google.maps.places.Autocomplete(originInput);
  // Specify just the place data fields that you need.
  originAutocomplete.setFields(['place_id']);

  var destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
  // Specify just the place data fields that you need.
  destinationAutocomplete.setFields(['place_id']);

  var stopoverAutocomplete = new google.maps.places.Autocomplete(stopoverInput);
  stopoverAutocomplete.setFields(['place_id']);

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
}

// Handles event upon clear button being clicked
AutocompleteDirectionsHandler.prototype.setupClickListener = function(id) {
    var clearAllButton = document.getElementById(id);
    var me = this;
    clearAllButton.addEventListener('click', function(){
      waypts = [];
      document.getElementById('stops').innerHTML = "";
      me.route();
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
    if (mode === 'ORIG') {
      me.originPlaceId = place.place_id;
    } else if (mode === 'DEST') {
      me.destinationPlaceId = place.place_id;
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
      addStopover(place.place_id);
    }
    me.route();
  });
};

function addStopover(place_id){
  var waypointElmts = document.getElementById('stopover-input').value;
  var ol = document.getElementById('stops');
  var li = document.createElement('li');
  var order = String.fromCharCode('B'.charCodeAt()+waypts.length);
  li.textContent = order+ ". " + waypointElmts;
  ol.appendChild(li);

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
          window.alert('Directions request failed due to ' + status);
        }
      });
};

//-----------------------------------------------------------------------------------//