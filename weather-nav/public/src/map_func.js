// Global initialisation - only if absolutely necessary
var map;
var markers = []; 
// client-stored waypoints
var waypts = [];

// Initialise Google Maps
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    mapTypeControl: false,
    // Pan the map to Brisbane
    center: {lat: -27.46794, lng: 153.02809},
    zoom: 13,
    streetViewControl: false
  });

  new AutocompleteDirectionsHandler(map);
}

/**
 * @constructor Autocomplete and direction handler provided by Google Maps
 */
function AutocompleteDirectionsHandler(map) {
  // Map and properties initialisation
  this.map = map;
  this.originPlaceId = null;
  this.destinationPlaceId = null;
  this.travelMode = 'DRIVING';
  this.directionsService = new google.maps.DirectionsService;
  this.directionsRenderer = new google.maps.DirectionsRenderer;
  this.directionsRenderer.setMap(map);

  // Acquire HTML elements
  let originInput = document.getElementById('origin-input');
  let destinationInput = document.getElementById('destination-input');
  let stopoverInput = document.getElementById('stopover-input');
  let clearStops = document.getElementById('clear-all-button');
  let clearPopup = document.getElementById('clear-popup');
  let stopList = document.getElementById('right-panel');
  let quickSearchInput = document.getElementById('quick-search-input');
  let dropdownList = document.getElementById('dropdown-list');
  let copyrightControl = document.getElementById('copyright');

  // Origin input
  let originAutocomplete = new google.maps.places.Autocomplete(originInput);
  // Specify just the place data fields needed.
  originAutocomplete.setFields(['place_id', 'geometry']);

  // Destination input
  let destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
  destinationAutocomplete.setFields(['place_id', 'geometry']);

  // Stopover input
  let stopoverAutocomplete = new google.maps.places.Autocomplete(stopoverInput);
  stopoverAutocomplete.setFields(['place_id', 'geometry']);

  // Quick search input 
  let quickSearchAutocomplete = new google.maps.places.Autocomplete(quickSearchInput);
  quickSearchAutocomplete.setFields(['place_id', 'geometry']);

  // Setup click event listener at clear button
  this.setupClickListener(['clear-all-button', 'clear-popup']);

  // Autocompletion event listener for search inputs
  this.setupPlaceChangedListener(originAutocomplete, 'ORIG');
  this.setupPlaceChangedListener(destinationAutocomplete, 'DEST');
  this.setupPlaceChangedListener(stopoverAutocomplete, 'STOP');
  this.setupPlaceChangedListener(quickSearchAutocomplete, 'QUICK');

  // Push each controls on to the map. Creates neat looking floating controls. 
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(destinationInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(stopoverInput);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(stopList);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(clearStops);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(clearPopup);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(dropdownList);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(quickSearchInput);
  // Copyright message for DarkSky API. Hyperlinked.
  this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(copyrightControl);
}

/**
 * Handles event upon custom button being clicked
 */
AutocompleteDirectionsHandler.prototype.setupClickListener = function(id) {
  var clearAllButton = document.getElementById(id[0]);
  var me = this;
  // When 'clear all stops' button is clicked
  clearAllButton.addEventListener('click', function(){
    if(!me.originPlaceId || !me.destinationPlaceId){
      // Nothing in origin or dest, don't bother with the rest
      return;
    }
    // Clear waypoints and associated element fields
    waypts = [];
    document.getElementById('stops').innerHTML = "";
    document.getElementById('rain-chance').innerHTML = "";
    document.getElementById('date-list').innerHTML = "";
    
    // Reset the origin and dest to clear route; and associated element fields
    me.originPlaceId = null;
    me.destinationPlaceId = null;
    document.getElementById('origin-input').value = "";
    document.getElementById('destination-input').value = "";
    document.getElementById('origin-text').innerText = "Origin: ";
    document.getElementById('dest-text').innerText = "Dest: ";
    document.getElementById('origin-date').innerText = "";
    document.getElementById('dest-date').innerText = "";
    document.getElementById('origin-rain').innerText = "";
    document.getElementById('dest-rain').innerText = "";
    me.directionsRenderer.setDirections({routes: []});
  });
  let clearPopupButton = document.getElementById(id[1]);
  // When 'clear markers' button is clicked
  clearPopupButton.addEventListener('click', function(){
    if(markers.length < 1){
      // Nothing in markers array, don't bother with the rest
      return;
    }
    // Foreach markers, set visual to null; then clear array. 
    for (let i = 0; i < markers.length; i++){
      markers[i].setMap(null);
    }
    markers = [];
  });
};

/**
 *  Autocomplete input event listener - most functionality taken from Google Maps 
 */
AutocompleteDirectionsHandler.prototype.setupPlaceChangedListener = function(autocomplete, mode) {
  var me = this;
  autocomplete.bindTo('bounds', this.map);

  // Listen for place change from inputs
  autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();

    // Error handling - Make sure only autocompleted address is provided
    if (!place.place_id) {
      window.alert('Please select an option from the dropdown list.');
      return;
    }
    let forecast = document.getElementById('dropdown-list').value; // Get forecasting day 

    // Handlers for each search box 
    if (mode === 'ORIG') {
      me.originPlaceId = place.place_id;
      updateOD(place, forecast, 'origin-date', 'origin-rain');
      document.getElementById('origin-text').innerHTML = "Origin: " + document.getElementById('origin-input').value;
    } else if (mode === 'DEST') {
      me.destinationPlaceId = place.place_id;
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
    } else if (mode == 'QUICK') {
      document.getElementById('quick-search-input').value = ""; // clears quick search textbox
      showPopup(place);
      return; // this quick-searched location is not routed
    }
    // Do routing
    me.route();
  });
};

/**
 * This function takes a provided location and fetch the API with timezone/location and summary info,
 * then display these information with a pop-up marker on the map.
 * @param {*} place Place information provided by Google Maps Places API
 */
function showPopup(place){
  // Request from server
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: 0 // provided as 0 as it is not used here
    },
    success: function(response){
      // Initialise variables for popup info
      let infoWindow = new google.maps.InfoWindow({
        content: response[3]
      });
      let lat = place.geometry.location.lat();
      let lng = place.geometry.location.lng();
      marker = new google.maps.Marker({
        position: {lat: lat, lng: lng},
        map: map,
        title: response[2],
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });
      // Pan the map to newly created popup, then push and display the marker on map
      let center = new google.maps.LatLng(lat, lng);
      map.panTo(center);
      map.setZoom(map.getZoom());
      marker.addListener('click', function(){
        infoWindow.open(map,this);
      });
      google.maps.event.trigger(marker, 'click');
      markers.push(marker);
    }
  });  
}

/**
 * Takes a provided location, forecasting value, date HTML element and rain chance HTML element
 * to acquire weather info and re-style client's webpage view. 
 * @param {*} place Place information provided by Google Maps Places API
 * @param {*} forecast Respective forecast value from client's dropdown list
 * @param {*} dateId HTML element of date info to be edited
 * @param {*} rainId HTML element of rain chance to be edited
 */
function updateOD(place, forecast, dateId, rainId){
  let dateLi = document.getElementById(dateId);
  let rainLi = document.getElementById(rainId);
  // Request from server
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: forecast
    },
    success: function(response) {
      // Update relative HTML elements from the response
      dateLi.textContent = response[0];
      rainLi.textContent = response[1];
    }
  });
}

/**
 * Adds a waypoint into the routing system, and appends an entry to the right panel
 * @param {*} place Place information provided by Google Maps Places API
 * @param {*} forecast Respective forecast value from client's dropdown list
 */
function addStopover(place, forecast){
  // Acquire HTML elements 
  var waypointElmts = document.getElementById('stopover-input').value;
  var ol = document.getElementById('stops');
  var li = document.createElement('li');
  let ul = document.getElementById('date-list');
  let li2 = document.createElement('li');
  let ul2 = document.getElementById('rain-chance');  
  let li3 = document.createElement('li');

  // Log stop info on pagination
  li.textContent = waypointElmts;
  ol.appendChild(li);
    
  // Request from Server
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: forecast
    },
    success: function(response) {
      // Log date info
      li2.textContent = response[0];
      ul.appendChild(li2);
      // Log rain chance
      li3.textContent = response[1];
      ul2.appendChild(li3); 
    }
  });

  if(waypointElmts.length > 0) // sanity check 
  {
    waypts.push({
      location: waypointElmts,
      stopover: true
    });
    document.getElementById('stopover-input').value = ""; // clears input textbox for immediate re-input
  }
  
}

/**
 * Routing function provided by Google Maps
 */
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