package com.example.gooser

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

class HostBridge(private val webView: WebView, private val activity: Activity) {

    @JavascriptInterface
    fun postMessage(json: String) {
        // Called from web: window.Android.postMessage(JSON.stringify(payload))
        try {
            val obj = JSONObject(json)
            val type = obj.optString("type")
            if (type == "inject-snippet") {
                val snippet = obj.optJSONObject("snippet")
                val code = snippet?.optString("code") ?: return
                val domain = snippet?.optString("domain")
                // Validate snippet length and basic content
                if (code.length > 200 * 1024) return // too large

                // TODO: perform domain checks / permissions here

                activity.runOnUiThread {
                    webView.evaluateJavascript(code, null)
                }
            } else if (type == "open-webview") {
                val url = obj.optString("url")
                if (url.isNotBlank()) {
                    activity.runOnUiThread {
                        webView.loadUrl(url)
                    }
                }
            }
        } catch (e: Exception) {
            // handle parse error
            e.printStackTrace()
        }
    }
}

