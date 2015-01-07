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
} catch(e) {
  console.log(e);
  process.exit(1);
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

function mainReady() {
  dbg('connection ready');
  mainInbox();
}

function mainInbox() {
  dbg('opening inbox');
  conn.openBox(config.mailbox, true, function(err, box) {
    if(err) {
      console.log(err);
      conn.end();
    }
    dbg('inbox opened');
  });
}

function mainMailArrived(count) {
  dbg('%s new messages found', count);
}

function mainExpunge(seqno) {
  dbg('message sequence number %s was expunged', seqno);
}

function mainClose(e_bool) {
  if(e_bool) {
    dbg('connection closed with error');
  } else {
    dbg('connection closed without error');
  }
}

function mainError(err) {
  console.log(err);
}

function mainEnd() {
  console.log('connection ended');
}

conn.on('ready', mainReady);
conn.on('mail', mainMailArrived);
conn.on('expunge', mainExpunge);
conn.on('close', mainClose);
conn.on('error', mainError);
conn.on('end', mainEnd);
conn.connect();
