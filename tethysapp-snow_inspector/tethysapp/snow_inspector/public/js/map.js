var popupDiv = $('#welcome-popup');
window.app = {};
var app = window.app;

$(document).ready(function () {

    //added custom control

    app.CustomToolbarControl = function(){

    var button1 = document.createElement('IMG');
    button1.setAttribute('src', '{% static "snow_inspector/images/byu-medallion.png" %}');
    //button1.innerHTML = 'some button';

    var element = document.createElement('div');
    element.className = 'ol-mycontrol';
    element.appendChild(button1);

    ol.control.Control.call(this, {
        element: element
    });

    };

    ol.inherits(app.CustomToolbarControl, ol.control.Control);
    //end of custom control

	var lat = 40.2380;
	var lon = -111.5500;
	var map_zoom = 5;


	var modislayer = createModisLayer();
	var updatemodislayer = updateModisLayer();
	var pixelBoundaries;
	var styleCache = {};

	var urlParams = getUrlVars();

    //testing document.referrer, I'm not sure how it works and as such maybe I should change the hydroshare.org/apps/ part.
    var x = document.referrer;

	if (typeof urlParams !== 'undefined') {

		if (urlParams.length < 2) {
			if (document.referrer == "https://apps.hydroshare.org/apps/") {
				$('#extra-buttons').append('<a class="btn btn-default btn-sm" href="https://apps.hydroshare.org/apps/">Return to HydroShare Apps</a>');
			}
			popupDiv.modal('show');

		}

		url_lat = urlParams["lat"];
		url_lon = urlParams["lon"];
		url_date = urlParams["end"];
		url_days = urlParams["days"];
		url_zoom = urlParams["zoom"];

		if (typeof url_days !== 'undefined') {
			$("#inputDays").attr("placeholder", url_days);
		}
		if (typeof url_lat !== 'undefined') {
			lat = parseFloat(url_lat);
		}
		if (typeof url_lon !== 'undefined') {
			lon = parseFloat(url_lon);
		}
		if (typeof url_date !== 'undefined') {
			$("#endDate").val(url_date);
			$("endDate").datepicker('update');
		}
		if (typeof url_zoom !== 'undefined') {
			map_zoom = url_zoom;
		} else {
			map_zoom = 5;
		}
	} else {
		popupDiv.modal('show');
	}

	//snow location point
	var dbPoint = {
		"type": "Point",
		"coordinates": [lon, lat]
	}

	//build the bing map layer
	var bing_layer = new ol.layer.Tile({
		source: new ol.source.BingMaps({
			imagerySet: 'AerialWithLabels',
			key: 'AkCPywc954jTLm72zRDvk0JpSJarnJBYPWrNYZB1X8OajN_1DuXj1p5u1Hy2betj'
		}),
		visibility: false
	});

    //build OpenStreet map layer


    var openstreet_layer = new ol.layer.Tile({
          source: new ol.source.OSM(),
          projection: ol.proj.get('EPSG:4326'),
          tileSize: [512,512],
          visibility: true
	});

    //build MapQuest map layer
    /*var mapQuest_layer = new ol.layer.Tile({
        source: new ol.source.MapQuest({layer: 'sat'}),
        visibility: false
	}); */

    //build Esri map layer
    var esri_layer = new ol.layer.Tile({
	source: new ol.source.XYZ({
		attribution: [new ol.Attribution({
			html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
			'rest/services/World_Topo_Map/MapServer>ArcGIS</a>'
		})],
		//projection: 'EPSG:4326',
		url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
		'World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
		})
	});
	baseMapLayer = openstreet_layer;

	//add geojson layer with tile outlines
	function add_pixel_boundaries() {
	    console.log("WAS ACTIVATED!!!");

		var extent = map.getView().calculateExtent(map.getSize());

		var extentLatLon = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326')
		var xmin = extentLatLon[0];
		var ymin = extentLatLon[1];
		var xmax = extentLatLon[2];
		var ymax = extentLatLon[3];

		var baseurl = '/apps/snow-inspector/pixel-borders/';

		var pxDate = $("#endDate").val();

		var pixel_url = baseurl +'?lonmin=' + xmin + '&latmin=' + ymin + '&lonmax=' + xmax + '&latmax=' + ymax + '&date=' + pxDate;
		console.log(pixel_url)

		var pixel_source = new ol.source.GeoJSON({
			projection : 'EPSG:4326',
			url : pixel_url
		});

		if (typeof pixelBoundaries === 'undefined') {
			pixelBoundaries = new ol.layer.Vector({
				source : pixel_source,
				style : function(feature, resolution) {
					var text = feature.get('val');
					if (!styleCache[text]) {
						styleCache[text] = [new ol.style.Style({
							fill : new ol.style.Fill({
								color : 'rgba(255, 255, 255, 0.1)'
							}),
							stroke : new ol.style.Stroke({
								color : '#319FD3',
								width : 1
							}),
							text : new ol.style.Text({
								font : '12px sans-serif',
								text : text,
								fill : new ol.style.Fill({
									color : '#000'
								}),
								stroke : new ol.style.Stroke({
									color : '#fff',
									width : 3
								})
							}),
							zIndex : 999
						})];
					}
					return styleCache[text];
				}
			});
			map.addLayer(pixelBoundaries);
		} else {
			pixelBoundaries.setSource(pixel_source);
		}
	}


	$("#btnShowPixels").click(function(){

		//changing the button text...
		if ($("#btnShowPixels").val() == 'Show Pixels') {
			add_pixel_boundaries();
			$("#btnShowPixels").val('Hide Pixels');

		} else {
			if (typeof pixelBoundaries !== 'undefined') {
				pixelBoundaries.getSource().clear();
			}
			$("#btnShowPixels").val('Show Pixels');
		}
	});


	$("#selectBaseMap").change(function () {
        var selected_value = this.value;

		if (selected_value == "bing") {
			esri_layer.setVisible(false);
			mapQuest_layer.setVisible(false);
			openstreet_layer.setVisible(false);
			bing_layer.setVisible(true);
		} else if(selected_value=="osm") {
			esri_layer.setVisible(false);
			bing_layer.setVisible(false);
			mapQuest_layer.setVisible(false);
			openstreet_layer.setVisible(true);
		} else if(selected_value=="esri") {
			bing_layer.setVisible(false);
			mapQuest_layer.setVisible(false);
			openstreet_layer.setVisible(false);
			esri_layer.setVisible(true);
		}
		// save the selected value
		$('#layer').val(selected_value);
    });

    $("#selectLayer").change(function() {
        var selected_layer = this.value;
        var layer1 = "MODIS_Terra_NDSI_Snow_Cover";
        var level = "8";
        var zoom1 = 8;
        modislayer.setVisible(true);

        if (selected_layer == "snowCover") {
            layer1 = "MODIS_Terra_NDSI_Snow_Cover";
            level = "8";
            zoom1 = 8;
        } else if (selected_layer == "snowMass") {
            layer1 = "SMAP_L4_Snow_Mass";
            level = "6";
            zoom1 = 6;
        } else if (selected_layer == "snowWaterEquivalent") {
            layer1 = "AMSR2_Snow_Water_Equivalent";
            level = "6";
            zoom1 = 6;
        } else if (selected_layer == "none") {
            if (modislayer.getVisible()) {
                modislayer.setVisible(false);
            }
        }

        // Save layers to input brackets in openlayers_map.html
        $("#layer1").val(layer1);
        $("#level1").val(level);
        $("#zoom1").val(zoom1);
        updateModisLayer();
    });

    $("#getsnow").click(function(e) {
        var layer = $("#selectLayer").val();
        if (layer == "none") {
            e.preventDefault();
            alert("Please select a layer to display graph");
        }
    });


    function getUrlVars() {
		var vars = [], hash;
		var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for(var i = 0; i < hashes.length; i++)
		{
			hash = hashes[i].split('=');
			vars.push(hash[0]);
			vars[hash[0]] = hash[1];
		}
		return vars;
	}

	function createModisLayer() {
		var modisDate = $("#endDate").val();
		var modisUrl = "//map1{a-c}.vis.earthdata.nasa.gov/wmts/epsg4326/best/" +
				"MODIS_Terra_NDSI_Snow_Cover/default/" + modisDate +
				"500m"
				//"/GoogleMapsCompatible_Level8/"
				 + "{z}/{y}/{x}.png";
		var modis = new ol.source.XYZ({
		    projection: ol.proj.get('EPSG:4326'),
		    tileSize: [512, 512],
			url: modisUrl
		});

		$("#layer1").val("MODIS_Terra_NDSI_Snow_Cover");
		$("#level1").val("8");
		$("#zoom1").val(8);
        return new ol.layer.Tile({source: modis});
	}

	function updateModisLayer() {
		var modisDate1 = $("#endDate").val();
		console.log(modisDate1);

		var modisUrl1 = "//map1{a-c}.vis.earthdata.nasa.gov/wmts/epsg4326/best/" +
				$("#layer1").val() + "/default/" + modisDate1 +
				"/500m"
				//"/GoogleMapsCompatible_Level" + $("#level1").val()
				+ "/{z}/{y}/{x}.png";
		console.log(modisUrl1);
		var modisSource = new ol.source.XYZ({
		    projection: ol.proj.get('EPSG:4326'),
		    tileSize:[512,512],
			url: modisUrl1
		});
		modislayer.setSource(modisSource);
	}

	function configure_show_pixels(newZoom) {
		if (newZoom < 13) {
			if ($('#btnShowPixels').is(":visible")) {
				$('#btnShowPixels').hide();
			}
			if (typeof pixelBoundaries !== 'undefined') {
				pixelBoundaries.getSource().clear();
			}
		}
		if (newZoom >= 13) {
		  if (!($('#btnShowPixels').is(":visible"))) {
				$('#btnShowPixels').show();
		  }
		}
	}

	$('#endDate').datepicker().on('changeDate', function (ev) {
    	console.log('date changed!');
    	updateModisLayer();
	});


map = new ol.Map({
	layers: [/*mapQuest_layer, bing_layer, */openstreet_layer, /*esri_layer,*/ modislayer],
	controls: ol.control.defaults().extend([new app.CustomToolbarControl()]),
	target: document.getElementById('map_view'),
	view: new ol.View({
	    projection: ol.proj.get('EPSG:4326'),
	    tileSize: [512,512],
		center: [0,0],
		zoom: map_zoom
	})

});

console.log(map_zoom);
	// checking zoom end
	map.getView().on('propertychange', function(e) {
	   switch (e.key) {
		  case 'resolution':
			  console.log('zoom changed!');
			  var newZoom = map.getView().getZoom();
			  console.log(newZoom);
			  $('#zoom').val(newZoom);

			  configure_show_pixels(newZoom);
			  break;


	   }
	});

var source = new ol.source.Vector();
var vector = new ol.layer.Vector({
  source: source,
  style: new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 2
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33'
      })
    })
  })
});

map.addLayer(vector);
configure_show_pixels(map.getView().getZoom());




function addPoint(coordinates){
	var geometry = new ol.geom.Point(coordinates);
	var feature = new ol.Feature({
		geometry: geometry,
		attr: 'Some Property'
	});
	vector.getSource().clear();
	vector.getSource().addFeature(feature);
}

function addPointLonLat(coordinates){
	var coords = coordinates;//ol.proj.transform(coordinates, 'EPSG:4326','EPSG:3857');
	console.log(coords);
	addPoint(coords);
	map.getView().setCenter(coords);
	console.log(coords);
}

function refreshDate(){
	var endDate = $("#endDate").val();
	console.log(endDate);
	$("#end").val(endDate);
}

var coords = [lon, lat];
console.log(coords);
addPointLonLat(coords);
console.log(coords);

$("#inputDays").val($("#inputDays").attr("placeholder"));
$("#inputLon").val(lon);
$("#inputLat").val(lat);
$('#zoom').val(map.getView().getZoom());

map.on('click', function(evt) {
	var coordinate = evt.coordinate;
	addPoint(coordinate);
	//now update lat and long in textbox

	var lonlat = coordinate;//ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');
	console.log(coordinate);
	$("#inputLon").val(lonlat[0].toFixed(6));
	$("#inputLat").val(lonlat[1].toFixed(6));
	if (lonlat[0] < -180) {
		$("#inputLon").val((360 + lonlat[0]).toFixed(6));
	}
	$('#zoom').val(map.getView().getZoom());
})

});