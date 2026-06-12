package uk.brooksweb.app;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * BOR-55: minimal bridge so the WebView can open THIS app's system settings
 * screen — used by the "Record Audio" denial recovery UI to give the user a
 * one-tap path to re-enable the microphone after they've denied it (Android
 * won't re-prompt once denied, so deep-linking to App Info is the only path).
 *
 * Intentionally tiny and dependency-free (no community settings plugin). JS
 * calls it via registerPlugin('AppSettings') in src/lib/capacitor.ts.
 */
@CapacitorPlugin(name = "AppSettings")
public class AppSettingsPlugin extends Plugin {

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings", e);
        }
    }
}
