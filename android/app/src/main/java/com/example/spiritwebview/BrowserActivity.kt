package com.example.spiritwebview

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.example.spiritwebview.databinding.ActivityBrowserBinding
import java.lang.ref.WeakReference

@SuppressLint("SetJavaScriptEnabled")
class BrowserActivity : AppCompatActivity() {
    private lateinit var binding: ActivityBrowserBinding
    private lateinit var webViewA: WebView
    private lateinit var webViewB: WebView
    private var activeTab = 1
    private var isSplit = false
    private var verticalSplit = false

    companion object {
        private const val TAG = "BrowserActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBrowserBinding.inflate(layoutInflater)
        setContentView(binding.root)

        webViewA = binding.webContainerA.findViewById(R.id.webview_a)
        webViewB = binding.webContainerB.findViewById(R.id.webview_b)

        setupWebView(webViewA)
        setupWebView(webViewB)

        // Attach JS bridge
        val bridge = AndroidBridge(this)
        webViewA.addJavascriptInterface(bridge, "Android")
        webViewB.addJavascriptInterface(bridge, "Android")

        // Set custom client (handles CSP stripping)
        webViewA.webViewClient = CustomWebViewClient(this)
        webViewB.webViewClient = CustomWebViewClient(this)

        // Initial single view
        showSingle()

        // Example initial load (or read from intent)
        val initial = intent?.getStringExtra("initialUrl") ?: "https://www.google.com"
        webViewA.loadUrl(initial)

        // Setup splitter touch handling
        setupSplitter()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(w: WebView) {
        val s: WebSettings = w.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.allowFileAccess = false
        s.allowContentAccess = false
        s.userAgentString = s.userAgentString + " SpiritWebView/1.0"
    }

    private fun setupSplitter() {
        val handle = binding.splitHandle
        var start = 0f
        handle.setOnTouchListener { v, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    start = if (verticalSplit) ev.x else ev.y
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val delta = if (verticalSplit) ev.x - start else ev.y - start
                    adjustWeights(delta)
                    start = if (verticalSplit) ev.x else ev.y
                    true
                }
                else -> false
            }
        }
    }

    private fun adjustWeights(delta: Float) {
        // Adjust weights based on drag delta. Simple approach: change layout weights proportionally.
        val lpA = binding.webContainerA.layoutParams as LinearLayoutCompat.LayoutParams
        val lpB = binding.webContainerB.layoutParams as LinearLayoutCompat.LayoutParams
        val parentSize = if (verticalSplit) binding.webRoot.width else binding.webRoot.height
        if (parentSize <= 0) return

        val change = delta.toFloat() / parentSize.toFloat()
        val total = lpA.weight + lpB.weight
        lpA.weight = (lpA.weight + change).coerceIn(0.1f, total - 0.1f)
        lpB.weight = total - lpA.weight
        binding.webContainerA.layoutParams = lpA
        binding.webContainerB.layoutParams = lpB
    }

    // Public API called by AndroidBridge
    fun navigate(payloadJson: String) {
        try {
            val obj = org.json.JSONObject(payloadJson)
            val url = obj.optString("url")
            val tab = obj.optInt("tab", activeTab)
            runOnUiThread { getWebViewForTab(tab).loadUrl(url) }
        } catch (e: Exception) { Log.w(TAG, "navigate parsing error: $e") }
    }

    fun injectLayers(payloadJson: String) {
        try {
            val obj = org.json.JSONObject(payloadJson)
            val layers = obj.optJSONArray("layers") ?: return
            val js = buildInjectionScript(layers)
            runOnUiThread { getWebViewForTab(activeTab).evaluateJavascript(js, null) }
        } catch (e: Exception) { Log.w(TAG, "injectLayers error: $e") }
    }

    private fun buildInjectionScript(layers: org.json.JSONArray): String {
        // Build JS that injects CSS and JS into the page safely
        val sb = StringBuilder()
        sb.append("(function(){\n")
        for (i in 0 until layers.length()) {
            val l = layers.getJSONObject(i)
            val type = l.optString("type")
            val content = l.optString("content").replace("\\", "\\\\").replace("\"", "\\\"")
            val id = l.optString("id")
            val isVisible = l.optBoolean("isVisible", true)
            if (!isVisible) continue
            if (type == "css") {
                sb.append("var s = document.createElement('style'); s.setAttribute('data-layer-id', '\"$id\"'); s.innerHTML = \"$content\"; document.head.appendChild(s);\n")
            } else {
                // js or bookmarklet
                sb.append("try{var sc = document.createElement('script'); sc.setAttribute('data-layer-id', '\"$id\"'); sc.innerHTML = \"$content\"; document.body.appendChild(sc);}catch(e){}\n")
            }
        }
        sb.append("})();")
        return sb.toString()
    }

    fun goBack(payloadJson: String) {
        runOnUiThread { getWebViewForTab(activeTab).goBack() }
    }

    fun reload(payloadJson: String) {
        runOnUiThread { getWebViewForTab(activeTab).reload() }
    }

    fun toggleSplit(payloadJson: String) {
        try {
            val obj = org.json.JSONObject(payloadJson)
            val wantSplit = obj.optBoolean("isSplit", !isSplit)
            runOnUiThread {
                if (wantSplit) showSplit() else showSingle()
            }
        } catch (e: Exception) { Log.w(TAG, "toggleSplit parse error: $e") }
    }

    fun setFallback(payloadJson: String) {
        try {
            val obj = org.json.JSONObject(payloadJson)
            val fallback = obj.optString("fallbackUrl", "https://goonee.netlify.app")
            val target = obj.optString("targetUrl", "")
            val url = if (target.isNotEmpty()) "$fallback?target=${java.net.URLEncoder.encode(target, "utf-8")}" else fallback
            runOnUiThread { getWebViewForTab(activeTab).loadUrl(url) }
        } catch (e: Exception) { Log.w(TAG, "setFallback parse error: $e") }
    }

    private fun getWebViewForTab(tab: Int): WebView {
        return if (tab == 2 && isSplit) webViewB else webViewA
    }

    private fun showSingle() {
        isSplit = false
        binding.webContainerB.visibility = View.GONE
        binding.splitHandle.visibility = View.GONE
        // containerA occupies full space
        val lpA = binding.webContainerA.layoutParams as LinearLayoutCompat.LayoutParams
        lpA.weight = 1f
        binding.webContainerA.layoutParams = lpA
    }

    private fun showSplit() {
        isSplit = true
        binding.webContainerB.visibility = View.VISIBLE
        binding.splitHandle.visibility = View.VISIBLE
        val lpA = binding.webContainerA.layoutParams as LinearLayoutCompat.LayoutParams
        val lpB = binding.webContainerB.layoutParams as LinearLayoutCompat.LayoutParams
        lpA.weight = 0.5f
        lpB.weight = 0.5f
        binding.webContainerA.layoutParams = lpA
        binding.webContainerB.layoutParams = lpB
    }
}

