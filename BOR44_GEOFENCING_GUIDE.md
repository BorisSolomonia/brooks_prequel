# BOR-44 — Proximity Geofencing: complete native implementation + step-by-step

This is the **Phase B/C** guide. Phase A (the backend endpoint + JS bridge) is already in the code.
Follow this top to bottom. **Every code block tells you the exact file path.** Android is fully
covered (the `android/` project is in the repo); iOS is fully covered too (do it on a Mac once the
`ios/` project exists).

> **Honesty up front:** I wrote this code carefully but I could **not run a native build or a device
> test** in my environment. Native geofencing always needs on-device testing — do the **Testing**
> section before you trust it. This is a complete, correct-by-design starting point, not a
> magically-verified binary.

---

## How it works (read this once)

The app is a Capacitor shell that loads the website (`brooksweb.uk`) in a WebView. **When the app is
killed, your JavaScript is not running.** So the notification when the user walks up to a memory
**must be created by native code**, not JS. The design:

1. **JS (already done):** when the app is open, it calls `GET /api/me/memories/geofences`, gets the
   list of memories shared with the user (id, lat/lng, radius, sharer name), and hands them to the
   native `Geofence` plugin via `setGeofences(...)`.
2. **Native plugin:** registers those circles with the **OS geofencing service** (Android
   `GeofencingClient`, iOS `CLLocationManager` region monitoring). The OS now watches them with
   almost no battery — it wakes our app only when the user crosses a boundary.
3. **Native receiver:** when the OS reports "entered region X", a **native** receiver builds and posts
   the local notification **"You are near a memory shared by [name]!"** — even if the app is killed.
   (We saved each region's notification text to device storage in step 2 so the receiver knows the
   name.)
4. **Tap → deep link:** tapping the notification opens the app to `…/maps?memory=<id>` using the App
   Link that's already configured, so the right memory shows.

---

## Part 0 — What's already in the repo (no action needed)

- `web/src/lib/geofence-plugin.ts` — the TypeScript interface to the native `Geofence` plugin.
- `web/src/lib/geofences.ts` — `syncMemoryGeofences(token)` fetches the list and calls
  `Geofence.setGeofences(...)` (safely no-ops until the native code below exists).
- Backend `GET /api/me/memories/geofences` — already shipped (Phase A).

You only need to add the **native** code below and **call `syncMemoryGeofences` on app start**
(Part 4).

---

## Part 1 — ANDROID

### 1.1 Add the location-services dependency
**File:** `web/android/app/build.gradle` → inside the existing `dependencies { … }` block, add:
```gradle
    implementation "com.google.android.gms:play-services-location:21.3.0"
```

### 1.2 Add the background-location permission + register the receiver
**File:** `web/android/app/src/main/AndroidManifest.xml`

a) Near the other `<uses-permission>` lines (you already have FINE + COARSE LOCATION and
POST_NOTIFICATIONS), add:
```xml
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

b) Inside `<application> … </application>`, add the receiver:
```xml
        <receiver
            android:name="uk.brooksweb.app.GeofenceBroadcastReceiver"
            android:exported="false" />
```

### 1.3 The native plugin
**Create file:** `web/android/app/src/main/java/uk/brooksweb/app/GeofencePlugin.java`
```java
package uk.brooksweb.app;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Geofence")
public class GeofencePlugin extends Plugin {

    public static final String PREFS = "brooks_geofences";
    private GeofencingClient client;

    private GeofencingClient client() {
        if (client == null) client = LocationServices.getGeofencingClient(getContext());
        return client;
    }

    private PendingIntent transitionIntent() {
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_MUTABLE;
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }

    @PluginMethod
    public void setGeofences(PluginCall call) {
        JSONArray regions = call.getArray("regions") != null ? call.getArray("regions").toJSONArray() : new JSONArray();
        // Persist id -> notification text so the receiver can post it even if the app is killed.
        SharedPreferences.Editor prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear();
        List<Geofence> fences = new ArrayList<>();
        try {
            for (int i = 0; i < regions.length(); i++) {
                JSONObject r = regions.getJSONObject(i);
                String id = r.getString("identifier");
                fences.add(new Geofence.Builder()
                        .setRequestId(id)
                        .setCircularRegion(r.getDouble("latitude"), r.getDouble("longitude"), (float) r.getDouble("radius"))
                        .setExpirationDuration(Geofence.NEVER_EXPIRE)
                        .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
                        .build());
                JSONObject meta = new JSONObject();
                meta.put("title", r.optString("notificationTitle", "Brooks"));
                meta.put("body", r.optString("notificationBody", "You are near a shared memory!"));
                prefs.putString(id, meta.toString());
            }
        } catch (Exception e) {
            call.reject("Bad region payload: " + e.getMessage());
            return;
        }
        prefs.apply();

        // Replace the whole set: remove the old PendingIntent's fences, then add.
        client().removeGeofences(transitionIntent());
        if (fences.isEmpty()) { call.resolve(); return; }

        GeofencingRequest req = new GeofencingRequest.Builder()
                .setInitialTrigger(0) // do NOT fire just because we're already inside on register
                .addGeofences(fences)
                .build();
        try {
            client().addGeofences(req, transitionIntent())
                    .addOnSuccessListener(x -> call.resolve())
                    .addOnFailureListener(e -> call.reject("addGeofences failed: " + e.getMessage()));
        } catch (SecurityException se) {
            call.reject("Location permission not granted");
        }
    }

    @PluginMethod
    public void clearGeofences(PluginCall call) {
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        client().removeGeofences(transitionIntent())
                .addOnSuccessListener(x -> call.resolve())
                .addOnFailureListener(e -> call.resolve());
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject r = new JSObject();
        r.put("location", hasPerm(Manifest.permission.ACCESS_FINE_LOCATION) ? "granted" : "denied");
        r.put("background", Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                || hasPerm(Manifest.permission.ACCESS_BACKGROUND_LOCATION) ? "granted" : "denied");
        call.resolve(r);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        // Capacitor's permission flow is easiest from JS via @capacitor/geolocation for fine
        // location; background must be requested separately and is best deep-linked to Settings.
        // Here we just report current state; see the guide's Permission UX section.
        checkPermissions(call);
    }

    private boolean hasPerm(String p) {
        return getContext().checkSelfPermission(p) == android.content.pm.PackageManager.PERMISSION_GRANTED;
    }
}
```

### 1.4 The native receiver (posts the notification — works when killed)
**Create file:** `web/android/app/src/main/java/uk/brooksweb/app/GeofenceBroadcastReceiver.java`
```java
package uk.brooksweb.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingEvent;

import org.json.JSONObject;

import java.util.List;

public class GeofenceBroadcastReceiver extends BroadcastReceiver {

    private static final String CHANNEL = "brooks_proximity";

    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent event = GeofencingEvent.fromIntent(intent);
        if (event == null || event.hasError()) return;
        if (event.getGeofenceTransition() != Geofence.GEOFENCE_TRANSITION_ENTER) return;

        List<Geofence> triggered = event.getTriggeringGeofences();
        if (triggered == null) return;

        SharedPreferences prefs = context.getSharedPreferences(GeofencePlugin.PREFS, Context.MODE_PRIVATE);
        ensureChannel(context);
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        for (Geofence g : triggered) {
            String id = g.getRequestId();
            String title = "Brooks";
            String body = "You are near a shared memory!";
            try {
                String raw = prefs.getString(id, null);
                if (raw != null) {
                    JSONObject meta = new JSONObject(raw);
                    title = meta.optString("title", title);
                    body = meta.optString("body", body);
                }
            } catch (Exception ignored) {}

            // Tap → open the memory via the existing App Link (manifest already claims brooksweb.uk/*).
            Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse("https://brooksweb.uk/maps?memory=" + id));
            open.setPackage(context.getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags |= PendingIntent.FLAG_IMMUTABLE;
            PendingIntent pi = PendingIntent.getActivity(context, id.hashCode(), open, flags);

            NotificationCompat.Builder n = new NotificationCompat.Builder(context, CHANNEL)
                    .setSmallIcon(android.R.drawable.ic_dialog_map)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pi);
            nm.notify(id.hashCode(), n.build());
        }
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm.getNotificationChannel(CHANNEL) == null) {
                nm.createNotificationChannel(new NotificationChannel(
                        CHANNEL, "Nearby memories", NotificationManager.IMPORTANCE_HIGH));
            }
        }
    }
}
```

### 1.5 Register the plugin
**File:** `web/android/app/src/main/java/uk/brooksweb/app/MainActivity.java` — register the plugin
**before** `super.onCreate`:
```java
import android.os.Bundle;
// …
@Override
public void onCreate(Bundle savedInstanceState) {
    registerPlugin(GeofencePlugin.class);
    super.onCreate(savedInstanceState);
}
```
(If `MainActivity` is currently empty, add the whole `onCreate` method; keep any existing body.)

---

## Part 2 — iOS (do on a Mac, once `ios/` exists: run `npx cap add ios` in `web/`)

### 2.1 Info.plist keys
**File:** `web/ios/App/App/Info.plist` — add:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Brooks uses your location to show nearby memories on the map.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Brooks notifies you when you're near a memory a friend shared with you, even in the background.</string>
<key>UIBackgroundModes</key>
<array><string>location</string></array>
```

### 2.2 The native plugin
**Create file:** `web/ios/App/App/GeofencePlugin.swift`
```swift
import Foundation
import Capacitor
import CoreLocation
import UserNotifications

@objc(GeofencePlugin)
public class GeofencePlugin: CAPPlugin, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    public override func load() {
        manager.delegate = self
        manager.allowsBackgroundLocationUpdates = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    @objc func setGeofences(_ call: CAPPluginCall) {
        // Clear existing monitored regions first.
        for region in manager.monitoredRegions { manager.stopMonitoring(for: region) }
        let defaults = UserDefaults.standard
        let regions = call.getArray("regions", [String: Any].self) ?? []
        for r in regions.prefix(20) { // iOS caps at 20 regions
            guard let id = r["identifier"] as? String,
                  let lat = r["latitude"] as? Double,
                  let lng = r["longitude"] as? Double,
                  let radius = r["radius"] as? Double else { continue }
            let region = CLCircularRegion(center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                          radius: radius, identifier: id)
            region.notifyOnEntry = true
            region.notifyOnExit = false
            defaults.set(["title": r["notificationTitle"] ?? "Brooks",
                          "body": r["notificationBody"] ?? "You are near a shared memory!"], forKey: "geofence_\(id)")
            manager.startMonitoring(for: region)
        }
        call.resolve()
    }

    @objc func clearGeofences(_ call: CAPPluginCall) {
        for region in manager.monitoredRegions { manager.stopMonitoring(for: region) }
        call.resolve()
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        manager.requestAlwaysAuthorization()
        call.resolve(["location": "prompt", "background": "prompt"])
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        let s = manager.authorizationStatus
        let granted = (s == .authorizedAlways || s == .authorizedWhenInUse)
        call.resolve(["location": granted ? "granted" : "denied",
                      "background": s == .authorizedAlways ? "granted" : "denied"])
    }

    public func locationManager(_ m: CLLocationManager, didEnterRegion region: CLRegion) {
        let meta = UserDefaults.standard.dictionary(forKey: "geofence_\(region.identifier)")
        let content = UNMutableNotificationContent()
        content.title = (meta?["title"] as? String) ?? "Brooks"
        content.body = (meta?["body"] as? String) ?? "You are near a shared memory!"
        content.sound = .default
        content.userInfo = ["memoryId": region.identifier]
        let req = UNNotificationRequest(identifier: region.identifier, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }
}
```

### 2.3 Register the plugin (Objective-C bridge)
**Create file:** `web/ios/App/App/GeofencePlugin.m`
```objc
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(GeofencePlugin, "Geofence",
  CAP_PLUGIN_METHOD(setGeofences, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(clearGeofences, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(requestPermissions, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(checkPermissions, CAPPluginReturnPromise);
)
```

### 2.4 Notification tap → open the memory
**File:** `web/ios/App/App/AppDelegate.swift` — add a notification handler that navigates the WebView:
```swift
import UserNotifications
// In application(_:didFinishLaunchingWithOptions:) add:
//   UNUserNotificationCenter.current().delegate = self
// Then:
extension AppDelegate: UNUserNotificationCenterDelegate {
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
    if let id = response.notification.request.content.userInfo["memoryId"] as? String,
       let url = URL(string: "https://brooksweb.uk/maps?memory=\(id)") {
      NotificationCenter.default.post(name: Notification.Name.capacitorOpenURL,
                                      object: nil, userInfo: ["url": url])
    }
    completionHandler()
  }
}
```

---

## Part 3 — Call the sync on app start

Add a tiny hook so the app registers geofences whenever it has a token (and on resume).
**Create file:** `web/src/hooks/useGeofenceSync.ts`
```ts
'use client';
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isNative } from '@/lib/capacitor';
import { syncMemoryGeofences } from '@/lib/geofences';

export function useGeofenceSync(token: string | null) {
  useEffect(() => {
    if (!isNative() || !token) return;
    void syncMemoryGeofences(token);
    const sub = App.addListener('resume', () => { void syncMemoryGeofences(token); });
    return () => { void sub.then((s) => s.remove()); };
  }, [token]);
}
```
Then call `useGeofenceSync(token)` somewhere that always mounts when signed in — e.g. in
`web/src/components/maps/MapsExperience.tsx` next to the existing `useProximityNotifier`, or in the
app shell. It safely no-ops on web.

---

## Part 4 — EXACT build & test steps (Android first — fully doable now)

1. Open a terminal in `web/`:
   ```bash
   npm install
   npx cap sync android
   ```
2. Open the Android project:
   ```bash
   npx cap open android
   ```
   (or open `web/android` in Android Studio.)
3. Let Gradle sync. Fix any red imports (Android Studio will offer the import).
4. Plug in a real Android phone (geofencing barely works on emulators) with **Developer Mode + USB
   debugging** on. Press **Run ▶**.
5. In the app, open **/maps** once and **grant location "While using"**, then go to Android
   **Settings → Apps → Brooks → Permissions → Location → Allow all the time** (background). The OS
   requires the user to pick "Allow all the time" manually — your in-app prompt should explain why and
   send them there (see Permission UX below).
6. **Create a memory and share it with a second test account.** Sign in as the recipient on the phone.
7. **Simulate arriving at the memory's location:**
   - Android Studio → **⋮ (Extended controls) → Location** → set the lat/lng of the memory and click
     **Send** (on emulator), **or** physically walk to the spot, **or** use a mock-location app.
   - You should get the notification **"You are near a memory shared by [name]!"** within ~1–2 min
     (the OS batches geofence checks). Kill the app and repeat — it should still fire.
8. **Tap the notification** → the app opens to that memory on the map.

### Testing iOS (on a Mac)
- `npx cap add ios && npx cap sync ios && npx cap open ios`, add the files from Part 2, set a real
  device or use **Simulator → Features → Location → Custom Location** to jump to the memory's
  coordinates. Background geofencing is most reliable on a real device.

---

## Part 5 — Permission UX (don't skip — Apple/Google reject cold background requests)

- Ask **"While using the app"** first (the /maps page already does for the map).
- Only **after** that, show a short screen: *"Allow location all the time so Brooks can tell you when
  you're near a memory a friend left for you."* → button opens system settings (Android:
  `ACCESS_BACKGROUND_LOCATION` lives under Settings; iOS: `requestAlwaysAuthorization`).
- Never request background location on first launch with no context.

## Part 6 — Store submission (required for release)

- **Google Play:** declare **background location** in Play Console → App content → "Location
  permissions"; you must submit a short **screen-recording** showing the feature + a prominent
  in-app disclosure. Without this, the release is rejected.
- **Apple:** the `Always` usage string (Part 2.1) + be ready to justify background location in App
  Review notes ("notify users near memories shared with them").

## Part 7 — Gotchas / honesty

- iOS monitors **max 20** regions; the JS already caps to the nearest 20. If a user has >20 shared
  memories, re-sync on movement to keep the closest 20 (future enhancement).
- Geofence triggers are **not instant** — the OS may take 1–2 minutes and a minimum radius (~100 m is
  good; iOS ignores very small radii).
- I could not run this; **the Testing section is mandatory.** If a notification doesn't fire: confirm
  background location is "Allow all the time", the radius ≥ 100 m, and Google Play Services is present
  on the test device.
