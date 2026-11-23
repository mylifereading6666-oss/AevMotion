# AevMotion

**AevMotion** is a mobile-friendly, browser-based video-to-GIF editor by Aev0rnJP.

## Features
- Import a video file or a saved screen recording from your device.
- Select the start and end time using sliders or numeric inputs.
- Adjust FPS, output width, playback speed, palette size and looping.
- Preview and save the resulting GIF.
- Video conversion runs locally in the browser with FFmpeg.wasm. Video files are not uploaded to an AevMotion server.

## Web deployment
1. Open **Settings → Pages** in this repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. The Pages workflow deploys the static app on pushes to `main`.
4. Open the Pages URL shown in the repository settings.

## Android APK

[**Download the latest AevMotion APK**](https://github.com/mylifereading6666-oss/AevMotion/releases/latest/download/app-debug.apk)

The download link above and the download button on the web app start downloading the APK directly from the latest GitHub Release. The first APK is published after the Android workflow is run once; later version-tag builds publish updated APKs to Releases.

1. Open the **Actions** tab.
2. Select **Build Android APK**.
3. Choose **Run workflow** and wait for the build to finish.
4. Open the completed run and download **AevMotion-Android-APK** from Artifacts.

To attach an APK to a GitHub Release, create and push a version tag such as `v1.0.0`. The workflow builds the APK and attaches it to that release.

The generated APK is debug-signed for direct installation/testing. It is not a Google Play production-signed package.

## Performance and privacy notes
- The FFmpeg WebAssembly engine is fetched from jsDelivr the first time it is needed. An internet connection is required to load the app's conversion engine.
- Video processing happens on the device; the selected video is not sent to an AevMotion backend.
- Large videos, long selections, high FPS and large dimensions use more memory and processing time. For mobile devices, start with a short clip, 15 FPS and 480 px.
- Screen recordings are imported as saved video files through the device file picker; AevMotion does not record the screen.
- Browser and Android WebView memory limits vary by device. If conversion fails, try a shorter segment or smaller output size.
- Respect copyright and platform terms when using source videos.

## Technology
HTML, CSS, JavaScript, FFmpeg.wasm, Capacitor, GitHub Pages and GitHub Actions.
