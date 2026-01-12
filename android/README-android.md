# Spirit WebView Android MVP

This folder contains a minimal Android Kotlin implementation (MVP) to host 1-2 WebViews with a draggable splitter and a JavaScript bridge exposed as `window.Android`.

Files added
- `app/src/main/java/com/example/spiritwebview/BrowserActivity.kt`
- `app/src/main/java/com/example/spiritwebview/AndroidBridge.kt`
- `app/src/main/java/com/example/spiritwebview/CustomWebViewClient.kt`
- `app/src/main/res/layout/activity_browser.xml`
- `app/src/main/AndroidManifest.android.xml` (snippet)

Quick setup
1. Open Android Studio and create a new project (Empty Activity) or open your existing Android app.
2. Copy the Kotlin files into `app/src/main/java/<your-package>/` updating the package name at top of each file to match your app's package.
3. Copy `activity_browser.xml` into `app/src/main/res/layout/`.
4. Merge the manifest snippet into your `AndroidManifest.xml` and add `<uses-permission android:name="android.permission.INTERNET"/>`.
5. Enable viewBinding in `app/build.gradle` (module) if you use the included `ActivityBrowserBinding`:

```gradle
android {
    buildFeatures {
        viewBinding true
    }
}
```

6. Minimum SDK: 21+, AndroidX enabled.
7. Build and run on a device/emulator.

How it works
- Frontend will detect `window.Android` and call methods like `Android.navigate(json)`, `Android.injectLayers(json)` etc.
- `CustomWebViewClient` tries to strip `Content-Security-Policy` headers and `<meta http-equiv="Content-Security-Policy">` tags for top-level HTML responses.
- If CSP stripping fails or injection is blocked by site policies, use the fallback helper `https://goonee.netlify.app?target=<original url>` which is expected to accept postMessage or evaluate injected scripts.

Security notes
- Stripping CSP weakens protections; only use for development or on content you control/are authorized to modify.
- Consider restricting the JS bridge to an allowlist of origins before exposing sensitive methods.

Next steps / improvements
- Improve splitter UX with a custom split view or touch smoothing.
- Add allowlist checks in `AndroidBridge` to limit `navigate`/`injectLayers` to trusted origins.
- Persist layers and tab state across activity restarts.

If you want I can:
- Rename package and adapt files to your actual Android app package name.
- Provide a compact Gradle module to import into your project.
- Add allowlist origin checks (recommended).

