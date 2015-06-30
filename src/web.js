var web = {};

web._printableCharacters = [ "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "05", "06", "07", "08", "09", "0A", "0B", "0C", "0D", "0E", "0F", "0G", "0H", "0I", "0J", "0K", "0L", "0M", "0N", "0O", "0P", "0Q", "0R", "0S", "0T", "0U", "0V", "0W", "0X", "0Y", "0Z", "0a", "0b", "0c", "0d", "0e", "0f", "0g", "0h", "0i", "0j", "0k", "0l", "0m", "0n", "0o", "15", "16", "17", "18", "19", "1A", "1B", "1C", "1D", "1E", "1F", "1G", "1H", "1I", "1J", "1K", "1L", "1M", "1N", "1O", "1P", "1Q", "1R", "1S", "1T", "1U", "1V", "1W", "1X", "1Y", "1Z", "1a", "1b", "1c", "1d", "1e", "1f", "1g", "1h", "1i", "1j", "1k", "1l", "1m", "1n", "1o", "25", "26", "27", "28", "29", "2A", "2B", "2C", "2D", "2E", "2F", "2G", "2H", "2I", "2J", "2K", "2L", "2M", "2N", "2O", "2P", "2Q", "2R", "2S", "2T", "2U", "2V", "2W", "2X", "2Y", "2Z", "2a", "2b", "2c", "2d", "2e", "2f", "2g", "2h", "2i", "2j", "2k", "2l", "2m", "2n", "2o", "35", "36", "37", "38", "39", "3A", "3B", "3C", "3D", "3E", "3F", "3G", "3H", "3I", "3J", "3K", "3L", "3M", "3N", "3O", "3P", "3Q", "3R", "3S", "3T", "3U", "3V", "3W", "3X", "3Y", "3Z", "3a", "3b", "3c", "3d", "3e", "3f", "3g", "3h", "3i", "3j", "3k", "3l", "3m", "3n", "3o", "45", "46", "47", "48", "49", "4A", "4B", "4C", "4D", "4E", "4F", "4G", "4H", "4I", "4J", "4K", "4L", "4M", "4N", "4O", "4P", "4Q", "4R", "4S", "4T"];

/*
      function printable(keycode){
        var valid =
       (keycode > 47 && keycode < 58)   || // number keys
       (keycode > 64 && keycode < 91)   || // letter keys
       (keycode > 96 && keycode < 112)

       return valid;
      }

      var printableCharacters = [];
      j = 47;
      while(printableCharacters.length < 255) {
        if(printable(j)) {
          for(var i = 53; i < 112; i++) {
            if(printable(i)) {
              printableCharacters.push(String.fromCharCode(j,i));
            }
          }
        } else {
          for(var i = 53; i < 112; i++) {
            if(printable(i)) {
              printableCharacters.push(String.fromCharCode(i));
            }
          }
        }
        j++;
      }

      var foo = "["
      for(var i = 0; i < 255; i++) {
          foo = foo + " \""+printableCharacters[i]+"\",";
      }
      console.log(foo);

*/


web._genIFrameHTML = function(url) {
      var myHtml =
      '<html>'+
      '<scri'+'pt>' +
      'function jsonpCallback(jsonp) {' +
      'parent.postMessage(JSON.stringify(jsonp),\'*\');'+ // can we hide this function?
      '}' +
      '</scri'+'pt>' +
      '<scri'+'pt src=\''+url+'\'></scri'+'pt>'+
      '</html>';
      return myHtml;
    };

web.getJsonp = function(url) {
      var d = document;

      // use promise
      var iframe= d.createElement("iframe");
      iframe.height = 0;
      iframe.width = 0;
      iframe.style.visibility ="hidden";
      iframe.style.display ="none";
      iframe.sandbox = 'allow-scripts allow-same-origin';
      d.body.appendChild(iframe);

      var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
      var eventer = window[eventMethod];
      var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

      console.log(url);

      // Listen to message from child window

      var promise = new Promise(function(resolve, reject){

        eventer(messageEvent,function(e) {
            iframe.remove();

            try {
              var key = e.message ? "message" : "data";
              var data = JSON.parse(e[key]);

              // should do sanity checks HERE
              // check here, else reject
              resolve(data);

            } catch(error) {
              reject(error);
            }

        },false);
      });

      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(web._genIFrameHTML(url));
      iframe.contentWindow.document.close();

      return promise;
    };


web.compressHash = function(url, additionalInfo) {
      var myString = url + ":::" + additionalInfo;
      var compressedString = LZString.compressToUint8Array(myString);

      function y(a){out = []; for(var i= 0; i < a.length; i++){out.push(a[i])}; return out;}

      return  y(compressedString).map(function(x){return web._printableCharacters[x]}).join("");
    };

web.decompressHash = function(myString) {
      var ga = [];

      for(var i = 0; i < myString.length;) {
        var str = "";
        var oldI = i;
        if(myString.charCodeAt(i) < 53) {
          str = myString.substring(i, i+2);
          i = i + 2;
        } else {
          str = myString.substring(i, i+1);
          i = i + 1;
        }

        var idx = web._printableCharacters.indexOf(str);
        if(idx < 0) {
          console.log(myString.charAt(oldI)+" "+myString.charCodeAt(oldI));
          console.log(str + " | ");
        }

        ga.push(idx);

      }

      var ex = new Uint8Array(ga.length);
      for(var i=0; i < ex.length; i++){
        ex[i] = ga[i];
      }

      var decompressedString = LZString.decompressFromUint8Array(ex);
      var nfo = decompressedString.split(":::");

      return {url: nfo[0], additionalInfo: nfo[1]};

    };

/*
web.getJsonFrom    function

    var nfo = decompressUrl(window.location.hash.substring(1));

    document.getElementById("title").innerText = nfo.additionalInfo;
    document.getElementById("url").innerText = "downloading info from "+nfo.url;

    var jsonPromise = getJsonp(document, nfo.url);

    jsonPromise.then(function(result){
      console.log("then!!")
      document.getElementById("json").innerText = result;
    })


    console.log(window.location.hash);
*/
