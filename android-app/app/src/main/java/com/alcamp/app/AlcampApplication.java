package com.alcamp.app;

import android.app.Application;
import com.onesignal.OneSignal;
import com.onesignal.debug.LogLevel;

public class AlcampApplication extends Application {
    private static final String ONESIGNAL_APP_ID = "1493a9a5-ef28-49d5-a52b-1d0ef46c227f";

    @Override
    public void onCreate() {
        super.onCreate();
        OneSignal.getDebug().setLogLevel(LogLevel.VERBOSE);
        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
    }
}
