var request = require('request');
var cheerio = require('cheerio');
var phantom = require('phantom');
var http = require('http');
var Dropbox = require('dropbox');

var mainURL = 'http://eco99fm.maariv.co.il/RecordedPrograms/?RecordedCategoryId=1'
var playerURLPrefix = 'http://eco99fm.maariv.co.il/jwplayer/AudioWindow.aspx?id='
var sourceFilePrefix = 'http://eco99fm.maariv.co.il/mediafiles/'
var latestDownloadDetailsFile = 'latest-download.json';
var destinationPath = './';
var latestDownloadDetails = { fileName : "", path : destinationPath, playerURL : ""};
var fs = require("fs");
var tempFileName = "temp.mp3";

var client = new Dropbox.Client({
  key         : "ylgy232x07vcw4w",
  secret      : "aovhnzw9ijpw4i7",
  token       : "kw7k1nnGpTsAAAAAAAACwerdHyB-C30-Lneh8vFVXjP-4sB01DFYlkO_UpBG6Vsm",
  sandbox     : false
});


client.getAccountInfo(function(error, accountInfo) {
  if (error) {
    return showError(error);  // Something went wrong.
  }

  console.log("Hello, " + accountInfo.name + "!");
});

client.readdir("/", function(error, entries) {
  if (error) {
    return showError(error);  // Something went wrong.
  }

  console.log("Your Dropbox contains " + entries.join(", "));
});



client.delete(tempFileName, function(error) {
  console.log("Temp file removed from Dropbox");
});



getPage(mainURL, function(err,html) {

  saveHTML("jspro.htm",html);

  var $ = cheerio.load(html);
  $('tbody tr a').filter(function(){

    // Let's store the data we filter into a variable so we can easily see what's going on.
    var data = $(this);

    // Navigate and get the text from:
    // <tr><td width="100%" align="right" valign="bottom" height="40"><a href="javascript:PlayThisSong('3261','1');"><img src="/images/but_leazana.gif" width="157" height="39" border="0">

    var fileId = data.children()[0].parent.attribs.href;
    fileId = fileId.split('\'')[1];

    var playerURL = playerURLPrefix + fileId;
    getPage(playerURL, function(err,html) {
      $ = cheerio.load(html);
      $('table tr td script').filter(function(){
        data = $(this);
        var sourceFile = data.html().split("\'file\':")[1].split("\'")[1];
        var sourceFileURL = sourceFilePrefix + sourceFile.split('/')[2];

        var latestDownloadDetails = require(destinationPath + latestDownloadDetailsFile);
        if (sourceFile.split('/')[2] == latestDownloadDetails.fileName) {
          console.log("File already exists: " + latestDownloadDetails.fileName);
        } else {
          console.log("Downloading: " + sourceFile);

          downloadFile(sourceFileURL, destinationPath, sourceFile.split('/')[2], function(err) {
            if(err) {
              console.log(err);
            }
            else {
              latestDownloadDetails.fileName = sourceFile.split('/')[2];
              latestDownloadDetails.playerURL = playerURL;
              fs.writeFile(latestDownloadDetailsFile, JSON.stringify(latestDownloadDetails, null, 4), function(err){
                if (err) {
                  console.log(err);
                } else {
                  console.log('File successfully written! - Check your project directory for the output.json file');
                };
              });
            };
            sendToDropbox(sourceFile.split('/')[2], function(err) {
              console.log("*** after DB send");
              /*              client.move(tempFileName, sourceFile.split('/')[2], function(error, stat) {
              console.log("*** after DB rename");
              if (error) {
              return showError(error);
            };
          });
          */
        });
        console.log("***end***");
      });

    };

  });

});

// Once we have our title, we'll store it to the our json object.

//    console.log(playerURL);
});

});



function getPage(url, callback) {
  phantom.create(function (ph) {
    ph.createPage(function (page) {
      page.open(url, function () {
        page.evaluate(function () {return document.documentElement.innerHTML;}, function(result) {
          ph.exit();
          callback(null, result);
        });
      });
    });
  });
};


function handleResult(err, result) {
  if (err) {
    // Just an example. You may want to do something with the error.
    console.error(err.stack || err.message);

    // You should return in this branch, since there is no result to use
    // later and that could cause an exception.
    //    ret = result;
    return;
  };
  //  console.log(result);
  return(result);

  // All your logic with the result.
};


function downloadFile(source, path, fileName, callback){
  var file = fs.createWriteStream(fileName);
  var request = http.get(source, function(response) {

    response.pipe(file);

    response.on('end', function(){
      console.log('File downloaded.');
      callback(null);
    });
  });

};


function saveHTML(fileName) {
  fs.writeFile(fileName, function(err) {
    if(err) {
      console.log(err);
    }
    else {
      console.log("The file was saved!");
    }
  });

};


function sendToDropbox(fileName, callback) {
  fs.readFile(fileName, function(error, data) {
    // No encoding passed, readFile produces a Buffer instance

    console.log("*** Before sending to DB");
    client.writeFile(fileName, data, function(error) {
      console.log("File saved to Dropbox");
      setImmediate(function() { callback(null) });
    });

  });


  /*
  client.writeFile(fileName, file, function(error, stat) {
  if (error) {
  return showError(error);  // Something went wrong.
}

console.log("File saved to Dropbox");
});
*/
};


function showError(error) {
  switch (error.status) {
    case Dropbox.ApiError.INVALID_TOKEN:
      // If you're using dropbox.js, the only cause behind this error is that
      // the user token expired.
      // Get the user through the authentication flow again.
      console.log("Error 1");
      break;

      case Dropbox.ApiError.NOT_FOUND:
        // The file or folder you tried to access is not in the user's Dropbox.
        // Handling this error is specific to your application.
        break;

        case Dropbox.ApiError.OVER_QUOTA:
          // The user is over their Dropbox quota.
          // Tell them their Dropbox is full. Refreshing the page won't help.
          break;

          case Dropbox.ApiError.RATE_LIMITED:
            // Too many API requests. Tell the user to try again later.
            // Long-term, optimize your code to use fewer API calls.
            break;

            case Dropbox.ApiError.NETWORK_ERROR:
              // An error occurred at the XMLHttpRequest layer.
              // Most likely, the user's network connection is down.
              // API calls will not succeed until the user gets back online.
              break;

              case Dropbox.ApiError.INVALID_PARAM:
                case Dropbox.ApiError.OAUTH_ERROR:
                  case Dropbox.ApiError.INVALID_METHOD:
                    default:
                      // Caused by a bug in dropbox.js, in your application, or in Dropbox.
                      // Tell the user an error occurred, ask them to refresh the page.
                    }
                  };
                  
