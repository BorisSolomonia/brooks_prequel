# Data Safety form — per-field answers

Play Console → **Policy → App content → Data safety**. Walk the form top to bottom in the order Google presents.

---

## 1. Data collection and security (top of form)

| Question | Answer | Reason |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | Email + photos + location + purchase history are all collected |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | TLS on every endpoint, GCS over HTTPS, iPay hosted checkout uses HTTPS |
| Do you provide a way for users to request that their data be deleted? | **Yes** | In-app `/settings/account/delete` + public `/account/delete` |
| Does your app comply with the Play Families Policy? | **No** | Brooks is not targeted at children under 13 |

---

## 2. Data types — declare each row exactly as shown

For every row: tick **Collected** = Yes, declare **Purpose**, **Shared with third parties** as marked. "Optional" means the user can choose not to provide it.

### Personal info

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Email address** | Yes | No | App functionality, Account management | No | From Auth0 |
| **User IDs** | Yes | No | App functionality, Account management | No | Auth0 `sub` identifier |
| **Name** | Yes | No | App functionality (display name) | Yes | Profile editor |
| **Address** | No | — | — | — | We don't collect |
| **Phone number** | No | — | — | — | We don't collect |
| **Race/ethnicity, sexual orientation, religion, political views** | No | — | — | — | — |
| **Other info** | No | — | — | — | — |

### Financial info

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Purchase history** | Yes | Yes — Bank of Georgia iPay | App functionality, Fraud prevention | No | iPay handles the actual transaction; we receive the order id and amount |
| **Credit card / bank info** | No | — | — | — | iPay hosted checkout — never touches our servers |
| **Payment info** | No | — | — | — | Same |

### Location

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Approximate location** | Yes | Yes — Mapbox | App functionality | Yes | Map rendering; user-grantable runtime permission |
| **Precise location** | Yes | Yes — Mapbox | App functionality | Yes | Centering the map on the user when they tap "locate me" |

> ⚠️ **Mapbox is third-party shared**, not a sub-processor, because their DPA confirms they retain telemetry. If you toggle this to "service provider," reviewers can issue a policy strike. Conservative default = shared.

### Photos and videos

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Photos** | Yes | No | App functionality (guide media) | Yes | Stored in Google Cloud Storage as sub-processor |
| **Videos** | No | — | — | — | We don't accept video uploads |

### Audio files
- All: **No**

### Files and docs
- All: **No**

### Calendar

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Calendar events** | Yes | No | App functionality (trip reminders) | Yes | Google Calendar OAuth — write-only to our dedicated "Brooks Trips" calendar |

### Contacts
- All: **No**

### App activity

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **App interactions** | Yes | No | Analytics, App functionality | No | Server logs of page views |
| **In-app search history** | Yes | No | App functionality, Analytics | No | Search queries on `/search` |
| **Other user-generated content** | Yes | No | App functionality | Yes | Guide content, reviews |
| **Installed apps** | No | — | — | — | We don't query |
| **Other actions** | No | — | — | — | — |

### Web browsing
- All: **No**

### App info and performance

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Crash logs** | Yes | No | Analytics | No | Server-side error logs |
| **Diagnostics** | Yes | No | Analytics | No | Performance metrics |
| **Other app performance data** | No | — | — | — | — |

### Device or other IDs

| Data type | Collected | Shared | Purpose | Optional | Notes |
|---|---|---|---|---|---|
| **Device or other IDs** | Yes | No | Analytics, Fraud prevention | No | Standard Android `application_id` exposed by WebView session; we do **not** collect Android Ad ID |

---

## 3. Security practices

| Question | Answer |
|---|---|
| Data is encrypted in transit | **Yes** — TLS 1.2+ on every endpoint |
| Users can request data deletion | **Yes** — both in-app and at the public URL |
| You follow the Play Families Policy | **N/A** — not a children's app |
| Independent security review | **No** (unless you've actually had one — never lie) |

---

## 4. Final review

After saving every section, Play Console generates a **Data Safety nutrition label**. Crucially, the label should show:

- "Data collected" with: Email, User IDs, Photos, Approximate + Precise location, Calendar events, Purchase history, Name, App interactions, Search history, Crash logs, Diagnostics, Device IDs.
- "Data shared" with: Location (Mapbox), Purchase history (Bank of Georgia iPay).

If the label omits any of those, you've under-declared. If it shows extras (e.g. "Sexual orientation"), you've over-declared.

---

## 5. After submission — what reviewers cross-check

- **Privacy policy** must list every data type declared here. The privacy policy already names Auth0, BOG iPay, GCP, Mapbox, and Google Calendar — keep this consistent if you add a sub-processor later.
- **In-app behaviour** must not collect anything not declared. If you add Sentry / Google Analytics later, you must re-declare.
- **Delete account flow** must work end-to-end. Reviewers test it.
