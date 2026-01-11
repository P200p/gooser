package com.example.gooser

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)

        // --- เพิ่มบรรทัดนี้เพื่อเปิดการ Debug ผ่าน Chrome ---
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.mediaPlaybackRequiresUserGesture = false

        // ช่วยให้รองรับ Responsive หน้าเว็บได้ดีขึ้น
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                try {
                    // ฉีดตัวแปรเพื่อบอกว่าอยู่ใน Android Environment
                    webView.evaluateJavascript("window.isNativeApp = true;", null)
                    webView.evaluateJavascript("window.gooser?.onHostReady && window.gooser.onHostReady();", null)
                } catch (e: java.lang.Exception) {
                    e.printStackTrace()
                }
            }
        }

        // เชื่อมต่อ JavaScript กับ Native
        webView.addJavascriptInterface(HostBridge(webView, this), "Android")

        // โหลดไฟล์ที่ Build จาก React
        webView.loadUrl("file:///android_asset/www/index.html")
    }
}
