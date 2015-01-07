# imap-pushover2

Listens to an IMAP mailbox using IDLE, then sends a Pushover notification when new emails arrive. This one is in Javascript.
This is useful to get new email notifications pushed within seconds to iOS or Android, but avoids needing to keep an open connection to the IMAP server on the phone/tablet. Avoiding the open connection saves battery on my phone and probably will on yours too.
The Pushover notification can contain a link to read the rest of the email using webmail or another app.

## Requirements

- Node.js 0.10+
- NPM packages: imap, mailparser, js-yaml, html-to-text, pushover-notifications, debug

## Configuration

Edit config.yaml with your own settings for the IMAP mail server and Pushover. You'll need to get your own API token and user key from Pushover.

notify_words sets the priority of different emails (for example, mailing list discussion vs things that should wake you up in the middle of the night).
In the configuration file, it's expressed as a mapping of strings to [Pushover API priorities](https://pushover.net/api#priority). The highest priority found in the email is used for the Pushover message. A single space will match any email.

## Use

```sh
export DEBUG='*' #enable debug logging
node imap-pushover2.js
```

## Why write this again?

This is mostly for me to try out another programming language and set of libraries. I find that easier to do by working on an actual problem and looking up documentation as needed rather than reading tutorials with toy examples.

If you're using the original imap-pushover and are happy with it, keep using it.

There were a few annoyances with the previous version that are better in this version:

- Management of multiple connections wasn't very good in the original. After leaving it running for over a day and receiving a few emails, there were many dangling connections from the program shown by lsof(8) or netstat(8). This version only uses a single connection at a time to the IMAP server, so shouldn't have that problem.
- Memory usage in the original seemed kind of high for what it did, about 80-100MB on Linux amd64. The original version used two processes - one worker and another to monitor that worker, restart it if it crashed etc. Both of those processes have the same longish list of gems included, which increases the amount of memory used. This version only has a single process.

Keeping this program running as a daemon is currently not handled. That's best done by some other external program, such as systemd, daemontools or foreverjs. I don't plan on reimplementing that part of the original in this one.

Interestingly, the number of lines of code works out about the same in both the original and this version.

## See also

The original ruby version: https://github.com/tjtg/imap-pushover/
