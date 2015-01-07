var fs = require('fs');
var yaml = require('js-yaml');
var imap = require('imap');
var mailparser = require("mailparser").MailParser;
var htmltotext = require('html-to-text');
var pushover = require('pushover-notifications');
var debug = require('debug');
var util = require('util');

var dbg = debug('imap-pushover2:general');
var dbgErr = debug('imap-pushover2:error');
var dbgImap = debug('imap-pushover2:imap');
var dbgPush = debug('imap-pushover2:push');

function connReady() {
  dbgImap('connection ready');
  dbgImap('opening imap folder %s', config.folder);
  conn.openBox(config.folder, true, function(err, box) {
    if(err) {
      errorExit(err)
    }
    dbgImap('%s opened', config.folder);
  });
}

function connMail(count) {
  dbgImap('server notified about %s messages', count);
  conn.search(['UNSEEN'], function(err, results) {
    dbgImap('searching for new unread messages');
    if(err) {
      errorExit(err);
    }
    dbgImap('found unread messages %s', JSON.stringify(results));
    dbgImap('already seen messages %s', JSON.stringify(seen_msgs));
    for (var i = results.length - 1; i >= 0; i--) {
      if(seen_msgs.indexOf(results[i]) == -1) {
        dbgImap('going to retrieve %s', results[i]);
        connRetrieve(results[i]);
        seen_msgs.push(results[i]);
      } else {
        dbgImap('skipping %s', results[i]);
      }
    };
  });
}

function connRetrieve(uid) {
  var mp = new mailparser({'defaultCharset': 'utf8'});
  mp.on('end', processMail);
  var f = conn.fetch([uid], { bodies: [''] });
  f.on('message', function(msg, seqno) {
    dbgImap('retrieved message %s as %s', uid, seqno);
     msg.on('body', function(stream, info) {
      stream.on('data', function(chunk) {
        dbgImap('message part received');
        mp.write(chunk);
      });
      stream.once('end', function() {
        dbgImap('end of message part stream');
        mp.end();
      });
    });
    msg.once('end', function() {
      dbgImap('end of message parts');
    });
  });
  f.once('error', errorExit);
  f.once('end', function() {
    dbgImap('finished retrieving %s', uid);
  });
}

function connExpunge(seqno) {
  dbgImap('message sequence number %s was expunged', seqno);
}

function connClose(e_bool) {
  if(e_bool) {
    dbgImap('connection closed with error');
  } else {
    dbgImap('connection closed without error');
  }
}

function errorExit(err) {
  console.log(err);
  process.exit(1);
}

function connEnd() {
  dbgImap('connection ended');
}

function processMail(mail) {
  dbgPush('message being processed %s', mail.date);
  var text = 'no mail body';
  if(mail.text) {
    text = mail.text;
  } else if(mail.html) {
    text = htmltotext.fromString(mail.html);
  }
  summary = JSON.stringify(mail.from) + '\n' + mail.subject + '\n' + text;
  summary = summary.toLowerCase();
  var no_priority = -1000;
  var best_priority = no_priority;
  for(var i in config.notify_words) {
    if(summary.indexOf(i) > -1) {
      dbgPush('matched %s priority', i, config.notify_words[i]);
      if(config.notify_words[i] > best_priority)
        best_priority = config.notify_words[i];
    }
  }
  if(best_priority > no_priority) {
    var from_text = mail.from[0].address;
    if(mail.from[0].name) {
      from_text = mail.from[0].name;
    }
    dbgPush('sending pushover with priority %s', best_priority);
    sendPushover(from_text, mail.subject, text, best_priority);
  } else {
    dbgPush('no notification for this message');
  }
}

function sendPushover(from, subject, body, priority) {
   var pushoverConfig = {
      user: config.pushover_user,
      token: config.pushover_token,
      onerror: errorExit
    };
  var title = from + ' - ' + subject;
  var msg = body.slice(0, config.body_length);
  dbgPush('title: %s', title);
  dbgPush('message: %s', msg);
  var p = new pushover(pushoverConfig);
  var pushoverMsg = {
      title: title,
      message: msg,
      sound: config.pushover_sound,
      device: config.pushover_device,
      priority: priority,
      retry: config.pushover_retry,
      expire: config.pushover_expire
  };
  p.send(pushoverMsg, function(err, result) {
    if ( err ) {
      errorExit(err);
    }
    dbgPush('sent to pushover %s', JSON.stringify(result));
  })
}

dbg('started');
var configFile = 'config.yaml'
if(process.argv[2]) {
  configFile = process.argv[2]
}
try {
  config = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'));
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

conn.on('ready', connReady);
conn.on('mail', connMail);
conn.on('expunge', connExpunge);
conn.on('close', connClose);
conn.on('error', errorExit);
conn.on('end', connEnd);
dbgImap('opening connection');
conn.connect();
