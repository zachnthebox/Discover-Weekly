/*jslint node: true */
var SpotifyWebApi = require('spotify-web-api-node');
var firebase = require('firebase');
var RSVP = require('rsvp');

var spotifyClientId = process.env.spotifyClientId;
var spotifyClientSecret = process.env.spotifyClientSecret;
var spotifyAccessToken = process.env.spotifyAccessToken;
var spotifyRefreshToken = process.env.spotifyRefreshToken;

var firebaseUsername = process.env.firebaseUsername;
var firebasePassword = process.env.firebasePassword;
var firebaseApiKey = process.env.firebaseApiKey;
var firebaseAuthDomain = process.env.firebaseAuthDomain;
var firebaseStorageBucket = process.env.firebaseStorageBucket;
var firebaseDatabaseURL = process.env.firebaseDatabaseURL;

var spotifyApi;
setupSpotifyApi().then(setupFirebaseApi).then(getDiscoveryPlaylist).then(function(response) {
  return response.body;
}).then(addPlaylistToFirebase).then(exit);

function exit() {
  process.exit();
}

function getDiscoveryPlaylist() {
  return spotifyApi.getPlaylist('spotifydiscover', '5L2dRcRi1en2m7GBvnBwFo');
}

function addPlaylistToFirebase(playlist) {
  var tracks = playlist.tracks.items.map(function(item) {
    return item.track;
  });
  var promises = tracks.map(function(track) {
    return firebase.database().ref(`tracks/${track.id}`).set(track);
  });

  return RSVP.all(promises).then(function() {
    var snapshotDate = new Date().getTime();

    var trackIds = {};
    tracks.forEach(function(track) {
      trackIds[track.id] = true;
    });

    var id = playlist.id + snapshotDate;
    return firebase.database().ref(`playlists/${id}`).set({
      name: playlist.name,
      tracks: trackIds,
      snapshotDate: snapshotDate,
      snapshotId: playlist.snapshot_id
    });
  });
}

function setupFirebaseApi() {
  var firebaseConfig = {
    apiKey: firebaseApiKey,
    authDomain: firebaseAuthDomain,
    databaseURL: firebaseDatabaseURL,
    storageBucket: firebaseStorageBucket,
  };
  firebase.initializeApp(firebaseConfig);
  return firebase.auth().signInWithEmailAndPassword(firebaseUsername, firebasePassword);
}

function setupSpotifyApi() {
  spotifyApi = new SpotifyWebApi({
    clientId: spotifyClientId,
    clientSecret: spotifyClientSecret,
    redirectUri: 'https://example.com/callback'
  });
  spotifyApi.setAccessToken(spotifyAccessToken);
  spotifyApi.setRefreshToken(spotifyRefreshToken);
  return spotifyApi.refreshAccessToken().then(function(data) {
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
  });
}
