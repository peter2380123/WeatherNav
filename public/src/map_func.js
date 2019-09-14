//-----------------------------------------------------------------------------------//
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script
// src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">
var map;
var markers = []; 

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
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
  let clearPopup = document.getElementById('clear-popup');
  let stopList = document.getElementById('right-panel');
  let quickSearchInput = document.getElementById('quick-search-input');
  let dropdownList = document.getElementById('dropdown-list');
  let copyrightControl = document.getElementById('copyright');

  // Origin input
  var originAutocomplete = new google.maps.places.Autocomplete(originInput);
  // Specify just the place data fields that you need.
  originAutocomplete.setFields(['place_id', 'geometry']);

  // Destination input
  var destinationAutocomplete = new google.maps.places.Autocomplete(destinationInput);
  // Specify just the place data fields that you need.
  destinationAutocomplete.setFields(['place_id', 'geometry']);

  // Stopover input
  var stopoverAutocomplete = new google.maps.places.Autocomplete(stopoverInput);
  stopoverAutocomplete.setFields(['place_id', 'geometry']);

  // Quick search input 
  let quickSearchAutocomplete = new google.maps.places.Autocomplete(quickSearchInput);
  quickSearchAutocomplete.setFields(['place_id', 'geometry']);

  // Setup click event listener at clear button
  this.setupClickListener(['clear-all-button', 'clear-popup']);

  this.setupPlaceChangedListener(originAutocomplete, 'ORIG');
  this.setupPlaceChangedListener(destinationAutocomplete, 'DEST');
  this.setupPlaceChangedListener(stopoverAutocomplete, 'STOP');
  this.setupPlaceChangedListener(quickSearchAutocomplete, 'QUICK');

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(originInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(destinationInput);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(stopoverInput);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(stopList);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(clearStops);
  this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(clearPopup);

  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(dropdownList);
  this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(quickSearchInput);

  this.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(copyrightControl);
}

// Handles event upon clear button being clicked
AutocompleteDirectionsHandler.prototype.setupClickListener = function(id) {
  var clearAllButton = document.getElementById(id[0]);
  var me = this;
  clearAllButton.addEventListener('click', function(){
    if(!me.originPlaceId || !me.destinationPlaceId){
      // Nothing in origin or dest, don't bother with the rest
      return;
    }
    waypts = [];
    document.getElementById('stops').innerHTML = "";
    document.getElementById('rain-chance').innerHTML = "";
    document.getElementById('date-list').innerHTML = "";
    
    //me.directionsRenderer.setMap(null);
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
  clearPopupButton.addEventListener('click', function(){
    if(markers.length < 1){
      // Nothing in markers array, don't bother with the rest
      return;
    }
    for (let i = 0; i < markers.length; i++){
      markers[i].setMap(null);
    }
    markers = [];
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
    me.route();
  });
};

function showPopup(place){
  $.ajax({
    url: "/result",
    type: "GET",
    cache: false,
    data:{
      latlng: place.geometry.location.toUrlValue(),
      time: 0
    },
    success: function(response){
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