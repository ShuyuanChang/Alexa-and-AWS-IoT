var five = require("johnny-five");
var Edison = require("galileo-io");
var awsIot = require('aws-iot-device-sdk');

// AWS IoT Variables
var mqttPort = 8883;
var rootPath = '/home/root/aws_certs/';
var awsRootCACert = "root-ca.pem.crt";
var awsClientCert = "dfcc856983-certificate.pem";
var awsClientPrivateKey = "dfcc856983-private.key";
var topicName = "lightcontrol";
var awsClientId = "awssummittaipei";
//var awsIoTHostAddr = "https://A1HRV7YQMB92H7.iot.us-west-2.amazonaws.com";
var awsIoTHostAddr = "https://a1fde9xxvyhk7h.iot.us-east-1.amazonaws.com";


//var STREAM_NAME = "IoTHackSeries-DeviceStream-J3X32QDWDRYX"; // CHANGE | Your Kinesis stream name.
//var PARTITION_KEY = "xyz"; // DO NOT CHANGE | Your partition key.
var DEVICE = "edison"; // DO NOT CHANGE | Your device type.
var DEVICE_ID = "myLight"; // CHANGE | Your device id / team name.
var REGION = "us-east-1"; // CHANGE | The region you ran your CloudFormation script in.
var THRESHOLD = 50; // OPTIONAL | The amount of change that is required for the accelerometer to be "shaking"
var INTERVAL = 1000; // OPTIONAL | 1000 milliseconds, or one second. 

// CONSTANTS - PIN LOCATIONS
//var BUTTON = 5; 
var LED = 13;

/*
 * Instance AWS variables for use in the application for
 * AWS IoT Certificates for secure connection.
 */
var privateKeyPath = rootPath + awsClientPrivateKey;
var clientCertPath = rootPath + awsClientCert;
var rootCAPath = rootPath + awsRootCACert;

//
// Replace the values of '<YourUniqueClientIdentifier>' and '<YourAWSRegion>'
// with a unique client identifier and the AWS region you created your
// certificate in (e.g. 'us-east-1').  NOTE: client identifiers must be
// unique within your AWS account; if a client attempts to connect with a
// client identifier which is already in use, the existing connection will
// be terminated.
//
var thingShadows = awsIot.thingShadow({
    keyPath: privateKeyPath,
    certPath: clientCertPath,
    caPath: rootCAPath,
    clientId: awsClientId,
    region: REGION
});

//
// Client token value returned from thingShadows.update() operation
//
var clientTokenUpdate;

//
// Simulated device values
//
var rval = 187;
var gval = 114;
var bval = 222;

var mystate = { red: rval, green: gval, blue: bval, displaytext: "Hello!", relay:0,
    relay2:0, led:0 };

var board = new five.Board({
    io: new Edison()
});

board.on("ready", function () {
    
    var led = new five.Led(LED);
    led.off();
    console.log("Initial LED......");
    
    //var relay = new five.Relay({
    //    pin : 5,
    //    type : "NC"
    //});
  
    //console.log("Relay created");

    console.log("Device Shadow 初始化中，請稍候.....");
    thingShadows.on('connect', function () {
        //
        // After connecting to the AWS IoT platform, register interest in the
        // Thing Shadow named 'myLight'.
        //
        console.log("Device Shadow 連接中，請稍候.....");
        thingShadows.register(DEVICE_ID);
        //
        // 5 seconds after registering, update the Thing Shadow named 
        // 'myLight' with the latest device state and save the clientToken
        // so that we can correlate it with status or timeout events.
        //
        // Note that the delay is not required for subsequent updates; only
        // the first update after a Thing Shadow registration using default
        // parameters requires a delay.  See API documentation for the update
        // method for more details.
        //
        
        setTimeout(function () {
            //
            // Thing shadow state
            //
            var rgbLedLampState = { "state": { "reported": mystate } };

            clientTokenUpdate = thingShadows.update(DEVICE_ID, rgbLedLampState);
            //
            // The update method returns a clientToken; if non-null, this value will
            // be sent in a 'status' event when the operation completes, allowing you
            // to know whether or not the update was successful.  If the update method
            // returns null, it's because another operation is currently in progress and
            // you'll need to wait until it completes (or times out) before updating the 
            // shadow.
            //
            if (clientTokenUpdate === null) {
                console.log('update shadow failed, operation still in progress');
            }
        }, 5000);
    });

    thingShadows.on('status',
        function (thingName, stat, clientToken, stateObject) {
            console.log('received ' + stat + ' on ' + thingName + ': ' +
                JSON.stringify(stateObject));
            //
            // These events report the status of update(), get(), and delete() 
            // calls.  The clientToken value associated with the event will have
            // the same value which was returned in an earlier call to get(),
            // update(), or delete().  Use status events to keep track of the
            // status of shadow operations.
            //
        });

    thingShadows.on('delta',
        function (thingName, stateObject) {
            console.log('received delta on ' + thingName + ': ' +
                JSON.stringify(stateObject));
            mystate.displaytext = stateObject.state.displaytext;

            //relay attr is for the light control.
            var lightValue = 0;
            lightValue = stateObject.state.led;
            
            if(lightValue == 1){
                  //LED is on.
                  led.on();
                  console.log("LED is on....");
            }
            
            if(lightValue == 0){
                  //LED is off.
                  led.off();
                  console.log("LED is off....");               
            }
                       
            mystate.led = lightValue;
            
            thingShadows.update(thingName, {
                state: {
                    reported: mystate
                }
            });
        });

    thingShadows.on('timeout',
        function (thingName, clientToken) {
            console.log('received timeout on ' + thingName +
                ' with token: ' + clientToken);
            //
            // In the event that a shadow operation times out, you'll receive
            // one of these events.  The clientToken value associated with the
            // event will have the same value which was returned in an earlier
            // call to get(), update(), or delete().
            //
        });

}); //end of borad on ready.
