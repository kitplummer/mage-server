var crypto = require('crypto')
  , mongoose = require('mongoose')
  , config = require('../config.json');

// Token expiration in msecs
var tokenExpiration = config.server.token.expiration * 1000;

// Creates a new Mongoose Schema object
var Schema = mongoose.Schema;

// Collection to hold users
var TokenSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
    timestamp: { type: Date, required: true },
    token: { type: String, required: true }
  },{
    versionKey: false
  }
);

// Creates the Model for the User Schema
var Token = mongoose.model('Token', TokenSchema);

var deleteExpiredTokens = function(callback) {
  var expired = new Date(Date.now() -  tokenExpiration);
  var query = {timestamp: {$lt: expired}};
  Token.remove(query, function(err, number) {
    if (err) {
      console.log('could not remove expired tokens: ' + err);
    }

    callback(err, number);
  });
}

exports.getToken = function(token, callback) {
  deleteExpiredTokens(function(err) {
    var conditions = {token: token};
    Token.findOne(conditions).populate({path: 'userId', options: {lean: true}}).exec(function(err, token) {

      if (!token || !token.userId) {
        return callback(null, null);
      }

      token.userId.populate('roleId', function(err, user) {
        return callback(err, {user: user, deviceId: token.deviceId});
      });

    });
  });
}

exports.createToken = function(options, callback) {
  var seed = crypto.randomBytes(20);
  var token = crypto.createHash('sha1').update(seed).digest('hex');

  var query = {userId: options.userId};
  if (options.device) {
    query.deviceId = options.device._id;
  }
  var update = {token: token, timestamp: new Date()};
  var options = {upsert: true};
  Token.findOneAndUpdate(query, update, options, function(err, newToken) {
    newToken.expirationDate = new Date(newToken.timestamp.getTime() +  tokenExpiration);

    if (err) {
      console.log('Could not create token for user: ' + user.username);
    }

    callback(err, newToken);
  });
}

exports.removeToken = function(token, callback) {
  Token.findByIdAndRemove(token._id, function(err) {
    callback(err);
  });
}

exports.removeTokensForUser = function(user, callback) {
  Token.remove({user: user._id}, function(err, numberRemoved) {
    callback(err, numberRemoved);
  });
}

exports.removeTokenForDevice = function(device, callback) {
  Token.remove({deviceId: device._id}, function(err, numberRemoved) {
    callback(err, numberRemoved);
  });
}
