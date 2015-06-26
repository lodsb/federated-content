
    //TODO export playlist from media sources

    var playlists = {};
    var media = {};
    var imports = {};

    var db = new loki('boombox_data.json',
      {
        autoload: true,
        autoloadCallback : loadHandler,
        autosave: true,
        autosaveInterval: 10000,
      });

    function saveDB() {
      db.saveDatabase();
    }

    function loadHandler() {
      // init loki db
      playlists = db.getCollection('playlists');

      if (playlists === null) {
        playlists = db.addCollection('playlists');
        media = db.addCollection('media');
        imports = db.addCollection('imports');

        playlists.ensureUniqueIndex('hash');
        media.ensureUniqueIndex('hash');
        imports.ensureUniqueIndex('uri');
      } else {
        media = db.getCollection('media');
        imports = db.getCollection('imports');

        playlists.ensureUniqueIndex('hash');
        media.ensureUniqueIndex('hash');
        imports.ensureUniqueIndex('uri');
      }
    }

    function populateDBData() {
      iData = imports.data;

      if(iData.length > 0) {
        importEvents.fire(constructEvent("init", iData));
      }
    }

    function createEventHandler() {
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
    }

    function constructEvent(typeName, data) {
      return {'type': typeName, 'data': data};
    }

    var importEvents = createEventHandler();

    function search(query) {
      //TODO: make search case insensitive!
      // wasting cycles
      var playlistSearch = playlists.find({'title': {'$contains': query}});

      var artistSearch= media.find({'artist': {'$contains': query}});
      var mediaSearch = media.find({'title': {'$contains': query}});

      var result = {};
      result.playlists = playlistSearch;
      result.artists   = artistSearch;
      result.media     = mediaSearch;


      return result;
    }

    function chooseMediaUri(media) {
      // should check media availability and randomly select one
      // send toast on error
      console.log(media);
      return media.uris[0].uri;
    }


    /*TODO: check media avail, random avail media url load, score media url?
      latency, throughput?
    */

    function stringHash(string){
    	var hash = 0;
    	if (string.length === 0) return hash;
    	for (i = 0; i < string.length; i++) {
    		char = string.charCodeAt(i);
    		hash = ((hash<<5)-hash)+char;
    		hash = hash & hash; // Convert to 32bit integer
    	}
    	return hash;
    }

    function mediaHash(mediaJson) {
      // ignore url and tags

      var mediaAuthor =  mediaJson.author  ? mediaJson.author : "UNDEF" ;
      var mediaTitle =   mediaJson.title   ? mediaJson.title  : "UNDEF" ;
      var mediaType =    mediaJson.type    ? mediaJson.type   : "UNDEF" ;
      var mediaSubtype = mediaJson.subtype ? mediaJson.subtype: "UNDEF" ;

      var mediaString = mediaAuthor + mediaTitle + mediaType + mediaSubtype;

      return stringHash(mediaString);
    }

    function uniqueAddToDB(data, dataAsString) {
      var playlistHash = stringHash(dataAsString);

      data.hash = playlistHash;

      if(!playlists.by('hash', playlistHash)) {


        // check in media first
        var mediaItems = data.media;

        var modifiedMediaItems = [];

        var playlistMediaItemHashes = [];

        itemsLength = mediaItems.length;
        for(var mi = 0; mi < itemsLength; mi ++) {
          var mediaItem = mediaItems[mi];

          var mediaItemHash = mediaHash(mediaItem);

          mediaItem.hash = mediaItemHash;

          var existingMediaItem = media.by('hash', mediaItemHash);

          // if unknown media, then add it
          if(!existingMediaItem) {
            var origUri       = mediaItem.uri;

            var newUriEntry   = {};
            newUriEntry.uri   = origUri;
            newUriEntry.status= "unchecked";

            delete mediaItem.uri;

            mediaItem.uris = [newUriEntry];

            console.log(mediaItem);

            media.insert(mediaItem);

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
        playlists.insert(data);

      }

      return playlistHash;
    }

    function playlistByHash(hash) {
      return playlists.by('hash', hash);
    }

    function importJson(url, func, failedFunc) {
      // TODO: validate, and throw everything away, we dont know!

      if(!imports.by('uri', url)) {

        jQuery.ajax({
          url: url,
          //dataType: 'jsonp' CORS?!
        })
        .done(function(jsonString) {
          console.log("!!!");
          var data = jQuery.parseJSON(jsonString);

          var importHash = uniqueAddToDB(data, jsonString);

          var importDescriptor = {
            'title': data.title, // shold also have a root directory indicator + colors for my imports list
            'uri'  : url,
            'crawl': false, // should lateron be used to retrigger crawling references
            'type' : 'playlist', // playlist or bucket
            'refHash' : importHash
          };

          imports.insert(importDescriptor);

          func(data);

          importEvents.fire(constructEvent("update", importDescriptor));

        })
        .fail(function() {
          var msg = "";
          try{
            jQuery.error();
          } catch(e) {
            msg = e.msg;
          }

          failedFunc(msg);
          console.log("failed ajax json request");
        });

      } else {
        failedFunc("Already exists!");
      }

    }

    jQuery(document).ready(function() {
      jQuery.ajaxSetup({
          cache: false
      });

    });

    function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // XDomainRequest for IE.
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}

// Make the actual CORS request.
function makeCorsRequest() {
  // All HTML5 Rocks properties support CORS.
  var url = 'http://lodsb.org';
  url = "https://drive.google.com/uc?export=download&id=0B28GGAWFNg-3aWNCeGNrSnJ0Q2M";
  //https://drive.google.com/file/d/0B28GGAWFNg-3aWNCeGNrSnJ0Q2M/view?usp=sharing

  var xhr = createCORSRequest('GET', url);
  if (!xhr) {
    console.log('CORS not supported');
    return;
  }
  // Response handlers.
  xhr.onload = function() {
    var text = xhr.responseText;
    var title = getTitle(text);
    console.log('Response from CORS request to ' + url + ': ' + title);
  };

  xhr.onerror = function() {
    console.log('Woops, there was an error making the request.');
  };

  xhr.send();
}
