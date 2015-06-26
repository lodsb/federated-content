
    //TODO export playlist from media sources

    var db = new loki('main.json');

    var playlists = db.addCollection('playlists');
    var media = db.addCollection('media');
    var imports = db.addCollection('imports');

    playlists.ensureUniqueIndex('hash');
    media.ensureUniqueIndex('hash');
    imports.ensureUniqueIndex('uri');

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

            modifiedMediaItems.push(mediaItem);

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

              modifiedMediaItems.push(existingMediaItem);
            }

          }


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
        })
        .done(function(jsonString) {
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
          failedFunc(jQuery.error());
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
