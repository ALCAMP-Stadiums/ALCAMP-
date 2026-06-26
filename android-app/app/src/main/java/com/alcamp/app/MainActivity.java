package com.alcamp.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import android.webkit.JavascriptInterface;
import com.onesignal.Continue;
import com.onesignal.OneSignal;

public class MainActivity extends Activity {

    public class AlcampJSInterface {
        @JavascriptInterface
        public void setUserTags(String phone, String role) {
            OneSignal.getUser().addTag("phone", phone);
            OneSignal.getUser().addTag("role", role);
        }
        @JavascriptInterface
        public void clearUserTags() {
            OneSignal.getUser().removeTag("phone");
            OneSignal.getUser().removeTag("role");
        }
        @JavascriptInterface
        public void sendOsNotif(String jsonPayload, String apiKey) {
            new Thread(() -> {
                try {
                    java.net.URL url = new java.net.URL("https://onesignal.com/api/v1/notifications");
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    conn.setRequestProperty("Authorization", "Basic " + apiKey);
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(15000);
                    byte[] input = jsonPayload.getBytes("UTF-8");
                    conn.getOutputStream().write(input);
                    conn.getOutputStream().close();
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}
            }).start();
        }
    }

    private static final String APP_URL = "https://halzwbyta-alt.github.io/ALCAMP-/";
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Opt user in for push notifications via OneSignal (handles Android 13+ permission dialog)
        OneSignal.getNotifications().requestPermission(false, Continue.none());

        // Full screen, no title bar
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        getWindow().setStatusBarColor(Color.parseColor("#0a0f1a"));
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );

        webView = new WebView(this);
        webView.addJavascriptInterface(new AlcampJSInterface(), "AlcampNative");
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " AlcampApp/148");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("https://halzwbyta-alt.github.io")) {
                    return false;
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
