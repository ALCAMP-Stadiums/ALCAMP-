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
                String cbResult = "null";
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
                    int code = conn.getResponseCode();
                    java.io.InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is, "UTF-8"));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                    conn.disconnect();
                    cbResult = sb.toString()
                        .replace("\\", "\\\\")
                        .replace("'", "\\'")
                        .replace("\n", "")
                        .replace("\r", "");
                } catch (Exception e) {
                    cbResult = "null";
                }
                final String result = cbResult;
                webView.post(() -> webView.evaluateJavascript(
                    "if(window._osCallback){window._osCallback('" + result + "');window._osCallback=null;}", null));
            }).start();
        }
    }

    private static final String APP_URL = "https://halzwbyta-alt.github.io/ALCAMP-/";
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private WebView webView;
    private android.webkit.ValueCallback<android.net.Uri[]> mFilePathCallback;

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
        settings.setUserAgentString(settings.getUserAgentString() + " AlcampApp/149");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                // App's own URL — handle inside WebView
                if (url.startsWith("https://halzwbyta-alt.github.io")) {
                    return false;
                }
                // All external URLs — open via system Intent (WhatsApp, Facebook, browser, etc.)
                try {
                    android.content.Intent intent = new android.content.Intent(
                        android.content.Intent.ACTION_VIEW,
                        android.net.Uri.parse(url)
                    );
                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    // No app can handle this URL — ignore silently
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView,
                    android.webkit.ValueCallback<android.net.Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;
                android.content.Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (android.content.ActivityNotFoundException e) {
                    mFilePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(APP_URL);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback == null) return;
            android.net.Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
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
