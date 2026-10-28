# Website Leads — Google Sheets + email

Every enquiry from the UK page's consultation form and from the Tutee AI
chat is added as a row to the **UK Leads** tab of the **Website Leads**
spreadsheet. It is also emailed, formatted as a table, to
business@tuteeconnect.com with Reply-To set to the student and the subject
`New UK Lead – <name>`.

```
form / chat → /api/enquiry (netlify/functions/enquiry.mjs) → Apps Script web app → UK Leads tab + email
```

This is the **same Apps Script web app the Finland, New Zealand and Poland sites
use**. It is already deployed, so nothing needs creating here. [`Code.gs`](Code.gs)
is a reference copy of it, with `setUKToken()` added and UK included in
`checkTokens()`. The script makes the `UK Leads` tab (header row formatted,
frozen and filterable) the first time a UK lead arrives.

The browser only ever talks to the site's own `/api/enquiry`. The web-app URL
and the token live in Netlify's environment, so they never appear in the page
source or this repo.

> This replaces the UK site's earlier, separate Apps Script (script property
> `SHARED_SECRET`, Netlify `APPS_SCRIPT_SECRET`, emails to digital@). If the
> Website Leads spreadsheet already has a tab called `UK Leads` from that script,
> rename it (e.g. `UK Leads (old)`) before the first new lead, so the script
> creates a fresh tab with the columns below.

## Columns

Date · Time · Full Name · Phone Number · Email · State · Shortlisted
Universities · Course · Lead Source · Preferred Call Time

- **Date / Time**: India time (IST) when the lead arrives.
- **Course**: study level, subject and start, e.g. `Master's – Data Science (Next intake)`.
- **Lead Source**: `UK Landing Page – Contact section` (or `– Tutee AI chat`),
  plus any campaign tags, e.g. `(google / cpc / uk-oct)`.
- **Shortlisted Universities**: from the hearts on the map / universities page, or typed in the form.

## Updating the script (once)

1. Open the existing Apps Script project. Copy all of its current code into a
   text file as a backup.
2. Replace the code with [`Code.gs`](Code.gs) and save.
3. In `setUKToken()`, replace the placeholder with a new long random value
   (30+ letters and numbers, different from the shared, New Zealand and Poland
   tokens), run `setUKToken`, then put the placeholder back and save.
4. Run `checkTokens`: it should read `UK: own token (LEADS_TOKEN_UK)`, with
   New Zealand and Poland still on their own tokens and Finland on the shared one.
5. **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.**
   The `/exec` URL stays the same. Do not create a new deployment.

## Netlify environment variables (this site)

| Key | Value | Scopes |
|---|---|---|
| `APPS_SCRIPT_URL` | the same `/exec` URL as the Finland site | all deploy contexts |
| `APPS_SCRIPT_TOKEN` | this site's own token: the value saved as `LEADS_TOKEN_UK` in the script (mark as secret) | Production, Deploy Previews |
| `SITE_COUNTRY` | `UK` | all deploy contexts |

Delete the old `APPS_SCRIPT_SECRET` variable. Then **Deploys → Trigger deploy**.
Check `https://<your-site>/api/enquiry` in a browser: it should show
`"sheet_configured": true` and `"country": "UK"`. `/api/enquiry?check=sheet`
also asks the script whether it accepts this site's token, without saving or
sending anything.

## Tokens

The script accepts a separate token per country, saved in its Script Properties as
`LEADS_TOKEN_<COUNTRY>` (UK: `LEADS_TOKEN_UK`, set with `setUKToken()`).
Once a country has its own token, only that token is accepted for its leads and it
cannot write into another country's tab. Countries without one (Finland) keep using
the shared `LEADS_TOKEN`. Run `checkTokens()` in the editor to see which is which.

## Fallback

If the script can't be reached or rejects the token, the function emails the
lead through Resend instead (needs `RESEND_API_KEY`), so there is one email per
lead, never two. The Netlify function log records `apps script failed`.
