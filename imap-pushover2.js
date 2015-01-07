var fs = require('fs');
var yaml = require('js-yaml');
var imap = require('imap');
var debug = require('debug');

var dbg = debug('imap-pushover2');

try {
  config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));
} catch (e) {
  dbg(e);
  process.exit(1);
}

dbg('configuration: %s', config);

