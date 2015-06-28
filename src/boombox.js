
    //TODO export playlist from media sources

// "API"
var boombox = {};
boombox.debug_loadDB = true;

// "Setup"

var ___db = new loki('boombox_data.json',
  {
    autoload: true,
    autoloadCallback : loadHandler,
    autosave: true,
    autosaveInterval: 10000,
  });

function loadHandler() {
  // init loki db
  boombox.playlists = ___db.getCollection('playlists');

  console.log("SDF");
  console.log((boombox.debug_loadDB===true) || (boombox.playlists == null));

  if((boombox.debug_loadDB===false) || (boombox.playlists == null) ) {
    console.log("creating db");
    boombox.playlists = ___db.addCollection('playlists');
    boombox.media = ___db.addCollection('media');
    boombox.imports = ___db.addCollection('imports');

    boombox.playlists.ensureUniqueIndex('hash');
    boombox.media.ensureUniqueIndex('hash');
    boombox.imports.ensureUniqueIndex('uri');
  } else {
    boombox.media = ___db.getCollection('media');
    boombox.imports = ___db.getCollection('imports');

    boombox.playlists.ensureUniqueIndex('hash');
    boombox.media.ensureUniqueIndex('hash');
    boombox.imports.ensureUniqueIndex('uri');
  }
}

jQuery(document).ready(function() {
  jQuery.ajaxSetup({
      cache: false
  });

});

boombox.saveDB = function() {
  ___db.saveDatabase();
};


boombox.createEventHandler = function() {
  var handler = {};

  handler._listeners = [];

  handler.fire = function(event) {
    var length = handler._listeners.length;

    for(var i = 0; i < length; i++) {
      handler._listeners[i](event);
    }
  };

  handler.addListener = function(myFunction){
    handler._listeners.push(myFunction);
  };

  return handler;
};

boombox.constructEvent = function(typeName, data) {
  return {'type': typeName, 'data': data};
};

boombox.search = function(query) {
  //TODO: make search case insensitive!
  // wasting cycles
  var playlistSearch = boombox.playlists.find({'title': {'$contains': query}});

  var artistSearch= boombox.media.find({'artist': {'$contains': query}});
  var mediaSearch = boombox.media.find({'title': {'$contains': query}});

  var result = {};
  result.playlists = playlistSearch;
  result.artists   = artistSearch;
  result.media     = mediaSearch;


  return result;
};

boombox.chooseMediaUri = function(media) {
  // should check media availability and randomly select one
  // send toast on error
  console.log(media);
  return media.uris[0].uri;
};


/*TODO: check media avail, random avail media url load, score media url?
  latency, throughput?
*/

boombox.stringHash = function(string){
  var hash = 0;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    char = string.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

boombox.mediaHash = function(mediaJson) {
  // ignore url and tags

  var mediaAuthor =  mediaJson.author  ? mediaJson.author : "UNDEF" ;
  var mediaTitle =   mediaJson.title   ? mediaJson.title  : "UNDEF" ;
  var mediaType =    mediaJson.type    ? mediaJson.type   : "UNDEF" ;
  var mediaSubtype = mediaJson.subtype ? mediaJson.subtype: "UNDEF" ;

  var mediaString = mediaAuthor + mediaTitle + mediaType + mediaSubtype;

  return boombox.stringHash(mediaString);
};

boombox.uniqueAddToDB = function(data, dataAsString) {
  var playlistHash = boombox.stringHash(dataAsString);

  data.hash = playlistHash;

  if(!boombox.playlists.by('hash', playlistHash)) {


    // check in media first
    var mediaItems = data.media;

    var modifiedMediaItems = [];

    var playlistMediaItemHashes = [];

    itemsLength = mediaItems.length;
    for(var mi = 0; mi < itemsLength; mi ++) {
      var mediaItem = mediaItems[mi];

      var mediaItemHash = boombox.mediaHash(mediaItem);

      mediaItem.hash = mediaItemHash;

      var existingMediaItem = boombox.media.by('hash', mediaItemHash);

      // if unknown media, then add it
      if(!existingMediaItem) {
        var origUri       = mediaItem.uri;

        var newUriEntry   = {};
        newUriEntry.uri   = origUri;
        newUriEntry.status= "unchecked";

        delete mediaItem.uri;

        mediaItem.uris = [newUriEntry];

        console.log(mediaItem);

        boombox.media.insert(mediaItem);

      }
      // else add entry to uris if it doesn exist
      else {
        var uriKnown = false;

        var existringUris       = existingMediaItem.uris;
        var existringUrisLength = existingMediaItem.uris.length;

        // search through uris for already existing entry
        for(var ui = 0; ui < existringUrisLength; ui ++) {
          if(existringUris[ui].uri == mediaItem.uri) {
            uriKnown = true;
            break;
          }
        }

        if(!uriKnown) {
          var origUri       = mediaItem.uri;

          var newUriEntry   = {};
          newUriEntry.uri   = origUri;
          newUriEntry.status= "unchecked";

          existingMediaItem.uris = existingMediaItem.uris.concat([newUriEntry]);
        }
      }

      // add media if it isnt already in the playlist
      if(! (jQuery.inArray(mediaItemHash,playlistMediaItemHashes) > 0) ) {
          if(existingMediaItem) {
            modifiedMediaItems.push(existingMediaItem);
          } else {
            modifiedMediaItems.push(mediaItem);
          }
      }

      console.log(modifiedMediaItems);

      playlistMediaItemHashes.push(mediaItemHash);

    }

    // modify playlist and
    data.media=modifiedMediaItems;
    // insert it
    boombox.playlists.insert(data);

  }

  return playlistHash;
};

boombox.playlistByHash = function(hash) {
  return boombox.playlists.by('hash', hash);
};

boombox._successfulJsonImport = function(url, data, func) {
  //var data = jQuery.parseJSON(jsonString);
  var jsonString = JSON.stringify(data);

  var importHash = boombox.uniqueAddToDB(data, jsonString);

  var importDescriptor = {
    'title': data.title, // shold also have a root directory indicator + colors for my imports list
    'uri'  : url,
    'crawl': false, // should lateron be used to retrigger crawling references
    'type' : 'playlist', // playlist or bucket
    'refHash' : importHash
  };

  boombox.imports.insert(importDescriptor);

  func(data);

  boombox.importEvents.fire(boombox.constructEvent("update", importDescriptor));
};

boombox._failedJsonImport = function(failedFunc){
  var msg = "";
  try{
    jQuery.error();
  } catch(e) {
    msg = e.msg;
  }

  failedFunc(msg);
  console.log("failed ajax json request");
};

boombox._ajax = function(url, func, failedFunc, nextTry) {
  jQuery.ajax({
    url: url,
    crossDomain: true,
    dataType: "json",
    jsonpCallback: 'callback'
    //dataType: 'jsonp' CORS?!
  })
  .done(function(data) {
      boombox._successfulJsonImport(url, data, func);
  })
  .fail(function(){
    // try next method
    nextTry();
  });
};

// using YQL to create CORS
boombox._yql = function(url, func, failedFunc, nextTry) {
  jQuery.getJSON("http://query.yahooapis.com/v1/public/yql",
    {
      q:      "select * from json where url=\""+url+"\"",
      crossDomain: true,
      format: "json"
    },
    function(data){
      if (data.query.results) {
        boombox._successfulJsonImport(url, data.query.results.json, func);
      } else {
        nextTry();
      }
    });
};

// "exception" ladder for json loading using different approaches/services
boombox._jsonExceptionLadder = function(url, func, failedFunc){
  var ladder = [boombox._ajax, boombox._yql, null];
  var idx = 0;

  var run = function(){
    if(idx < ladder.length) {
      ladder[idx++](url, func, failedFunc, run);
    }
  };

  run();

};

//


boombox.importJson = function(url, func, failedFunc) {
  // TODO: validate, and throw everything away, we dont know!

  if(!boombox.imports.by('uri', url)) {

    boombox._jsonExceptionLadder(url, func, failedFunc);

  } else {
    failedFunc("Already exists!");
  }

};

boombox.importEvents = boombox.createEventHandler();
boombox.populateDBData = function() {
  if(boombox.imports.data) {
    iData = boombox.imports.data;

    if(iData.length > 0) {
      boombox.importEvents.fire(boombox.constructEvent("init", iData));
    }
  }
};
