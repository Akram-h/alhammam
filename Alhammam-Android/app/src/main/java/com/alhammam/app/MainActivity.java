package com.alhammam.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import android.util.Base64;

public class MainActivity extends Activity {
    private static final int REQ_OPEN = 4101;
    private static final int REQ_SAVE = 4102;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingBytes;
    private String pendingMime = "application/octet-stream";
    private String pendingName = "alhammam-file";
    private WebViewAssetLoader assetLoader;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(android.graphics.Color.rgb(11,27,58));
        getWindow().setNavigationBarColor(android.graphics.Color.rgb(11,27,58));
        webView = new WebView(this);
        setContentView(webView);
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                String[] accepted = params.getAcceptTypes();
                String mime = (accepted != null && accepted.length > 0 && accepted[0] != null && !accepted[0].isEmpty()) ? accepted[0] : "*/*";
                if (mime.contains(",")) mime = mime.substring(0, mime.indexOf(','));
                if (mime.contains(";")) mime = mime.substring(0, mime.indexOf(';'));
                intent.setType(mime);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                try { startActivityForResult(intent, REQ_OPEN); return true; }
                catch (ActivityNotFoundException e) { fileCallback = null; return false; }
            }
        });
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    private class AndroidBridge {
        @JavascriptInterface public void saveFile(String name, String mime, String base64) {
            runOnUiThread(() -> {
                try {
                    pendingName = (name == null || name.trim().isEmpty()) ? "alhammam-file" : name;
                    pendingMime = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                    pendingBytes = Base64.decode(base64, Base64.DEFAULT);
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(pendingMime);
                    intent.putExtra(Intent.EXTRA_TITLE, pendingName);
                    startActivityForResult(intent, REQ_SAVE);
                } catch (Exception e) { Toast.makeText(MainActivity.this, "تعذّر تجهيز الملف", Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void printPage() {
            runOnUiThread(() -> {
                try {
                    PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                    manager.print("الهمام", webView.createPrintDocumentAdapter("الهمام"), new PrintAttributes.Builder().build());
                } catch (Exception e) { Toast.makeText(MainActivity.this, "تعذرت الطباعة على هذا الجهاز", Toast.LENGTH_LONG).show(); }
            });
        }
        @JavascriptInterface public void toast(String message) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show());
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_OPEN) {
            Uri[] result = null;
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) result = new Uri[]{data.getData()};
            if (fileCallback != null) fileCallback.onReceiveValue(result);
            fileCallback = null;
        } else if (requestCode == REQ_SAVE) {
            if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null && pendingBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    out.write(pendingBytes); out.flush();
                    Toast.makeText(this, "تم حفظ الملف", Toast.LENGTH_LONG).show();
                } catch (Exception e) { Toast.makeText(this, "فشل حفظ الملف", Toast.LENGTH_LONG).show(); }
            }
            pendingBytes = null;
        }
    }

    @Override protected void onDestroy() {
        if (webView != null) { webView.removeJavascriptInterface("AndroidBridge"); webView.destroy(); }
        super.onDestroy();
    }
}
