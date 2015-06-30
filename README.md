#TODO/NOTES:
* free form suche
  random selection of source uris
* attach meta info to uuid?
* version ids in jsons
* tags in json
* presentation properties, vllt bigpic, colors?
* generated time stamp per playlist
* auto upload zu google docs etc
* think of convenient sharing sys
* webtorrent
* hash decal filename for embedding QR code?
* promises+chaining for the async stuff, FRP? baconjs, kefir, rxjs?
* add with auto reload field to json? could be used to piggback other info on top of it? like social features? encrpytion, fake "local" storage?

#JSON
* add id3 tags comment per media
* tags per media  + playlist
* involved ppl, freiform
* download allow yes/no
http://www.openajax.org/whitepapers/Ajax%20and%20Mashup%20Security.php
You can take several approaches to secure the use of JSON. The first approach is to use the regular expressions defined in RFC 4627 to make sure the JSON data doesn't contain active parts. Listing 12 demonstrates how to check a JSON string with a regular expression:
http://www.html5rocks.com/en/tutorials/security/sandboxed-iframes/
Listing 12. Checking a JSON string with a regular expression

	var my_JSON_object = !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(
    text.replace(/"(\.|[^"\])*"/g, ' '))) &&
    eval('(' + text + ')');

    https://stackoverflow.com/questions/29022794/is-getjson-safe-to-call-on-untrusted-url

#done:
* local storage (indexddb)
* preliminary support for CROS using YQL/jsonp

#names?
* boombox
* lazershell
* boomshell
* lazerbox
* hahha...
* infinitybox

#manifesto: alpha
* no platforms, no middlemen 2.0
* what can be linked, can be shared
* federation > centralization
  * trust towards known entities
* app and data are separate, it follows:
  * no user data is shared, everything is kept local
  * no third parties are part of sharing
