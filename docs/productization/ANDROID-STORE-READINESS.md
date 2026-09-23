# Tarkana Android Production Path & Store Readiness Guide

> Milestone P1.7: Release Build Hardening, Play Signing Architecture, App Links Verification, and Store Compliance

---

## 1. Versioning Strategy

Tarkana Android strictly follows a two-part versioning policy:

* **`versionCode`** (integer): Strictly monotonic sequential integer. Must be incremented with **every** build intended for Google Play upload.
  * Internal / Milestone P1.7: `versionCode = 4`
* **`versionName`** (string): Semantic version `MAJOR.MINOR.PATCH` matching the Tarkana release cycle.
  * Milestone P1.7: `versionName = "0.1.0"`
* **Release Tag Convention**: Release tags strictly use the `android-v*` prefix (e.g. `android-v0.1.0`), which triggers the automated signed AAB bundle release workflow in GitHub Actions.

---

## 2. Google Play Signing Architecture

Google Play uses a dual-key architecture for app distribution:

```
[ Developer / CI ]                          [ Google Play ]                              [ End Users ]
       │                                           │                                           │
  Upload Key ──(Signs AAB with Upload Keystore)──> │                                           │
                                                   │ ──(Verifies Upload Signature)             │
                                                   │ ──(Re-signs APK with App Signing Key)──>  │ (Installs APK)
                                                   │                                           │
```

### Critical App Links Caveat:
When Google Play App Signing is enabled, Google strips the developer's upload signature and re-signs the APK delivered to user devices with the **Google Play App Signing Certificate**.

Therefore:
* **The SHA-256 fingerprint in `.well-known/assetlinks.json` MUST be the Google Play App Signing Certificate fingerprint**, NOT the local upload keystore fingerprint.
* If the upload key fingerprint is used in `assetlinks.json`, App Links verification will succeed on local sideloaded debug/release builds, but will **fail for 100% of users who install from Google Play**.
* **Do not commit placeholder or debug fingerprints into production `static/.well-known/assetlinks.json`**. Only publish `assetlinks.json` after generating the Google Play App Signing key in the Play Console.

---

## 3. Digital Asset Links (`assetlinks.json`) Setup

When the app is uploaded to Google Play Internal Testing, retrieve the Play App Signing SHA-256 fingerprint:

1. Open **Google Play Console** -> **Tarkana** -> **Release** -> **Setup** -> **App integrity**.
2. Under **App signing key certificate**, copy the **SHA-256 certificate fingerprint** (format: `14:6D:E8:...` or `AA:BB:...`).
3. In the `tarkana` web repository, create or update `static/.well-known/assetlinks.json` based on `static/.well-known/assetlinks.template.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.kaisabiyyistudio.tarkana_android",
      "sha256_cert_fingerprints": [
        "PASTE_GOOGLE_PLAY_APP_SIGNING_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

4. Deploy the web application to production.
5. Verify public accessibility:
   ```bash
   curl -s -i https://tarkana.vercel.app/.well-known/assetlinks.json
   ```
   Ensure `Content-Type: application/json` and HTTP 200 OK.
6. Verify domain verification status on a connected device:
   ```bash
   adb shell pm get-app-links com.kaisabiyyistudio.tarkana_android
   ```

---

## 4. Deep Linking & Safe Web Fallback Contract

* **Native Scope**: Native challenge engines currently support single-player Standard mode.
* **App Links Routing**: Incoming links matching `https://${appLinksHost}/share/*` and `https://${appLinksHost}/duel/*` are intercepted by `DeepLinkRouterActivity`.
* **Safe Fallback**: Rather than providing a partial or degraded native experience, `DeepLinkRouterActivity` launches an **Android Custom Tab** pointing directly to the canonical web application URL. If Custom Tabs is unavailable, it gracefully opens the system default browser.
* **Domain Configuration**: The Manifest uses `${appLinksHost}` with a default of `tarkana.vercel.app`, configurable via `appLinksHost` in `local.properties` or environment variable `TARKANA_APP_LINKS_HOST`.

---

## 5. Google Play Data Safety Declarations

Tarkana Android is designed with privacy-first principles:

| Data Type | Collected? | Shared? | Purpose / Handling |
| :--- | :--- | :--- | :--- |
| **Personal Info (Name, Email)** | Optional | No | Account authentication only; stored via encrypted session token. |
| **Identifiers (User ID)** | Yes | No | App functionality (rank, challenge results). |
| **Financial / Payment Info** | No | No | No in-app purchases or payments collected. |
| **Location** | No | No | Never requested or accessed. |
| **Crash Logs & Diagnostics** | Locally only | No | Redacted/sanitized crash reports stored in app-private storage (`crash_reports/`), capped at 5 files. Zero third-party crash SDK trackers. |
| **Security Practices** | | | All network traffic over HTTPS/TLS; session tokens stored in `EncryptedSharedPreferences` backed by Android Keystore. |

---

## 6. Pre-Launch Internal Testing Checklist

Before promoting to Closed/Open Testing on Google Play:

- [ ] Release AAB built via CI with `bundleRelease`.
- [ ] R8 minification enabled (`isMinifyEnabled = true`, `isShrinkResources = true`).
- [ ] Release build signed with upload key (never debug key).
- [ ] `mapping.txt` preserved and uploaded to Google Play Console for stack trace deobfuscation.
- [ ] Google Play App Signing enabled in Play Console.
- [ ] Production `.well-known/assetlinks.json` published on web domain with the Play App Signing SHA-256.
- [ ] App Links verified with `adb shell pm get-app-links com.kaisabiyyistudio.tarkana_android`.
- [ ] Privacy Policy URL accessible and compliant.
- [ ] Authentication preferences and crash reports excluded from Auto Backup (`backup_rules.xml` & `data_extraction_rules.xml`).
- [ ] Store listing assets uploaded (Icon 512x512, Feature Graphic 1024x500, phone screenshots).
- [ ] Tested on Android 7.0 (API 24) minimum up to Android 15/16 (API 35/36).
