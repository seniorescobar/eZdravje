$(document).ready(function(){
  //GENERATE DATA
  $('#generate-data').click(function(event){
    event.preventDefault();
    showAndHide($('#loader'),$('#generated-data'));
    $.ajax({
      url: 'knjiznice/js/patients.json',
      dataType: 'json',
      success: function(data) {
        generateData(1, data, function(data1){
          generateData(2, data, function(data2){
            generateData(3, data, function(data3){
              refreshList([data1, data2, data3]);
              showAndHide($('#generated-data'),$('#loader'));
            });
          });
        });
      }
    });
  });

  //SELECT PATIENT
  $(document).on('click','#list a', function(event){
    event.preventDefault();
    var ehrId = $(this).attr('ehr-id');
    $('#input-ehrid').val(ehrId);
    $('#get-data').click();
  });

  //SELECT TWITTER
  $(document).on('click','#twitter-list a', function(event){
    event.preventDefault();
    $('#tweets').removeClass('hide');
    var twitterId = $(this).attr('href');
    showAndHide($('#twitter-widget-'+twitterId),$('#tweets *'));
  });

  //GET DATA
  $('#get-data').click(function(event){
    event.preventDefault();
    var ehrId = $('#input-ehrid').val();

    getData(ehrId, function(data){
      showAndHide($('#patient-record'), $('#error'));

      var firstName = data.party.firstNames;
      var lastName = data.party.lastNames;
      var age = calculateAge(data.party.dateOfBirth);

      var currentWeight = data.weight[data.weight.length - 1].weight;
      var currentHeight = data.height[data.height.length - 1].height;
      var currentIdealWeight = calculateIdealWeight('male', currentHeight, currentWeight).idealWeight;

      $('#patient-h1').text(firstName + ' ' + lastName);

      $('#table-bmi').html('<thead><tr><th>Datum in ura</th><th>Višina</th><th>Masa</th><th>ITM</th><th>Stanje</th></tr></thead>');
      $('#table-bmr').html('<thead><tr><th>Datum in ura</th><th>Starost</th><th>Višina</th><th>Masa</th><th>BM</th></tr></thead>');

      var graphData = [];
      for(i = 0; i<data.weight.length; i++){
        var date = data.weight[i].time;
        var weight = data.weight[i].weight;
        var height = data.height[i].height;

        var bmiData = calculateBMI(height, weight);
        var bmrData = calculateBMR('male', height, weight, age, 1);
        var idealWeight = calculateIdealWeight('male', height, weight);

        $bmiRow = $('<tr><td>' + date + '</td><td>' + bmiData.currentBMI.toFixed(0) + '</td><td>' + bmiData.height + '</td><td>' + bmiData.weight + '</td><td>' + bmiData.statusBMI + '</td></tr>');
        $('#table-bmi').append($bmiRow);

        $bmrRow = $('<tr><td>' + date + '</td><td>' + bmrData.age + '</td><td>' + bmrData.height + '</td><td>' + bmrData.weight + '</td><td>' + bmrData.currentBMR.toFixed(0) + '</td></tr>');
        $('#table-bmr').append($bmrRow);

        var myDate = new Date(date);
        var myDateYear = myDate.getFullYear(), myDateMonth = myDate.getMonth(), myDateDay = myDate.getDate();
        myDateMonth = (myDateMonth < 10)?('0' + myDateMonth):myDateMonth;
        myDateDay = (myDateDay < 10)?('0' + myDateDay):myDateDay;
        var tmpGraphData = {"date": myDateYear+'-'+myDateMonth+'-'+myDateDay,"Trenutna masa": weight, "Idealna masa": idealWeight.idealWeight};
        graphData.push(tmpGraphData);
      }

      drawGraph(graphData);

      //CALCULATE IDEAL WEIGHT
      /*
      $('#calc-weight').keyup(function(){
        var weightLoss = $(this).val();
        var weightLossStatus = 'Z izgubo';
        if(weightLoss > 0){
          var weightLossJson = calculateWeightLoss(weightLoss, currentWeight, currentIdealWeight);
          var weightLossDate = weightLossJson.date;
          weightLossStatus = weightLossJson.weightLossStatus=='gain'?'S pridobivanjem':weightLossStatus;
          $('#idealWeightDate').text(weightLossDate);
        }
        else{
          $('#idealWeightDate').text('...');
        }
        $('#weightLossStatus').text(weightLossStatus);
      });

      $('#idealWeightDifference').text(Math.abs(currentIdealWeight-currentWeight).toFixed());
      */
    });
  });
});


//FUNCTIONS
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}

function generateData(patient_number, patient_data, callback) {
  patient_number--;

  var sessionId = getSessionId();
  var ehrId;
  var nurse = "Mark Clattenburg";

  $.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
    url: baseUrl + "/ehr",
    type: 'POST',
    success: function (data) {
      ehrId = data.ehrId;
      var params = {
          ehrId: ehrId,
          templateId: 'Vital Signs',
          format: 'FLAT',
          committer: nurse
      };
      var patient_data_1 = {
          firstNames: patient_data[patient_number].firstName,
          lastNames: patient_data[patient_number].lastName,
          dateOfBirth: patient_data[patient_number].dateOfBirth,
          partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
      };

      //CREATE PATIENT
      $.ajax({
        url: baseUrl + "/demographics/party",
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(patient_data_1),
        success: function (data1) {
          if (data1.action == 'CREATE') {
            postData(0, function(){
              postData(1, function(){
                postData(2, function(){
                  postData(3, function(){
                    postData(4, function(json){
                      callback(json);
                    });
                  });
                });
              });
            });

            function postData(i, callback){
              var patient_data_2 = {
                  "ctx/language": "en",
                  "ctx/territory": "SI",
                  "ctx/time": patient_data[patient_number].vitalSigns[i].date,
                  "vital_signs/height_length/any_event/body_height_length": patient_data[patient_number].vitalSigns[i].height,
                  "vital_signs/body_weight/any_event/body_weight": patient_data[patient_number].vitalSigns[i].weight,
                  "vital_signs/body_temperature/any_event/temperature|magnitude": patient_data[patient_number].vitalSigns[i].temperature,
                  "vital_signs/body_temperature/any_event/temperature|unit": "°C",
                  "vital_signs/blood_pressure/any_event/systolic": patient_data[patient_number].vitalSigns[i].bloodPressureSystolic,
                  "vital_signs/blood_pressure/any_event/diastolic": patient_data[patient_number].vitalSigns[i].bloodPressureDiastolic,
                  "vital_signs/indirect_oximetry:0/spo2|numerator": patient_data[patient_number].vitalSigns[i].oxygenSaturation
              };
              $.ajax({
                url: baseUrl + "/composition?" + $.param(params),
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(patient_data_2),
                success: function (data1) {
                  var json = {
                    firstName: patient_data[patient_number].firstName,
                    lastName: patient_data[patient_number].lastName,
                    ehrId: ehrId
                  };
                  callback(json);
                },
                error: function(err) {
                  showAndHide($('#error'), $('#patient-record'));
                  console.error(err);
                }
              });
            }
          }
        },
        error: function(err) {
          showAndHide($('#error'), $('#patient-record'));
          console.error(err);
        }
      });
    },
    error: function(err){
      showAndHide($('#error'), $('#patient-record'));
      console.error(err);
    }
  });

  return ehrId;
}

function getData(ehrId, callback){
  var json;
  sessionId = getSessionId();
  $.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
  	type: 'GET',
  	headers: {"Ehr-Session": sessionId},
  	success: function (data1) {
			$.ajax({
		    url: baseUrl + "/view/" + ehrId + "/weight",
		    type: 'GET',
		    headers: {"Ehr-Session": sessionId},
		    success: function (data2) {
          $.ajax({
    		    url: baseUrl + "/view/" + ehrId + "/height",
    		    type: 'GET',
    		    headers: {"Ehr-Session": sessionId},
    		    success: function (data3) {
              json = {
                party: data1.party,
                weight: data2,
                height: data3
              };
              callback(json);
    		    },
            error: function(err){
              showAndHide($('#error'), $('#patient-record'));
              console.error(err);
            }
    			});
		    },
        error: function(err){
          showAndHide($('#error'), $('#patient-record'));
          console.error(err);
        }
			});
    },
    error: function(err){
      showAndHide($('#error'), $('#patient-record'));
      console.error(err);
    }
	});
}

function calculateAge(dateString) {
    var date = new Date(dateString);
    var ageDifMs = Date.now() - date.getTime();
    var ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function calculateIdealWeight(sex, height, weight){
  var variable;
  if(sex == 'male')
    variable = 88;
  else if(sex == 'female'){
    variable = 92;
  }

  var idealWeight = 0.9 * height - variable;

  var json = {
    idealWeight: idealWeight
  };

  return json;
}

function calculateBMI(height, weight){
  var currentBMI = weight / ((height/100) * (height/100));

  var statusBMI;
  if(currentBMI <= 18.5)
    statusBMI = "podhranjenost";
  else if(currentBMI > 18.5 && currentBMI <= 24.9)
    statusBMI = "normalno";
  else if(currentBMI > 25 && currentBMI <= 29.9)
    statusBMI = "prekomerna teža";
  else
    statusBMI = "debelost"

  var json = {
    height: height,
    weight: weight,
    currentBMI: currentBMI,
    statusBMI: statusBMI,
  };

  return json;
}

function calculateBMR(sex, height, weight, age, multiplier){
  var variable;
  if(sex == 'male')
    variable = [66, 13.7, 5, 6.8];
  else if(sex == 'female'){
    variable = [655, 9.6, 1.8, 4.7];
  }

  var currentBMR = (variable[0] + (variable[1] * weight) + (variable[2] * height) - (variable[3] * age)) * multiplier;

  var json = {
    height: height,
    weight: weight,
    age: age,
    currentBMR: currentBMR
  };

  return json;
}

/*function calculateWeightLoss(weightLoss, currentWeight, idealWeight){
  var weightLossStatus = idealWeight > currentWeight? 'gain':'loss';
  var weightDifference = Math.abs(idealWeight - currentWeight);
  var days = (weightDifference/weightLoss) * 7;

  var date = new Date();
  date.setDate(date.getDate() + days);

  var json = {
    date: date.toLocaleDateString(),
    weightLossStatus: weightLossStatus
  };

  return json;
}*/

function emptyList(){
  patient_list = [];
}

function refreshList(list){
  $('#list').html('');
  for(i = 0; i<list.length; i++){
    $list = $('<li><a ehr-id="' + list[i].ehrId + '" href="#">' + list[i].firstName +  ' ' + list[i].lastName +  '</a></li>');
    $('#list').append($list);
  }
}

function showAndHide($show, $hide){
  $hide.addClass('hide');
  $show.removeClass('hide');
}

//GRAPH
function drawGraph(data){
  $graphContainer = $('#graph');
  var graphWidth = $graphContainer.width();
  $graphContainer.html('');

  var margin = {top: 20, right: 40, bottom: 30, left: 40},
      width = graphWidth - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var parseDate = d3.time.format("%Y-%m-%d").parse;

  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .ticks(5).tickFormat(d3.time.format("%Y-%m-%d"));

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10);

  var line = d3.svg.line()
      .interpolate("basis")
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.weightValue); });

  var svg = d3.select("#graph").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

  data.forEach(function(d) {
    d.date = parseDate(d.date);
  });

  var weightData = color.domain().map(function(name) {
    return {
      name: name,
      values: data.map(function(d) {
        return {date: d.date, weightValue: +d[name]};
      })
    };
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));
  //y.domain([0, d3.max(weightData, function(c) { return d3.max(c.values, function(v) { return v.weightValue; }); }) + 50]);
  y.domain([
   d3.min(weightData, function(c) { return d3.min(c.values, function(v) { return v.weightValue; }); }) - 20,
   d3.max(weightData, function(c) { return d3.max(c.values, function(v) { return v.weightValue; }); }) + 20
 ]);



  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Masa (kg)");

  var weightElement = svg.selectAll(".weight")
      .data(weightData)
    .enter().append("g")
      .attr("class", "weight");

  weightElement.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d) { return color(d.name); });

  weightElement.append("text")
      .datum(function(d) { return {name: d.name, value: d.values[d.values.length - 1]}; })
      .attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.weightValue) + ")"; })
      .attr("x", 10)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

}
