# CJHQ admin: feature map (Phase 0 audit)

Audit of the admin as of commit 008b8b7 (September 22, 2026), done before any change. Everything listed here must still work after the rebuild. Nothing is removed without the owner's approval.

Where it lives:
- Markup: `tools/admin-panel.inc`, injected into `admin.html` by `tools/generate-routes.mjs`. `tools/admin-panel.html` is an older copy that nothing reads; it is kept as is.
- Admin JavaScript: `tools/admin-app.js` (moved out of `index.html` in Phase 1, same injection).
- Ask CJHQ engine: `tools/ask-engine.js` (already admin-only).
- Backend: Firebase project from `FIREBASE_CONFIG` in `index.html`. Auth + Firestore. No Cloud Functions or Storage code in the repo.

## Authentication and staff access
- Sign-in methods: email + password (`signInWithEmailAndPassword`), and Google (`signInWithPopup` with `GoogleAuthProvider`). Sign out button.
- The auth state drives the panel (`onAuthStateChanged` -> `syncAdminAuthUI`). A signed-in user who isn't staff is shown an error and signed out.
- Staff check, in order: (1) SHA-256 of the email against `STAFF_EMAIL_HASHES` (6 built-in hashes, in admin code); (2) a doc in the `staff` collection keyed by lowercase email. Built-in staff also get a `staff` record created on first sign-in (`ensureOwnStaffRecord`).
- The server-side boundary is the Firestore security rules. They live only in the Firebase console and are NOT in the repo. Code comments say every write needs `request.auth != null` and that a short built-in staff list is written into the rules. Not verified.
- There are no roles: every staff member can do everything, including adding and removing staff.
- App Check: loaded only for Ask CJHQ (Firebase AI). Code comment says Firestore/Auth App Check enforcement is Unenforced (checked 2026-09-02).

## Firestore collections and documents
Public site reads (these must keep working): `notices`, `partners`, `partner_overrides`, `resources`, `resource_overrides`, `resources_master` (meta), `events`, `content_overrides`, `custom_pages`, `page_settings/public_pages` (index of live custom pages), `settings/site` (site settings + section visibility), `reviewed_overrides`, `pending_change_notices`.
Public site writes: `contact_submissions` (copy of the contact form), `error_reports` (404s and JS errors).
Admin only: `staff`, `link_audits`, `ask_sources`.

## Operations by function (admin code)
- `staffDocExists`: getDoc(fs)
- `ensureOwnStaffRecord`: getDoc(fs), setDoc(fs)
- `fetchStaffCollection`: getDocs(fs)
- `addStaffMember`: setDoc(fs)
- `removeStaffMember`: deleteDoc(fs)
- `renderPagesList`: fetchCollection(page_settings)
- `toggleBuiltInPageHidden`: saveToCollection(page_settings)
- `renderCustomPagesList`: fetchCollection(custom_pages)
- `backfillCustomPageLifecycle`: saveToCollection(custom_pages)
- `deleteCustomPage`: deleteFromCollection(custom_pages)
- `renderContentBlocksList`: fetchCollection(content_overrides)
- `saveContentBlock`: saveToCollection(content_overrides)
- `resetContentBlock`: deleteFromCollection(content_overrides)
- `renderAdminNoticesList`: fetchCollection(notices)
- `editNotice`: fetchCollection(notices)
- `removeNotice`: deleteFromCollection(notices)
- `renderEmbeddedPartnersList`: fetchCollection(partner_overrides)
- `savePartnerContact`: saveToCollection(partner_overrides)
- `togglePartnerHidden`: saveToCollection(partner_overrides)
- `savePartnerLinkOverride`: saveToCollection(partner_overrides)
- `renderAdminPartnersList`: fetchCollection(partners)
- `editPartner`: fetchCollection(partners)
- `removePartner`: deleteFromCollection(partners)
- `renderAdminResourcesList`: fetchCollection(resources)
- `editResource`: fetchCollection(resources)
- `removeResource`: deleteFromCollection(resources)
- `renderExistingResourcesList`: fetchCollection(resource_overrides)
- `saveExistingResourceOverride`: saveToCollection(resource_overrides)
- `resetExistingResourceOverride`: deleteFromCollection(resource_overrides), saveToCollection(resource_overrides)
- `toggleResourceHidden`: saveToCollection(resource_overrides)
- `renderAdminEventsList`: fetchCollection(events)
- `editEvent`: fetchCollection(events)
- `removeEvent`: deleteFromCollection(events)
- `syncResourcesToBackend`: setDoc(fs)
- `renderLinkAuditList`: fetchCollection(link_audits)
- `renderErrorReportsList`: fetchCollection(error_reports)
- `renderMessagesList`: deleteFromCollection(contact_submissions), deleteFromCollection(error_reports), fetchCollection(contact_submissions)
- `markResourceReviewed`: deleteFromCollection(link_audits), saveToCollection(reviewed_overrides)
- `publishChangeNotice`: fetchCollection(link_audits), saveToCollection(pending_change_notices)
- `initAdmin`: saveToCollection(custom_pages)
- `initVisibilityAdmin`: fetchCollection(notices), saveToCollection(notices), setSectionVisibility(sec)
- `initAskCjhq`: deleteDoc(fs), getDocs(fs), saveSettingsDoc(), saveSettingsDoc(s), saveToCollection(events), saveToCollection(notices), saveToCollection(partners), saveToCollection(resources), setDoc(fs)
## Tabs, fields and actions
Each tab's static fields and buttons are listed below. "Dynamic lists" are rendered by code and carry per-row actions (Edit, Delete/Remove, Hide/Show, Copy link, Reset, Mark reviewed, Publish/Unpublish, and so on).

### Pages (`tab-pages`)
Sections: Site Pages; Add a New Page; When the page is public; Sharing; Homepage; Preview; Pages Added Here
Fields: customPageId(hidden), customPageSlug(text), customPageTitleEn(text), customPageTitleFr(text), customPageFormatHtml(radio), customPageFormatText(radio), customPageBodyEn(textarea), customPageFileEn(file), customPageBodyFr(textarea), customPageFileFr(file), customPageShowNav(checkbox), customPageNavEn(text), customPageNavFr(text), customPagePublished(checkbox), customPageStart(date), customPageEnd(date), customPageShowHome(checkbox), customPageHomeStyle(select), customPageHomeCtaEn(text), customPageHomeCtaFr(text), customPageHomeBlurbEn(text), customPageHomeBlurbFr(text)
Static buttons: Load from a file… [#customPageFileEnBtn]; Load from a file… [#customPageFileFrBtn]; Copy Share Link [#customPageShareCopy]; Open Share Link [#customPageShareOpen]; WhatsApp [#customPageShareWhatsApp]; Email [#customPageShareEmail]; English [#customPagePreviewEnBtn]; Français [#customPagePreviewFrBtn]; Save Page [#customPageSaveBtn]; Cancel Edit [#customPageCancelBtn]; Update now [#customPageBackfillBtn]
Dynamic lists (rendered by JS, contain per-row actions): pagesList, customPageShareBox, customPagesList

### Page Content (`tab-content`)
Sections: Page Content
Fields: contentPageSelect(select)
Dynamic lists (rendered by JS, contain per-row actions): contentBlocksList

### Notices & Popups (`tab-notices`)
Sections: Site Notices & Popups
Fields: noticeId(hidden), noticeType(select), noticeStyle(select), noticeTitleEn(text), noticeTitleFr(text), noticeBodyEn(textarea), noticeBodyFr(textarea), noticeStartsOn(date), noticeEndsOn(date), noticeActive(checkbox), noticeDraft(checkbox)
Static buttons: Save Notice [#noticeSaveBtn]; Cancel Edit [#noticeCancelBtn]
Dynamic lists (rendered by JS, contain per-row actions): noticesList

### Site Settings (`tab-settings`)
Sections: Site Settings; Organization Name; Contact Information; Social Media; Footer Tagline; Logo; Brand Colors
Fields: setOrgEn(text), setOrgFr(text), setAddrEn(text), setAddrFr(text), setPhone(text), setEmail(text), setFacebook(text), setX(text), setTaglineEn(text), setTaglineFr(text), setLogoUrl(text), setColorPrimary(color), setColorAccent(color)
Static buttons: Reset to Default Colors [#resetColorsBtn]; Save Settings [#settingsSaveBtn]

### Partners (`tab-partners`)
Sections: Partners Marquee; Currently on the site; Add a New Partner; Added via this admin panel
Fields: partnerId(hidden), partnerName(text), partnerLogoUrl(text), partnerLinkUrl(text)
Static buttons: Save Partner [#partnerSaveBtn]; Cancel Edit [#partnerCancelBtn]
Dynamic lists (rendered by JS, contain per-row actions): partnerContactEditorBox, embeddedPartnersList, partnersAdminList

### Resource Links (`tab-resources`)
Sections: Add a Resource Link; Existing Resources (edit or hide)
Fields: resourceId(hidden), resourceCategory(select), resourceTitleEn(text), resourceTitleFr(text), resourceDescEn(text), resourceDescFr(text), resourceUrl(text), existingResourceSearch(text)
Static buttons: Save Link [#resourceSaveBtn]; Cancel Edit [#resourceCancelBtn]
Dynamic lists (rendered by JS, contain per-row actions): resourcesAdminList, existingResourcesList

### Calendar (`tab-calendar`)
Sections: Community Calendar
Fields: eventId(hidden), eventTitleEn(text), eventTitleFr(text), eventDate(date), eventStart(time), eventEnd(time), eventLocation(text), eventDescEn(textarea), eventDescFr(textarea), eventLink(text)
Static buttons: Save Event [#eventSaveBtn]; Cancel Edit [#eventCancelBtn]
Dynamic lists (rendered by JS, contain per-row actions): eventsAdminList

### Link Audit (`tab-linkaudit`)
Sections: Monthly Link Audit; Flagged Items; Visitor-Reported Issues
Static buttons: Sync Current Resources to Backend [#syncResourcesBtn]; Refresh Results [#refreshAuditBtn]
Dynamic lists (rendered by JS, contain per-row actions): linkAuditList, errorReportsList

### Messages (`tab-messages`)
Sections: Contact Form Messages
Fields: messagesSearch(text)
Dynamic lists (rendered by JS, contain per-row actions): messagesList

### Ask CJHQ (`tab-askcjhq`)
Sections: Ask CJHQ; Language Review; Knowledge Sources
Fields: askInput(text)
Static buttons: Send [#askSend]; New Conversation [#askNew]; Clear [#askClear]; Copy Response [#askCopy]; Hide Sources [#askToggleSources]; Run Language Review [#langBenchRun]; Run with AI phrasing [#langBenchRunAI]; Copy for reviewer [#langBenchCopy]; Clear [#langBenchClear]; Add Source [#askAddSource]; Load Default Sources [#askSeedSources]
Dynamic lists (rendered by JS, contain per-row actions): askBackendStatus, askLog, langBenchStatus, askSourcesList

### Publishing (`tab-visibility`)
Sections: Publishing
Dynamic lists (rendered by JS, contain per-row actions): visibilityList

### Staff Access (`tab-staff`)
Sections: Staff Access; Add someone
Fields: staffAddEmail(email)
Static buttons: Add; Sign out [#adminLogoutBtn]
Dynamic lists (rendered by JS, contain per-row actions): staffList

## Workflows that must be kept
- Pages: built-in pages can be hidden or shown (`page_settings`). Custom pages have a slug, EN/FR title and body (HTML or plain text, can load from a file), optional nav entry, published flag, start/end dates (the whole public life of the page), homepage promo (style, CTA, blurb), a share link with WhatsApp/Email/Copy/Open, EN/FR preview, and a "backfill" button for older pages. Live custom pages get a static preview file at `/<slug>` (and `/notice/<slug>`) from the Notice Pages workflow every 15 minutes. Those files are `noindex, follow` on purpose, and they are not in the sitemap.
- Page Content: per-block EN/FR overrides (`content_overrides`), saved per block, live right away. A blank field falls back to the built-in text. Reset per block.
- Notices & Popups: banner or popup; info/warning/urgent; EN/FR title and message; start/end dates (inclusive); Active; Save as draft (never public). Public rendering is `renderPublicNotices` / `isLiveNow`.
- Site Settings: org name EN/FR, address EN/FR, phone, email, Facebook, X, tagline EN/FR, logo URL, two brand colours (with reset). Saved to `settings/site` and applied site-wide.
- Partners: the built-in marquee logos can be hidden and re-linked, and have a partner contact directory (`partner_overrides`). Admin-added partners have a name, a logo URL and a link.
- Resource Links: add links per category, EN/FR title and description, URL. Built-in resources can be edited, hidden or reset (`resource_overrides`). Mark reviewed (`reviewed_overrides`). Publish a change notice (`pending_change_notices`).
- Calendar: community events with EN/FR title and description, date, start/end times, location and link.
- Link Audit: "Sync current resources to backend" writes `resources_master`. Results are read from `link_audits` (can be dismissed) and `error_reports` (can be deleted). The monthly checker (a Cloud Function) has NO code in this repo, and the "developer note" the tab points to is no longer in the source. It is unfinished.
- Messages: searchable list of `contact_submissions`, can be deleted. Formspree still does the email delivery.
- Ask CJHQ: admin-only test mode (`ASK_CJHQ_PUBLIC = false`). Chat, new/clear/copy, show/hide sources, a Language Review bench (EN/FR/HE/YI, session only) and Knowledge Sources (`ask_sources` CRUD). Uses Firebase AI + App Check, loaded lazily.
- Publishing: section visibility (currently the `yomim-tovim-travel` Special Information section) with published/hidden, schedule dates, preview-as-admin and edit. Each change is recorded (`changedAt`, `changedBy` in `settings/site`). This is the only audit record that exists today.
- Staff Access: list (built-in + `staff` collection), add by email, remove (built-ins can't be removed here).

## Browser dialogs in admin code (to replace with in-app UI)
32 alert(), 15 confirm(), 4 prompt() in tools/admin-app.js. The public site's own 5 alert() calls are outside admin scope and are left alone.

## Things the rebuild must not change without approval
- Any collection or field name, and the public read paths above.
- The `noindex` on admin-created pages and their absence from the sitemap. Making them indexable is an SEO/public-behaviour decision.
- Page Content going live right away. A draft step changes how it works and needs a schema addition.
- Firestore rules, roles, Storage (uploads) and the Link Audit Cloud Function all need Firebase console access. None of that is in the repo.
