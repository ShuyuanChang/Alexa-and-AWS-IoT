//Environment Configuration

var config = {};

config.IOT_BROKER_ENDPOINT      = "A1FDE9XXVYHK7H.iot.us-east-1.amazonaws.com".toLowerCase();

config.IOT_BROKER_REGION        = "us-east-1";

//[2016.12.10] For NCTU Workshop
//config.IOT_THING_NAME           = "smart-home-shadow";
config.IOT_THING_NAME           = "mylight";

//Loading AWS SDK libraries

var AWS = require('aws-sdk');

AWS.config.region = config.IOT_BROKER_REGION;

//Initializing client for IoT

var iotData = new AWS.IotData({endpoint: config.IOT_BROKER_ENDPOINT});
var relay = 0;


// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

//     if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.05aecccb3-1461-48fb-a008-822ddrt6b516") {
//         context.fail("Invalid Application ID");
//      }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);
        
    var params = {

        "thingName" : config.IOT_THING_NAME,

    };
    
    //Check relay status
    iotData.getThingShadow(params, function(err, data) {
        if (err){ 
            console.log(err, err.stack); // an error occurred
        }
        else{     
            console.log("data.payload = " + data.payload);
            var stateObject = JSON.parse(data.payload);
            relay = stateObject.state.reported.relay;
            console.log("AWS IoT relay status = " + stateObject.state.reported.relay);           // successful response
        
        }
    });

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    activatePump(intent,session,callback)


}

/**

 * Activate the pump using AWS IoT Device Shadow

 */

function activatePump (intent, session, callback) {

    var repromptText = null;

    var sessionAttributes = {};

    var shouldEndSession = true;

    var speechOutput = "";
    
    //Prepare the parameters of the update call

   


    //Set the pump to 1 for activation on the device
    if (intent.slots.Power.value == 'on'){
    var payloadObj={ "state":

                          { "desired":

                                   {"led":1}

                          }

                 };
    speechOutput = "The light has been turned on!";
    
    } else {
            var payloadObj={ "state":

                          { "desired":

                                   {"led":0}

                          }

                 };
    speechOutput = "The light has been turned off!";
        
    }


    //Prepare the parameters of the update call

    var paramsUpdate = {

        "thingName" : config.IOT_THING_NAME,

        "payload" : JSON.stringify(payloadObj)

    };


    //Update Device Shadow

    iotData.updateThingShadow(paramsUpdate, function(err, data) {

      if (err){

        //Handle the error here
        console.log("Update DeviceShadow Error. Err:" + err);

      }

      else {
        console.log("Turn on the light. relay reported state value = " + relay);
        console.log(data);

        callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));

      }    

    });

}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}