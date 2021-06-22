// Module that organizes reading of data from file (or eventually db)
var dataManager = {};

dataManager.Manager = function module() {

    let exports = {}

    // datamanager variables will go here

    // ** datamanager functions **

    // Reading from files
    exports.readFile = function(file) {

        return new Promise((resolve,reject) => {
            var xhttp = new XMLHttpRequest();
            var response;
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    response = this.response
                    resolve(response)
                }
            };
            xhttp.open("GET", file, true);
            xhttp.responseType = "arraybuffer";
            xhttp.send();
        })

    };

    // Reading from db
    // ** put function here **


    // Read from json files
    exports.readJson = function(file) {

        return new Promise((resolve,reject) => {
            var xhttp = new XMLHttpRequest();
            var response;
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    response = this.responseText;
                    resolve(response)
                }
            };
            xhttp.open("GET", file, true);
            xhttp.send();
        })

    }

    // Other functions / vars
    exports.gunzip = function(buffer) {

        let intArr = new Uint8Array(buffer)
        let pipeStr = pako.ungzip(intArr, {"to": "string"})

        return pipeStr

    }

    exports.convertStr = function(str,delim='\n') {

        let json_arr = []

        let splitStr = str.split(delim)
        let labels = splitStr[0].split('|')

        splitStr.slice(1,).forEach(row => {
            let toAdd = {}
            let values = row.split('|')
            values.forEach((e,i) => {
                toAdd[labels[i]] = e
            })
            json_arr.push(toAdd)
        })

        return json_arr

    }

    exports.makeDF = function (json_arr) {

        return new Promise((resolve,reject) => {
            let df = new dfd.DataFrame(json_arr)

            resolve(df)
        })

    }

    exports.cleanDF = function(df) {

        cdf = df.copy()
        cdf.dropna()

        return cdf

    }

    return exports;

}
