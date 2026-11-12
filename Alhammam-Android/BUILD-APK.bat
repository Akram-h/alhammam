@echo off
chcp 65001 >nul
cd /d "%~dp0"
where gradle >nul 2>nul
if errorlevel 1 (
  echo لم يتم العثور على Gradle في PATH.
  echo افتح مجلد هذا المشروع باستخدام Android Studio ثم اختر Build ^> Build APK(s).
  pause
  exit /b 1
)
gradle assembleDebug
if errorlevel 1 (
  echo فشل البناء. افتح المشروع في Android Studio لعرض تفاصيل الخطأ.
  pause
  exit /b 1
)
echo.
echo تم إنشاء APK في:
echo app\build\outputs\apk\debug\app-debug.apk
pause
