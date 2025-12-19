/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 75.56390977443608, "KoPercent": 24.43609022556391};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.0, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "ChooseStoreAction"], "isController": false}, {"data": [0.0, 500, 1500, "Add Item"], "isController": true}, {"data": [0.0, 500, 1500, "WatchOrderAction"], "isController": false}, {"data": [0.0, 500, 1500, "Search Store"], "isController": true}, {"data": [0.0, 500, 1500, "SearchStoreAction"], "isController": false}, {"data": [0.0, 500, 1500, "Watch order"], "isController": true}, {"data": [0.0, 500, 1500, "Login"], "isController": true}, {"data": [0.0, 500, 1500, "LoginAction"], "isController": false}, {"data": [0.0, 500, 1500, "WatchCartAction"], "isController": false}, {"data": [0.0, 500, 1500, "AddItemAction"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 532, 130, 24.43609022556391, 106329.51315789476, 343, 518340, 22070.5, 418588.79999999993, 474592.54999999993, 509804.2999999999, 0.26022635779950243, 0.27959018949688264, 0.16126097004510917], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["ChooseStoreAction", 59, 2, 3.389830508474576, 9128.288135593222, 4463, 11103, 9298.0, 10176.0, 10322.0, 11103.0, 0.03358212565748395, 0.04430610523755939, 0.022277284694462423], "isController": false}, {"data": ["Add Item", 37, 37, 100.0, 4694.702702702702, 3389, 5795, 4703.0, 5297.8, 5408.000000000001, 5795.0, 0.03813355814955363, 0.04647527399476849, 0.05358807634492937], "isController": true}, {"data": ["WatchOrderAction", 14, 14, 100.0, 2297.7857142857147, 1794, 2774, 2285.5, 2736.5, 2774.0, 2774.0, 0.00837783058470675, 0.0051052405125556755, 0.005538858697115692], "isController": false}, {"data": ["Search Store", 59, 3, 5.084745762711864, 19214.915254237287, 11930, 122186, 16461.0, 18223.0, 40092.0, 122186.0, 0.03346002774346707, 0.08769799280240777, 0.04552681608553971], "isController": true}, {"data": ["SearchStoreAction", 79, 2, 2.5316455696202533, 29797.06329113924, 1407, 474049, 7176.0, 8294.0, 377709.0, 474049.0, 0.04480223217197252, 0.05956000858473151, 0.030843625322902163], "isController": false}, {"data": ["Watch order", 14, 14, 100.0, 2297.7857142857147, 1794, 2774, 2285.5, 2736.5, 2774.0, 2774.0, 0.008377815544438326, 0.0051052313473921055, 0.00553884875350073], "isController": true}, {"data": ["Login", 298, 30, 10.06711409395973, 179364.8590604026, 343, 518340, 62483.0, 464813.5000000002, 495754.60000000003, 513729.94, 0.14575961793371556, 0.16152104211890464, 0.08257205547840948], "isController": true}, {"data": ["LoginAction", 298, 30, 10.06711409395973, 179364.85570469787, 343, 518340, 62483.0, 464813.5000000002, 495754.60000000003, 513729.94, 0.14576589215084912, 0.16152799478593446, 0.0825756097893536], "isController": false}, {"data": ["WatchCartAction", 37, 37, 100.0, 2359.5405405405404, 1689, 2985, 2324.0, 2639.6000000000004, 2836.5000000000005, 2985.0, 0.03822349587961045, 0.023292442801637617, 0.024636237578655174], "isController": false}, {"data": ["AddItemAction", 45, 45, 100.0, 2323.666666666668, 1615, 2906, 2319.0, 2617.0, 2777.5999999999995, 2906.0, 0.045979078497526325, 0.028018500959430103, 0.03497822475544239], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, 0.7692307692307693, 0.18796992481203006], "isController": false}, {"data": ["502/Bad Gateway", 23, 17.692307692307693, 4.323308270676692], "isController": false}, {"data": ["500/Internal Server Error", 96, 73.84615384615384, 18.045112781954888], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: foodhub-6342.onrender.com:443 failed to respond", 10, 7.6923076923076925, 1.8796992481203008], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 532, 130, "500/Internal Server Error", 96, "502/Bad Gateway", 23, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: foodhub-6342.onrender.com:443 failed to respond", 10, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["ChooseStoreAction", 59, 2, "502/Bad Gateway", 1, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: foodhub-6342.onrender.com:443 failed to respond", 1, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["WatchOrderAction", 14, 14, "500/Internal Server Error", 14, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["SearchStoreAction", 79, 2, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, "502/Bad Gateway", 1, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["LoginAction", 298, 30, "502/Bad Gateway", 21, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: foodhub-6342.onrender.com:443 failed to respond", 9, "", "", "", "", "", ""], "isController": false}, {"data": ["WatchCartAction", 37, 37, "500/Internal Server Error", 37, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["AddItemAction", 45, 45, "500/Internal Server Error", 45, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
