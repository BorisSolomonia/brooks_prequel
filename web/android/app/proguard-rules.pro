# Brooks ProGuard / R8 rules
#
# Release builds run with `minifyEnabled true` (build.gradle release block).
# Without explicit keep rules, R8 strips/renames classes that Capacitor,
# Auth0, Firebase, and the WebView JS bridge look up reflectively — leading
# to silent runtime failures (plugin not found, push not delivered, OAuth
# callback dead) that ONLY appear in release builds.
#
# Add a new -keep rule whenever you add a plugin that gets called from the
# WebView side via Capacitor's @PluginMethod bridge or any reflective
# lookup. Keep the rule and a 1-line reason for it.

# Capacitor core + plugins
# Capacitor uses reflection to discover @CapacitorPlugin classes and route
# JS calls to @PluginMethod handlers. Everything under com.getcapacitor
# must stay reachable.
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod *;
}

# Cordova plugins bridged through Capacitor's cordova compatibility
-keep class org.apache.cordova.** { *; }

# Auth0 — OAuth deep-link callback path goes through these
-keep class com.auth0.** { *; }

# Firebase / FCM — push notification reception
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keepclassmembers class * extends com.google.firebase.messaging.FirebaseMessagingService {
    *;
}

# WebView JS interface — Capacitor injects window.Capacitor.*
# Without this, @JavascriptInterface methods can be renamed.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep stack traces meaningful for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Don't obfuscate annotations (some libs read them at runtime)
-keepattributes *Annotation*,Signature,Exceptions,InnerClasses,EnclosingMethod
