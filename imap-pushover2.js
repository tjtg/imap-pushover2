var fs = require('fs');
var yaml = require('js-yaml');
var imap = require('imap');
var debug = require('debug');
var util = require('util');

var dbg = debug('imap-pushover2');

dbg('started');

var config_file = 'config.yaml'
if(process.argv[2]) {
  config_file = process.argv[2]
}

try {
  config = yaml.safeLoad(fs.readFileSync(config_file, 'utf8'));
} catch(err) {
  errorExit(err);
}

dbg('configuration: %s', JSON.stringify(config));

var imap_config = {
  user: config.username,
  password: config.password,
  host: config.server,
  port: config.port,
  tls: config.ssl,
};

var conn = new imap(imap_config);
var seen_msgs = []; //UIDs of seen messages

function connReady() {
  dbg('connection ready');
  dbg('opening imap folder %s', config.folder);
  conn.openBox(config.folder, true, function(err, box) {
    if(err) {
      errorExit(err)
    }
    dbg('%s opened', config.folder);
  });
}

function connMail(count) {
  dbg('%s new messages arrived', count);
  conn.search(['UNSEEN'], function(err, results) {
    dbg('searching for new unread messages');
    if(err) {
      errorExit(err);
    }
    dbg('found unread messages %s', JSON.stringify(results));
    dbg('seen messages %s', JSON.stringify(seen_msgs));
    for (var i = results.length - 1; i >= 0; i--) {
      if(seen_msgs.indexOf(results[i]) == -1) {
        dbg('going to retrieve %s', results[i]);
        connRetrieve(results[i]);
      } else {
        dbg('skipping %s', results[i]);
      }
    };
  });
}

function connRetrieve(uid) {
  var f = conn.fetch([uid], { bodies: ['HEADER.FIELDS (TO FROM CC SUBJECT)', 'TEXT'] });
  f.on('message', function(msg, seqno) {
    dbg('retrieved message %s as %s', uid, seqno);
     msg.on('body', function(stream, info) {
      var buffer = '';
      stream.on('data', function(chunk) {
        buffer += chunk.toString('utf8');
      });
      stream.once('end', function() {
        dbg('end of message part stream');
        if (info.which !== 'TEXT') {
          dbg('Parsed header: %s', util.inspect(imap.parseHeader(buffer)));
        } else {
          dbg(buffer);
        }
      });
    });
    msg.once('end', function() {
      dbg('end of message parts');
    });
  });
  f.once('error', errorExit);
  f.once('end', function() {
    dbg('finished retrieving %s', uid);
  });
}

function connExpunge(seqno) {
  dbg('message sequence number %s was expunged', seqno);
}

function connClose(e_bool) {
  if(e_bool) {
    dbg('connection closed with error');
  } else {
    dbg('connection closed without error');
  }
}

function errorExit(err) {
  console.log(err);
  process.exit(1);
}

function connEnd() {
  console.log('connection ended');
}

conn.on('ready', connReady);
conn.on('mail', connMail);
conn.on('expunge', connExpunge);
conn.on('close', connClose);
conn.on('error', errorExit);
conn.on('end', connEnd);
dbg('opening connection');
conn.connect();
