const _ = require('lodash');

const helper = require('./helper');

module.exports.firstRun = (event, context, callback) => { 
  helper.getData().then(results => {
    _.forEach(results.Items, location => {
      console.log('Starting state-machine for this location: ', location.locationId);
      helper.startStateMachine(location);
    })
  }).catch(err => {
    callback(err);
    console.log('err: ', err)
  })
};

module.exports.findGeoCode = (event, context, callback) => { 
  const location = event;
  location.searchable = false;
  const addressText = `${location.line1}, ${location.city}, ${location.zipCode}`;
  helper.findGeoCode(addressText)
    .then(geoCodes => {
      if (geoCodes) {
        location._geoloc = { // underscore is a requirement by algolia
          lat: geoCodes.lat,
          lng: geoCodes.lng
        }
        location.searchable = true;
      }
      callback(null, location);
    })
    .catch(err => {
      callback(err);
    })
};

module.exports.pushToAlgolia = (event, context, callback) => {
  const location = event;
  location.objectID = event.locationId;
  helper.pushToAlgolia(location)
   .then(results => {
        const message = `${location.locationId} pushed to algolia`;
        helper.sendToSlack(message);
        callback(null, message)
    }).catch(err => {
      callback(err);
    })
}

module.exports.locationFailed = (event, context, callback) => {
  const message = `location ${event.locationId} not pushed to algolia`;
  helper.sendToSlack(message);
  callback(null, message)
}

module.exports.processUpdates = (event, context, callback) => {
  event.Records.forEach(record => {
    if (record.eventName === 'INSERT') {
      const data = record.dynamodb.NewImage;
      const location = {
        locationId: data.locationId.S,
        line1: data.line1.S,
        line2: data.line2.S,
        city: data.city.S,
        state: data.state.S,
        country: data.country.S,
        zipCode: data.zipCode.S
      };
      helper.startStateMachine(location);
    } else if (record.eventName === 'REMOVE') {
      const data = record.dynamodb.OldImage;
      const locationId = data.locationId.S;

      helper.removeFromAlgolia(locationId)
        .then(() => {
          helper.sendToSlack(`${locationId} was removed from algolia`);
        })
        .catch((err) => {
          console.log(err);
          helper.sendToSlack(err);
        })
    }
  })
}

module.exports.findLocations = (event, context, callback) => {
  const address = event.queryStringParameters.address;

  helper.findGeoCode(address)
    .then(geocodes => {
      if (geocodes) {
        helper.searchAlgolia(geocodes)
          .then(results => {
            const response = {
              statusCode: 200,
              body: JSON.stringify(results)
            }
            callback(null, response);
          })
          .catch(err => {
            const response = {
              statusCode: 500,
              body: "Internal server error " + err
            }
            callback(null, response);
          })
      } else {
        const response = {
          statusCode: 400,
          body: "Invalid address " + address
        }
        callback(null, response);
      }
    })
};
