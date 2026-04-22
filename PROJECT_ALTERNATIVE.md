# Travel Guide Creator Platform — Complete Product Specification (No Forking)

## 1. Product Identity

### 1.1 What the app is
A creator-driven travel guide marketplace and social planning platform where any user can become a creator, publish structured travel guides, and sell them to travelers who want ready-to-use trip plans.

The product combines four ideas in one experience:
- social discovery of trusted travel creators
- structured itinerary planning
- map-based travel execution
- guide commerce

### 1.2 What problem it solves
Travelers usually plan trips by stitching together information from many places:
- Instagram posts and stories
- YouTube travel videos
- Google Maps saved places
- travel blogs
- notes apps
- screenshots
- calendars

That creates these problems:
- too much research time
- too much unstructured information
- difficulty prioritizing places
- difficulty grouping places into realistic days
- difficulty moving plans into a map and calendar
- difficulty trusting generic recommendations

This app solves those problems by letting users buy a single structured guide from a creator they trust and use it immediately.

### 1.3 Core promise
Follow people whose travel taste you trust, buy their travel guides, and instantly use those guides without doing the planning work yourself.

---

## 2. Core Principles

The app must always preserve these principles:
- creator-first discovery
- traveler-first execution
- structure over chaos
- trust over generic listings
- simplicity over unnecessary product complexity
- no forking at all

No guide cloning, forking, merging, or fork-based monetization exists in this product.

---

## 3. User Types and Roles

### 3.1 Guest
A guest is not logged in.

A guest can:
- browse public creator profiles in limited form
- browse guide previews
- search creators, guides, cities, and places
- explore rankings
- explore map regions in limited form

A guest cannot:
- purchase a guide
- follow creators
- create a guide
- review a guide
- save a pinned location
- add to calendar from purchased content

### 3.2 User
Every signed-in user is both a consumer and a potential creator.

A user can:
- follow creators
- create guides
- publish guides
- sell guides
- purchase guides
- save pinned locations and upcoming trips
- review guides they purchased
- use map integration
- use calendar integration
- manage notification preferences

### 3.3 Verified Creator
A verified creator is a normal user whose identity has been approved.

Verification gives:
- trust badge on profile
- ranking boost
- stronger credibility in search and discovery

Verification does not change the basic rights model. Any user can still create and sell even without verification.

### 3.4 Admin
An admin manages the platform.

An admin can:
- manage users
- moderate guides
- approve or reject verification requests
- manage refunds
- manage flagged spam or abusive content
- view system-wide analytics
- manage rankings and featured visibility if needed
- manage categories and moderation policies

### 3.5 AI Moderation Assistant
AI moderation is not a standalone user. It is a support mechanism.

AI can:
- flag spam guides
- flag suspicious reviews
- flag suspicious creator behavior
- flag abusive content
- flag duplicate-looking or low-value content

AI does not replace admin authority. Final decisions are made by human admins.

---

## 4. Product Value by Audience

### 4.1 Value for travelers
Travelers get:
- less planning stress
- less research overload
- a trusted itinerary from a person instead of a generic website
- an execution-ready guide that works with maps and calendar
- a simpler way to organize a trip before traveling

### 4.2 Value for creators
Creators get:
- a way to monetize travel knowledge
- a social audience
- credibility through verification and reviews
- long-term discoverability through rankings and profile presence
- a product format that is more useful than a plain post or video

---

## 5. Main Product Experience

The app is feed-first, but map-supported.

That means the primary experience is:
- discovering creators
- following creators
- seeing new guide stories and guide cards
- opening previews
- purchasing guides

The map is deeply integrated but is not the starting identity of the app.

---

## 6. Onboarding and First-Time User Flow

### 6.1 Sign-up and login methods
Supported authentication includes:
- email and password
- Google login
- simplified social login set through the chosen auth provider

### 6.2 First-time onboarding flow
When a user enters for the first time:
1. user signs up or logs in
2. user creates or confirms profile basics
3. user selects interests
4. user selects region
5. user can optionally add an upcoming trip
6. user can optionally pin a saved location
7. app shows suggested creators to follow

### 6.3 Returning user flow
For returning users, the home experience must prioritize:
- story strip with new guides
- feed from followed creators
- region-relevant suggestions
- map preview based on pinned location first, then current location if no pin exists

---

## 7. Home Screen

### 7.1 Story strip
At the top of the home screen is a story-like strip.

It shows:
- newly published guides
- creator-selected guide promotions
- cover-image based story cards

A creator chooses which guide to promote into story format.

A story card should contain at minimum:
- guide cover image
- guide title
- creator identity

Clicking a story opens the guide preview.

### 7.2 Feed
The feed is the main discovery stream.

The feed shows:
- guides from followed creators
- recommended guides based on interests and region
- high-performing creators and guides in the user’s region

Guide cards in feed must show:
- cover image
- guide title
- creator name
- creator avatar
- verification badge if applicable
- price or free state
- rating
- day count
- place count
- region or destination summary

### 7.3 Home map preview
A compact map preview exists on home.

Its behavior:
1. if user has a pinned location or upcoming trip, show that
2. if not, show current location if available and allowed

The preview should show:
- creator icons in the visible region
- place density or guide activity hints if useful
- quick action to open full map view

---

## 8. Creator Profile

The creator profile should feel socially familiar, close to an Instagram-like personal page, but optimized for travel guides instead of photo posts.

### 8.1 Profile header
The profile header includes:
- avatar
- display name
- username
- bio
- region
- verification badge if verified
- followers count
- following count
- purchases count or sales indicator
- rating

### 8.2 Profile content
Instead of a photo grid, the creator profile shows travel guides.

Profile content can include:
- published guides
- optionally featured guides
- creator reviews summary
- about/description

Each guide card on profile should show:
- guide cover image
- guide title
- price state
- rating
- day count
- place count
- destination summary

---

## 9. Guide as the Core Product Object

A guide is the main thing being sold and used.

A guide is not a loose collection of places. It is a structured travel plan.

### 9.1 Guide hierarchy
The guide hierarchy is:

Guide -> Day -> Block -> Place

### 9.2 Meaning of each level
- Guide: the overall travel product
- Day: one day or section of the trip
- Block: a timed segment inside a day
- Place: a concrete real-world location inside a block

### 9.3 Multi-city support
A guide may cover:
- one city
- multiple cities
- a route across a country
- a named multi-stop trip

Guide naming is flexible and should not force one-city-only logic.

---

## 10. Guide Content Requirements

### 10.1 Guide basics
A guide can start as a lightweight draft, but a published guide should be meaningful.

Only title is mandatory for draft creation.

A published guide should practically require:
- title
- at least one day
- at least one block
- at least one place

### 10.2 Guide metadata
A guide can contain:
- title
- description
- cover image
- primary region
- destination summary
- default categories
- tags
- day count
- place count
- price information
- free/paid state
- story eligibility or promotion selection

### 10.3 Day object
A day represents one unit of the trip.

A day can contain:
- numeric order
- optional label such as Arrival Day or Museum Day
- optional short summary

### 10.4 Block object
A block is a timed segment within a day.

A block can contain:
- title
- start time
- end time
- order within day
- optional notes

Examples:
- Morning walk
- 09:00 to 12:00 museums
- Evening food route

### 10.5 Place object
A place is the atomic travel item.

A place can contain:
- title
- Google place identity or validation reference if available
- location coordinates
- city and country
- description
- time estimate
- priority
- category
- tags
- external links
- YouTube link
- up to 4 images
- validation state

Only place title is mandatory for draft stage, but richer data is strongly encouraged for publish quality.

---

## 11. Guide Types

The app should support several real-world guide shapes:
- single-city day guide
- weekend city itinerary
- multi-day urban guide
- country route guide
- themed guide such as museums, shopping, architecture, food
- upcoming-trip inspired guide

The app should not artificially limit guides to one narrow format.

---

## 12. Guide Preview Before Purchase

This is a strict business rule.

Before purchase, users see only:
- guide title
- number of days
- number of places

The preview must not reveal the itinerary details.

That means it must not reveal:
- full place list
- detailed descriptions
- timing details
- the true route structure
- the hidden value of the plan

The preview page can still show:
- cover image
- creator profile summary
- ratings
- price
- destination summary at a high level

But it must not leak the guide structure itself.

---

## 13. Guide Purchase and Access Model

### 13.1 Purchase unit
A user purchases a full guide, not individual places.

### 13.2 Pricing states
Each guide can be:
- free
- normally paid
- temporarily discounted

Pricing fields conceptually include:
- normal price
- sale price
- free flag

### 13.3 Access rights after purchase
When a user purchases a guide, they receive:
- lifetime access
- access only to that exact guide version

They do not automatically receive future updates.

### 13.4 Deleted guide behavior
If a guide is later deleted from marketplace visibility:
- past purchasers retain access
- new users cannot buy it

---

## 14. Guide Versioning

Versioning is required because purchase grants access to one exact version.

### 14.1 Why versioning matters
Creators may edit their guides over time.
A buyer must keep access to what they paid for.

### 14.2 Buyer rights by version
A purchase is tied to the published version at the time of payment.

That means:
- creator can publish a new version later
- previous buyers still see the old purchased version
- buyers do not automatically get the new version

This prevents confusion and preserves purchase fairness.

---

## 15. Map Experience

Map is a major execution layer.

### 15.1 What the map must do
The map must support:
- place validation
- route planning
- creator presence discovery
- guide place visualization
- quick open in Google Maps

### 15.2 Guide map behavior
For a purchased guide, the map should show:
- the places in the guide
- their route order if useful
- a clean way to inspect location points
- one-click redirection into Google Maps

### 15.3 Home and discovery map behavior
For a general map view, the app should show:
- creator profile icons in the region
- guide density or useful creator availability cues

Clicking a creator icon should allow:
- opening a creator mini-card
- opening creator profile
- filtering creator guides by visible region

### 15.4 Pinned location logic
Pinned places or upcoming trips drive the default map focus.

Map focus order:
1. pinned location or upcoming trip
2. current user location if allowed and available

---

## 16. Calendar Experience

Calendar is part of the app’s core value because it turns inspiration into a usable plan.

### 16.1 One-click calendar action
A purchased guide should have a simple add-to-calendar action.

### 16.2 Creator-defined timing
If creator entered timing for blocks or places, that timing is used when generating calendar items.

### 16.3 Calendar export targets
The app must support:
- Google Calendar
- Apple-compatible calendar export

### 16.4 Calendar behavior rules
If sufficient time data exists:
- create calendar events based on guide structure

If time data is missing:
- either skip event creation for that item
- or use a conservative fallback if designed later

For v1, a clean rule is preferable: only timed items become events.

---

## 17. Search and Discovery

Everything important must be searchable.

### 17.1 Search targets
Search should include:
- creators
- guide titles
- guide descriptions
- tags
- categories
- cities
- countries
- places within guides

### 17.2 Filters
Filters should include:
- region
- category
- tags
- price state
- rating
- creator verification
- day count
- place count if useful

### 17.3 Search intent examples
Users should be able to search for:
- Paris museum guides
- Tbilisi shopping guides
- creators in Batumi
- multi-day Italy route
- free art guides in London

---

## 18. Categories, Tags, and Interests

The app uses three related but distinct concepts.

### 18.1 Default categories
These are structured guide/place groupings managed by product/admin.

Examples:
- museum
- shopping
- landmark
- architecture
- art
- nature
- food
- restaurant
- nightlife
- local experience
- family
- historical

### 18.2 Tags
Tags are more flexible labels.

Examples:
- budget
- romantic
- hidden-gem
- quick-stop
- kids-friendly
- luxury
- sunset
- rainy-day


### 18.3 Interests
Interests are used during onboarding and personalization.

Examples:
- museums
- shopping
- food
- architecture
- local culture
- nature

### 18.4 Relationship between them
- interests personalize recommendations
- categories structure content
- tags provide flexible filtering nuance

---

## 19. Story System

The story system is a promotional layer for creators.

### 19.1 Purpose
It allows a creator to highlight a guide visually at the top of home.

### 19.2 Story content
A story is tied to a guide and should use:
- cover image
- guide identity
- creator identity

### 19.3 What appears in story strip
Only new guide promotions should appear there, based on the current product definition.

### 19.4 Story behavior
Clicking a story should open the guide preview directly.

---

## 20. Rankings

Rankings are important for discovery and credibility.

### 20.1 Ranking scope
Rankings are regional.

Examples:
- top creators in Georgia
- top creators in Tbilisi
- top Paris guide creators

### 20.2 Core score rule
Base score logic includes:
- followers
- purchases, weighted more strongly

Purchase weight counts double compared with followers.

A conceptual formula is:
rank score = followers + (purchases x 2) + bonuses

### 20.3 Bonus factors
Possible bonus factors include:
- verification boost
- review quality signal

### 20.4 Ranking goals
Ranking should reward:
- trust
- actual purchase success
- creator quality

It should not be purely a follower contest.

---

## 21. Reviews and Ratings

### 21.1 Eligibility
Only users who purchased a guide can review it.

### 21.2 Review content
A review includes:
- star rating
- optional written feedback

### 21.3 Review effects
Reviews affect:
- guide reputation
- creator reputation
- search trust
- ranking confidence

### 21.4 Review moderation
Reviews should be monitored for spam and abuse via AI flagging and admin review.

---

## 22. Notifications

Notifications are app-only.

### 22.1 Notification types
Supported notification types include:
- new guide by followed creator
- purchase success
- guide approved if that process exists in future
- refund processed
- new follower
- review received

### 22.2 Notification controls
Users must be able to manage notification preferences per type.

### 22.3 Notification behavior
Notifications should have:
- read/unread state
- deep links to related screens
- clear type grouping

---

## 23. Pinned Places and Upcoming Trips

These are personal planning helpers.

### 23.1 Pinned place
A user can save a place they care about.
This place influences default map behavior.

### 23.2 Upcoming trip
A user can define an upcoming travel target.
This can also influence map focus and discovery relevance.

### 23.3 Priority
If pinned place or upcoming trip exists, use it before current location in the map focus logic.

---

## 24. Commercial Place Rules

The app has a business rule around restaurants and similar commercial places.

### 24.1 Rule
Creators pay to include commercial place categories such as restaurants and similar entities.

### 24.2 Purpose
This exists mainly for:
- quality control
- monetization

### 24.3 Trustworthiness
Google Maps or Google Places validation helps support accuracy and trustworthiness for these listings.

---

## 25. Verification System

### 25.1 What verification means
Verification is identity verification.

### 25.2 Verification flow
The intended flow is:
1. creator requests verification
2. creator uploads required materials
3. AI checks basic consistency or suspicious patterns
4. admin reviews and decides

### 25.3 Verification effect
Verification gives:
- visible badge
- ranking boost
- stronger user trust

Verification does not gate the right to sell.

---

## 26. Moderation System

### 26.1 AI moderation responsibilities
AI should flag:
- spam guides
- abusive or unsafe content
- suspicious review behavior
- suspicious creator patterns
- obvious low-value duplication attempts if relevant

### 26.2 Admin moderation responsibilities
Admins make the final decisions about:
- takedowns
- bans
- verification approval
- refund overrides
- policy enforcement

### 26.3 Deletion behavior
If a guide is deleted:
- it is removed from future marketplace visibility
- past buyers keep access

---

## 27. Refund Policy

### 27.1 Refundable cases
Refunds are allowed only for:
- fraud
- technical/payment issues

### 27.2 Not refundable
Refunds are not granted simply because a user dislikes a guide.

### 27.3 Automation
Automatic refund rules should be strict and conservative, focused on fraud or payment failure states.

---

## 28. Media System

### 28.1 Place image limits
Each place can have up to 4 images.

### 28.2 Media uses
Images are used for:
- guide cover images
- place previews
- story cards
- creator presentation quality

### 28.3 Media quality role
Visual quality strongly affects guide appeal and conversion, even though purchase preview hides structural details.

---

## 29. Offline and Access Behavior

From prior requirements, offline-style utility matters, but with the current no-fork product, the essential principle is that the purchased guide remains usable as a stable product.

The core use expectation after purchase is:
- reliable access to the purchased version
- usable guide details
- map execution support
- calendar execution support

If an offline mode is later formalized more deeply, it should prioritize:
- text content
- place locations
- stable purchased access

---

## 30. Guide Lifecycle

A guide moves through these stages:
1. creator drafts guide
2. creator adds days
3. creator adds timed blocks
4. creator adds places
5. creator sets pricing and metadata
6. creator publishes guide
7. guide appears in feed, profile, search, and map discovery
8. users preview guide
9. users purchase guide
10. users use map and calendar actions
11. users review guide

---

## 31. Critical Non-Negotiable Rules

These rules must not be broken in implementation:

1. No forking exists anywhere in the product.
2. Guide preview before purchase shows only title, day count, and place count.
3. A guide purchase gives lifetime access to the purchased version only.
4. Anyone can become a creator and sell immediately.
5. Verification improves ranking and trust, not sell permission.
6. Ranking is regional.
7. Purchases count more than followers in ranking.
8. Notifications are app-only.
9. Deleted guides remain available to old purchasers.
10. Maps and calendar must be easy, fast, and low-friction to use.
11. Guide structure is Guide -> Day -> Block -> Place.
12. A guide can cover multiple cities.
13. Creator profile behaves like a social profile with guides instead of photo posts.
14. Stories are guide promotions, not generic disappearing chat-style media.
15. Restaurants and similar commercial categories require creator-side paid inclusion logic.

---

## 32. What the App Is Not

To avoid product drift, the app is not:
- a general blog platform
- a plain booking site
- a social network for random travel posts
- a route optimizer only
- a map-only recommendation tool
- a guide cloning platform

It is specifically a creator-driven structured guide marketplace with social discovery and trip execution tools.

---

## 33. Future Features Reserved for Later

The following features belong to future phases, not the current core product:
- audio guides
- GPS-triggered audio playback
- deeper AI itinerary generation
- richer analytics for creators
- iOS app
- more advanced moderation automation
- Kubernetes deployment

---

## 34. Final Product Summary

This app brings together:
- the social familiarity of following creators
- the practical usefulness of maps
- the structure of a travel planner
- the commercial clarity of buying a guide

It replaces scattered trip planning with one guided product.

For travelers, it means less work and more trust.
For creators, it means a better way to turn travel expertise into something valuable and sellable.

The full product must feel like this:
- easy to discover
- easy to trust
- easy to buy
- easy to execute
- easy to return to later

That is the correct build target for this app.
