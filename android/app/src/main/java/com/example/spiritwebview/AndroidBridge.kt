package com.example.spiritwebview

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import java.lang.ref.WeakReference

class AndroidBridge(activity: BrowserActivity) {
    private val activityRef = WeakReference(activity)
    private val TAG = "AndroidBridge"

    @JavascriptInterface
    fun navigate(payloadJson: String) {
        Log.d(TAG, "navigate: $payloadJson")
        activityRef.get()?.navigate(payloadJson ?: "")
    }

    @JavascriptInterface
    fun injectLayers(payloadJson: String) {
        Log.d(TAG, "injectLayers")
        activityRef.get()?.injectLayers(payloadJson ?: "")
    }

    @JavascriptInterface
    fun goBack(payloadJson: String) {
        Log.d(TAG, "goBack")
        activityRef.get()?.goBack(payloadJson ?: "")
    }

    @JavascriptInterface
    fun reload(payloadJson: String) {
        Log.d(TAG, "reload")
        activityRef.get()?.reload(payloadJson ?: "")
    }

    @JavascriptInterface
    fun toggleSplit(payloadJson: String) {
        Log.d(TAG, "toggleSplit")
        activityRef.get()?.toggleSplit(payloadJson ?: "")
    }

    @JavascriptInterface
    fun setFallback(payloadJson: String) {
        Log.d(TAG, "setFallback")
        activityRef.get()?.setFallback(payloadJson ?: "")
    }
}

