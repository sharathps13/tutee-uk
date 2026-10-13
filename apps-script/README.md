# UK leads: Google Sheet + email

The consultation form posts to `/api/enquiry` (Netlify function), which forwards
the lead to this Apps Script. The script adds a row to the **UK Leads** sheet and
emails **digital@tuteeconnect.com**.

Sheet columns: Timestamp · Full Name · Phone Number · Email · Additional Notes ·
Shortlisted Universities · State · Source Page (always "UK Landing Page").

## One-time setup

1. Create (or open) the Google Sheet, then **Extensions → Apps Script**.
2. Replace the default `Code.gs` with this folder's `Code.gs`. Save.
3. **Project Settings → Script properties → Add**: `SHARED_SECRET` = a long random
   string (keep it; Netlify needs the same value).
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   Authorise when asked (Sheets + send email). Copy the URL ending in `/exec`.
5. In Netlify → Site configuration → Environment variables, add:
   - `APPS_SCRIPT_URL` = the `/exec` URL
   - `APPS_SCRIPT_SECRET` = the same string as `SHARED_SECRET`
   Then redeploy the site.
6. Check: open `https://<your-site>/api/enquiry` — it should report
   `"apps_script_configured": true`. Submit the form once and confirm the row and
   the email arrive.

After editing `Code.gs` later, use **Deploy → Manage deployments → Edit → New
version** so the same `/exec` URL keeps working.

The sheet tab and header row are created automatically on the first lead.
