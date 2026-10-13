/**
 * Tutee Connect — UK Landing Page leads → Google Sheet + email.
 *
 * Receives each consultation request from the Netlify function
 * (netlify/functions/enquiry.mjs), appends it to the sheet and emails it to
 * NOTIFY_TO. See apps-script/README.md for the one-time setup.
 *
 * Script property (Project Settings → Script properties):
 *   SHARED_SECRET   must equal APPS_SCRIPT_SECRET in Netlify
 *   SHEET_ID        optional; only needed if this script is NOT bound to the sheet
 */

var CONFIG = {
  NOTIFY_TO: 'digital@tuteeconnect.com',
  SHEET_NAME: 'UK Leads',
  TIMEZONE: 'Asia/Kolkata',
  SENDER_NAME: 'Tutee Connect Website'
};

// Column order in the sheet.
var COLUMNS = [
  ['Timestamp', 'timestamp'],
  ['Full Name', 'full_name'],
  ['Phone Number', 'phone'],
  ['Email', 'email'],
  ['Additional Notes', 'notes'],
  ['Shortlisted Universities', 'shortlist'],
  ['State', 'state'],
  ['Source Page', 'source_page']
];

/* ------------------------------------------------------------- web app */

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorised' });

    var lead = normalise_(body);
    appendRow_(lead);                // the sheet is the record, so it goes first
    try {
      sendEmail_(lead);
    } catch (mailErr) {
      console.error('email failed: ' + mailErr);   // row is saved; don't fail the visitor
    }
    return json_({ ok: true });
  } catch (err) {
    console.error('doPost failed: ' + err);
    return json_({ ok: false, error: 'server error' });
  }
}

// Visiting the /exec URL in a browser just confirms the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'Tutee Connect UK leads' });
}

/* ---------------------------------------------------------------- data */

function normalise_(b) {
  var when = b.submitted_at ? new Date(b.submitted_at) : new Date();
  if (isNaN(when.getTime())) when = new Date();
  function s(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }
  return {
    date: when,
    timestamp: formatDate_(when, 'dd MMM yyyy, hh:mm a'),
    full_name: s(b.full_name, 120),
    phone: s(b.phone, 40),
    email: s(b.email, 200),
    notes: s(b.notes, 1000),
    shortlist: s(b.shortlist, 600),
    state: s(b.state, 80),
    source_page: s(b.source_page, 80) || 'UK Landing Page'
  };
}

function sheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var book = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  var sh = book.getSheetByName(CONFIG.SHEET_NAME) || book.insertSheet(CONFIG.SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS.map(function (c) { return c[0]; }));
    sh.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#8e1b1b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function appendRow_(lead) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var row = COLUMNS.map(function (c) { return c[1] === 'timestamp' ? lead.date : lead[c[1]]; });
    // a leading + or = would be read as a formula; force plain text
    row = row.map(function (v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; });
    var sh = sheet_();
    sh.appendRow(row);
    sh.getRange(sh.getLastRow(), 1).setNumberFormat('dd mmm yyyy, hh:mm am/pm');
  } finally {
    lock.releaseLock();
  }
}

function sendEmail_(lead) {
  var mail = buildEmail(lead, sheetUrl_());
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_TO,
    subject: mail.subject,
    htmlBody: mail.html,
    body: mail.text,
    name: CONFIG.SENDER_NAME,
    replyTo: lead.email
  });
}

function sheetUrl_() {
  try { return sheet_().getParent().getUrl() + '#gid=' + sheet_().getSheetId(); } catch (e) { return ''; }
}

function formatDate_(d, pattern) {
  return Utilities.formatDate(d, CONFIG.TIMEZONE, pattern);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* --------------------------------------------------------------- email */
/* Plain functions with no Apps Script services, so the exact same template
   can be rendered outside Google for a preview. */

function esc_(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmail(lead, sheetUrl) {
  var name = lead.full_name || 'New lead';
  var subject = 'New UK lead: ' + name + (lead.state ? ' (' + lead.state + ')' : '');
  var digits = String(lead.phone || '').replace(/\D/g, '');
  var dash = '<span style="color:#9aa5a4">Not provided</span>';

  var rows = [
    ['Full name', esc_(lead.full_name)],
    ['Phone number', '<a href="tel:+' + digits + '" style="color:#8e1b1b;text-decoration:none;font-weight:700">' + esc_(lead.phone) + '</a>'],
    ['Email', '<a href="mailto:' + esc_(lead.email) + '" style="color:#8e1b1b;text-decoration:none;font-weight:700">' + esc_(lead.email) + '</a>'],
    ['State', lead.state ? esc_(lead.state) : dash],
    ['Shortlisted universities', lead.shortlist ? esc_(lead.shortlist) : dash],
    ['Submitted', esc_(lead.timestamp)],
    ['Source page', esc_(lead.source_page)]
  ];

  var rowHtml = rows.map(function (r, i) {
    return '<tr>'
      + '<td style="padding:12px 16px;width:38%;font-size:13px;color:#5b6b69;border-top:' + (i ? '1px solid #eef1f0' : '0') + ';vertical-align:top">' + r[0] + '</td>'
      + '<td style="padding:12px 16px;font-size:14px;color:#0e2422;font-weight:600;border-top:' + (i ? '1px solid #eef1f0' : '0') + ';vertical-align:top">' + r[1] + '</td>'
      + '</tr>';
  }).join('');

  var notes = lead.notes
    ? esc_(lead.notes).replace(/\n/g, '<br>')
    : '<span style="color:#9aa5a4">No additional notes.</span>';

  function button(href, label, bg, fg) {
    return '<a href="' + href + '" style="display:inline-block;margin:0 6px 8px 0;padding:11px 18px;border-radius:999px;background:' + bg + ';color:' + fg + ';font-size:14px;font-weight:700;text-decoration:none">' + label + '</a>';
  }

  var html = ''
    + '<div style="display:none;max-height:0;overflow:hidden">' + esc_(name) + ' requested a free consultation from the UK Landing Page.</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f4;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">'
    + '<tr><td align="center">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e8e7">'

    // header
    + '<tr><td style="background:#061a19;padding:20px 24px">'
    + '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f5a524;font-weight:700">New consultation request</div>'
    + '<div style="margin-top:6px;font-size:22px;font-weight:800;color:#ffffff">' + esc_(name) + '</div>'
    + '<div style="margin-top:4px;font-size:13px;color:#b9c7c5">' + esc_(lead.source_page) + ' &middot; ' + esc_(lead.timestamp) + '</div>'
    + '</td></tr>'

    // quick actions
    + '<tr><td style="padding:20px 24px 8px">'
    + button('tel:+' + digits, 'Call ' + esc_(lead.phone), '#8e1b1b', '#ffffff')
    + button('https://wa.me/' + digits, 'WhatsApp', '#25d366', '#ffffff')
    + button('mailto:' + esc_(lead.email), 'Reply by email', '#f5a524', '#061a19')
    + '</td></tr>'

    // details
    + '<tr><td style="padding:8px 24px 0">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f0;border-radius:12px">' + rowHtml + '</table>'
    + '</td></tr>'

    // notes
    + '<tr><td style="padding:18px 24px 4px">'
    + '<div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#8e1b1b;font-weight:700">Additional notes</div>'
    + '<div style="margin-top:8px;padding:14px 16px;border-radius:12px;background:#f7f9f8;border-left:3px solid #f5a524;font-size:14px;line-height:1.55;color:#0e2422">' + notes + '</div>'
    + '</td></tr>'

    // footer
    + '<tr><td style="padding:18px 24px 22px;font-size:12px;color:#7a8a88;line-height:1.5">'
    + 'This lead has also been saved to the <b>UK Leads</b> sheet'
    + (sheetUrl ? ' &mdash; <a href="' + esc_(sheetUrl) + '" style="color:#8e1b1b">open the sheet</a>' : '') + '.<br>'
    + 'Replying to this email goes straight to ' + esc_(lead.email) + '.'
    + '</td></tr>'

    + '</table></td></tr></table>';

  var text = [
    'New consultation request — ' + lead.source_page,
    '',
    'Full name:                ' + lead.full_name,
    'Phone number:             ' + lead.phone,
    'Email:                    ' + lead.email,
    'State:                    ' + (lead.state || 'Not provided'),
    'Shortlisted universities: ' + (lead.shortlist || 'Not provided'),
    'Submitted:                ' + lead.timestamp,
    'Source page:              ' + lead.source_page,
    '',
    'Additional notes:',
    lead.notes || 'No additional notes.',
    '',
    'Reply to this email to answer ' + lead.full_name + ' directly.'
  ].join('\n');

  return { subject: subject, html: html, text: text };
}
