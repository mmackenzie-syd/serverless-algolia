const AWS = require('aws-sdk');
const {Client} = require("@googlemaps/google-maps-services-js");
const algoliasearch = require('algoliasearch');
const { IncomingWebhook } = require('@slack/webhook');



// initialise
const docClient = new AWS.DynamoDB.DocumentClient();
const client = new Client(); // google client
const algoliaClient = algoliasearch('XXXX', 'YYYY')
const algoliaIndex = algoliaClient.initIndex('locations');

const SLACK_WEBHOOK_URL = 'XXXX'

const slack = new IncomingWebhook(SLACK_WEBHOOK_URL);


exports.getData = () => {
    const params = {
        TableName: 'location-list'
      }
    
    return new Promise ((resolve, reject) => {
        docClient.scan(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
            })
    })
}

exports.findGeoCode = addressText => {
    return new Promise ((resolve, reject) => {
        client.geocode({
            params: {
                address: addressText,
                key: 'KKKK'
            }
        }).then((response) => {
            if (response.data.results.length > 0) {
                const geometry = response.data.results[0].geometry;
                resolve(geometry.location);
            } else {
                resolve(null);
            }    
        }).catch((err) => {
            reject(err)
        });
    })
}

exports.startStateMachine = location => {
    const params = {
        stateMachineArn: 'arn:aws:states:hhhh',
        input: JSON.stringify(location)
    }
    const stepFunctions = new AWS.StepFunctions();
    stepFunctions.startExecution(params, (err, data) => {
        if (err) {
            console.error(err);
            //reject(err);
        } else {
            //resolve(data);
            console.log("State Machine started successfully");
            console.log(data);
        }
    });
};

exports.pushToAlgolia = location => {
    return algoliaIndex.saveObject(location, {
            autoGenerateObjectIDIfNotExist: false
        })
};

exports.sendToSlack = message => {
    slack.send(message)
        .then(data => {
            console.log('data', data)
        })
        .catch(err => {
            console.log('err', err)
        })
};

exports.removeFromAlgolia = locationId => {
    return algoliaIndex.deleteObject(locationId);
};

exports.searchAlgolia = geocodes => {
    return algoliaIndex.search('', {
        aroundLatLng: `${geocodes.lat}, ${geocodes.lng}`,
        aroundRadius: 7000
    });
}

