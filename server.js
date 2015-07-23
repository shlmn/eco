var request = require('request');
var cheerio = require('cheerio');
var phantom = require('phantom');
var http = require('http');
var Dropbox = require('dropbox');

var settings = require('./settings.json');
var mainURL = settings.mainURL;
var sourceFilePrefix = settings.sourceFilePrefix;
var localPath = settings.localPath;
var tmpPath = settings.tmpPath;
var destinationPath = settings.destinationPath;

var latestDownloadDetailsFile = 'latest-download.json';
var latestDownloadDetails = { fileName : "", path : tmpPath, playerURL : ""};

var fs = require("fs");

console.log("*** " + mainURL);
getPage(mainURL, function(err,html) {

  saveHTML(settings.latestMainHTML,html);

  var $ = cheerio.load(html);

  var idx = 0;
  var playerParts = [];
  $('div table tr td table tr td div a').filter(function(){
    playerParts.push($(this));
  });

  // Let's store the data we filter into a variable so we can easily see what's going on.
  var data = playerParts[0].get("0");

  // Navigate and get the text from:
  // <tr><td width="100%" align="right" valign="bottom" height="40"><a href="javascript:PlayThisSong('3261','1');"><img src="/images/but_leazana.gif" width="157" height="39" border="0">

  var fileId = data.attribs.href;
  var playerURL = mainURL + fileId;

  getPage(playerURL, function(err,html) {
    $ = cheerio.load(html);
    $('div center div input').filter(function(){
      data = $(this);
      sourceFile = data.attr('value').split('/')[5];
      var sourceFileURL = sourceFilePrefix + sourceFile;
      console.log("***" + sourceFile);

      console.log(localPath + latestDownloadDetailsFile);
      var latestDownloadDetails = require(localPath + latestDownloadDetailsFile);

      if (sourceFile == latestDownloadDetails.fileName) {
        console.log("File already exists: " + latestDownloadDetails.fileName);
      } else {
        console.log("Downloading: " + sourceFile);

        downloadFile(sourceFileURL, tmpPath, sourceFile, function(err) {
          if(err) {
            console.log(err);
          }
          else {
            console.log("finished download");
            latestDownloadDetails.fileName = sourceFile;
            latestDownloadDetails.playerURL = playerURL;
            fs.writeFile(localPath + latestDownloadDetailsFile, JSON.stringify(latestDownloadDetails, null, 4), function(err){
              if (err) {
                console.log(err);
              } else {
                console.log('File successfully written! - Check your project directory for the output.json file');
              };
            });
            var src = tmpPath + sourceFile;
            var dest = destinationPath + sourceFile;
            console.log("*** * " + src);
            var mv = require('mv');

            mv(src, dest, function(err) {
              // handle the error
            });
            console.log("*** *" + dest);
          };
          console.log("***end***");
        });
      };
    });
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
  console.log("*** " + source);
  var file = fs.createWriteStream(path+fileName);

  var req = request.get(source).pipe(file);
  req.on('finish', function(){
    console.log('File downloaded.');
    callback(null);
  });
};


function saveHTML(fileName, html) {
  fs.writeFile(fileName, html, function(err) {
    if(err) {
      console.log(err);
    }
    else {
      console.log("The file was saved!");
    };
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
