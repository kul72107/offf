import { View, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useRef, useEffect } from "react";
import {
  useRewardedAd,
  AD_UNIT_IDS,
  initializeAdMob,
  setAdCallback,
} from "@/utils/useAdMob";

export default function WebViewWrapper({ route }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef(null);

  // Initialize AdMob
  useEffect(() => {
    console.log("🎬 [WebViewWrapper] Initializing AdMob...");
    initializeAdMob();
  }, []);

  // Rewarded Ad Hook
  const { isLoaded, isLoading, error, show, reload } = useRewardedAd(
    AD_UNIT_IDS.REWARDED,
  );

  // ✅ Set up ad callback for native → WebView communication
  useEffect(() => {
    console.log("📞 [WebViewWrapper] Setting up ad callback...");

    setAdCallback((event) => {
      console.log("📥 [WebViewWrapper] Ad event from native:", event);

      if (event.type === "adComplete") {
        console.log("✅ [WebViewWrapper] Ad completed! Notifying WebView...");

        // Send message to WebView via injectJavaScript
        webViewRef.current?.injectJavaScript(`
          (function() {
            console.log('📥 [Web] Received adComplete from native');
            if (typeof window.nativeAdComplete === 'function') {
              window.nativeAdComplete(${JSON.stringify(event.reward)});
            }
          })();
          true;
        `);
      } else if (event.type === "adDismissed") {
        console.log("👋 [WebViewWrapper] Ad dismissed! Notifying WebView...");

        // Send message to WebView
        webViewRef.current?.injectJavaScript(`
          (function() {
            console.log('👋 [Web] Ad dismissed by user');
            if (typeof window.nativeAdDismissed === 'function') {
              window.nativeAdDismissed();
            }
          })();
          true;
        `);
      } else if (event.type === "adError") {
        console.log("❌ [WebViewWrapper] Ad error! Notifying WebView...");

        // Send error to WebView
        webViewRef.current?.injectJavaScript(`
          (function() {
            console.log('❌ [Web] Ad error from native');
            if (typeof window.nativeAdError === 'function') {
              window.nativeAdError(${JSON.stringify(event.error)});
            }
          })();
          true;
        `);
      }
    });

    // Cleanup
    return () => {
      console.log("🧹 [WebViewWrapper] Cleaning up ad callback");
      setAdCallback(null);
    };
  }, []);

  console.log("📊 [WebViewWrapper] AdMob State:", {
    isLoaded,
    isLoading,
    error: error ? "YES" : "NO",
  });

  // Web app URL - use the base URL from environment
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || "http://localhost:3000";
  const webUrl = `${baseUrl}${route}`;

  // Banner Ad Test ID (AdMob test banner ID)
  const BANNER_AD_TEST_ID = "ca-app-pub-3940256099942544/6300978111";

  // Standard AdMob banner dimensions
  const BANNER_HEIGHT = 50; // Standard banner height

  // Send message to WebView
  const sendMessageToWeb = (type, data = {}) => {
    const message = JSON.stringify({ type, ...data });
    console.log("📤 [WebViewWrapper] Sending to Web:", message);
    webViewRef.current?.injectJavaScript(`
      window.postMessage(${JSON.stringify(message)}, '*');
      true;
    `);
  };

  // Handle messages from WebView
  const handleMessage = async (event) => {
    const message = event.nativeEvent.data;
    console.log("📥 [WebViewWrapper] Received from Web:", message);

    if (message === "showAd") {
      console.log("🎯 [WebViewWrapper] showAd command received!");

      if (!isLoaded) {
        console.log("⚠️ [WebViewWrapper] Ad not loaded yet...");

        // Notify WebView about error
        webViewRef.current?.injectJavaScript(`
          (function() {
            console.log('⚠️ [Web] Ad not ready yet');
            if (typeof window.nativeAdError === 'function') {
              window.nativeAdError('Ad not loaded yet, please wait...');
            }
          })();
          true;
        `);

        // Try to reload the ad
        if (!isLoading) {
          console.log("🔄 [WebViewWrapper] Attempting to reload ad...");
          reload();
        }
        return;
      }

      try {
        console.log("🎬 [WebViewWrapper] Showing rewarded ad...");
        await show();
        console.log("✅ [WebViewWrapper] Ad show() called successfully!");
        // Note: The actual completion is handled by the ad callback above
      } catch (err) {
        console.error("❌ [WebViewWrapper] Ad show error:", err);

        // Notify WebView about error
        webViewRef.current?.injectJavaScript(`
          (function() {
            console.log('❌ [Web] Ad show error');
            if (typeof window.nativeAdError === 'function') {
              window.nativeAdError(${JSON.stringify(err.message)});
            }
          })();
          true;
        `);
      }
    }
  };

  // Inject script to set up communication
  const injectedJavaScript = `
    (function() {
      console.log('🔧 [Web Injected] Setting up native communication...');
      
      // Flag to indicate we're in native WebView
      window.isNativeWebView = true;
      
      // Listen for messages from native
      window.addEventListener('message', function(event) {
        console.log('📥 [Web] Message from native:', event.data);
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data.type === 'adComplete') {
            console.log('✅ [Web] Ad completed, calling nativeAdComplete...');
            if (typeof window.nativeAdComplete === 'function') {
              window.nativeAdComplete();
            }
          } else if (data.type === 'adError') {
            console.log('❌ [Web] Ad error:', data.error);
            if (typeof window.nativeAdError === 'function') {
              window.nativeAdError(data.error);
            }
          }
        } catch (e) {
          console.log('⚠️ [Web] Could not parse message:', e);
        }
      });
      
      console.log('✅ [Web Injected] Native communication ready!');
      true;
    })();
  `;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* GÜNCEL Badge - Top Center */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 0,
          right: 0,
          zIndex: 9999,
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <View
          style={{
            backgroundColor: "#4CAF50",
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "bold",
              letterSpacing: 1,
            }}
          >
            ✅ GÜNCEL
          </Text>
        </View>
      </View>

      {/* Ad Loading Indicator - shown when ad is loading */}
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 50,
            left: 0,
            right: 0,
            zIndex: 9998,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <View
            style={{
              backgroundColor: "#2196F3",
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              Loading Ad...
            </Text>
          </View>
        </View>
      )}

      {/* Ad Ready Indicator */}
      {isLoaded && !isLoading && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 50,
            left: 0,
            right: 0,
            zIndex: 9998,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <View
            style={{
              backgroundColor: "#4CAF50",
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              ✅ Ad Ready
            </Text>
          </View>
        </View>
      )}

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webViewRef}
          source={{ uri: webUrl }}
          style={{ flex: 1 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          startInLoadingState={true}
          renderLoading={() => (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#fff",
              }}
            >
              <ActivityIndicator size="large" color="#ec4899" />
            </View>
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
        />
      </View>

      {/* Banner Ad Container - Sadece banner boyutunda (320x50) */}
      <View
        style={{
          height: BANNER_HEIGHT + insets.bottom,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: insets.bottom,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Banner placeholder - Gerçek AdMob banner'ı buraya gelecek */}
        <View
          style={{
            width: 320,
            height: BANNER_HEIGHT,
            backgroundColor: "#f3f4f6",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: "#9ca3af",
              fontWeight: "600",
            }}
          >
            Advertisement (320x50)
          </Text>
        </View>
      </View>
    </View>
  );
}
