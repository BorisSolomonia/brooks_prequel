package uk.brooksweb.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // BOR-55: register the custom AppSettings plugin BEFORE the bridge
        // initialises so the WebView can call AppSettings.openAppSettings()
        // (the microphone-denial recovery path).
        registerPlugin(AppSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
