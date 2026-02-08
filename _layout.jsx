import { useAuth } from "@/utils/auth/useAuth";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { handleGoogleCallback } from "@/utils/auth/GoogleAuth";
import { useAuthStore } from "@/utils/auth/store";
import { View, Text, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnimationStore } from "@/utils/animationStore";
import {
  initializeAdMob,
  useAppOpenAd,
  useInterstitialAd,
  AD_UNIT_IDS,
  shouldShowAppOpenAd,
} from "@/utils/useAdMob";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function FloatingTimer() {
  const insets = useSafeAreaInsets();
  const { isAnimationEnabled, getFormattedTime } = useAnimationStore();

  if (!isAnimationEnabled) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: insets.top + 10,
        right: 16,
        backgroundColor: "#4CAF50",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        ⏱️ {getFormattedTime()}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const { setAuth } = useAuthStore();
  const { loadState } = useAnimationStore();

  // Ref to prevent duplicate handling
  const handlingCallback = useRef(false);

  // ✅ App Open Ad Hook
  const { isLoaded: appOpenLoaded, show: showAppOpenAd } = useAppOpenAd(
    AD_UNIT_IDS.APP_OPEN,
  );

  // ✅ Interstitial Ad Hook (90 saniyede bir gösterilecek)
  const { isLoaded: interstitialLoaded, show: showInterstitialAd } =
    useInterstitialAd(AD_UNIT_IDS.INTERSTITIAL);

  // ✅ Refs for state management
  const appState = useRef(AppState.currentState);
  const hasShownInitialAd = useRef(false);
  const lastInterstitialTime = useRef(Date.now());
  const interstitialTimerRef = useRef(null);

  // ✅ Store latest values in refs for timer access
  const interstitialLoadedRef = useRef(false);
  const showInterstitialAdRef = useRef(null);

  useEffect(() => {
    interstitialLoadedRef.current = interstitialLoaded;
    showInterstitialAdRef.current = showInterstitialAd;
  }, [interstitialLoaded, showInterstitialAd]);

  // Initialize AdMob and load animation state on mount
  useEffect(() => {
    initializeAdMob();
    loadState();
  }, []);

  // ✅ Start Interstitial Timer Function
  const startInterstitialTimer = () => {
    if (interstitialTimerRef.current) {
      clearInterval(interstitialTimerRef.current);
    }

    console.log("⏰ [Interstitial Timer] Starting 90-second timer...");

    interstitialTimerRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastAd = (now - lastInterstitialTime.current) / 1000;

      console.log(
        "⏰ [Interstitial Timer] Check - Time since last ad:",
        timeSinceLastAd.toFixed(0),
        "seconds | Loaded:",
        interstitialLoadedRef.current,
      );

      // 90 saniye geçtiyse ve reklam yüklendiyse göster
      if (
        timeSinceLastAd >= 90 &&
        interstitialLoadedRef.current &&
        showInterstitialAdRef.current
      ) {
        console.log(
          "🎬🎬🎬 [Interstitial Timer] 90 seconds passed! Showing ad NOW...",
        );

        showInterstitialAdRef
          .current()
          .then(() => {
            console.log("✅ [Interstitial Timer] Ad shown successfully!");
            lastInterstitialTime.current = Date.now();
          })
          .catch((error) => {
            console.error("❌ [Interstitial Timer] Failed to show ad:", error);
          });
      }
    }, 5000); // Her 5 saniyede bir kontrol et (daha responsive)
  };

  // ✅ Stop Interstitial Timer Function
  const stopInterstitialTimer = () => {
    if (interstitialTimerRef.current) {
      console.log("⏸️ [Interstitial Timer] Stopping timer");
      clearInterval(interstitialTimerRef.current);
      interstitialTimerRef.current = null;
    }
  };

  // ✅ UNIFIED AppState listener - handles both App Open Ad and Interstitial Timer
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log(
        "📱 [AppState] State changed:",
        appState.current,
        "→",
        nextAppState,
      );

      // App is coming to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("🚀 [AppState] App came to foreground!");

        // ✅ Show App Open Ad
        if (appOpenLoaded && shouldShowAppOpenAd()) {
          console.log(
            "🎯 [AppOpen] Will show App Open Ad after 300ms delay...",
          );
          setTimeout(() => {
            showAppOpenAd().catch((err) => {
              console.error("❌ [AppOpen] Failed to show ad:", err);
            });
          }, 300);
        } else if (!shouldShowAppOpenAd()) {
          console.log("🚫 [AppOpen] Suppressed - Rewarded Ad recently shown");
        } else {
          console.log("⚠️ [AppOpen] Ad not loaded yet");
        }

        // ✅ Start Interstitial Timer
        startInterstitialTimer();
      }

      // App is going to background
      if (nextAppState.match(/inactive|background/)) {
        console.log("💤 [AppState] App going to background");
        stopInterstitialTimer();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
      stopInterstitialTimer();
    };
  }, [appOpenLoaded, showAppOpenAd]);

  // ✅ Show initial ad after app is ready + Start timer on mount
  useEffect(() => {
    if (isReady && !hasShownInitialAd.current) {
      hasShownInitialAd.current = true;

      // ✅ Start interstitial timer immediately on app ready
      console.log("🚀 [Init] App ready - starting interstitial timer");
      startInterstitialTimer();

      // ✅ Show initial App Open Ad
      if (appOpenLoaded && shouldShowAppOpenAd()) {
        console.log(
          "🚀 [AppOpen] Showing initial App Open Ad after 500ms delay...",
        );

        const timer = setTimeout(() => {
          showAppOpenAd().catch((err) => {
            console.error("❌ [AppOpen] Failed to show initial ad:", err);
          });
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [isReady, appOpenLoaded, showAppOpenAd]);

  // Deep link listener for Google OAuth callback
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;

      console.log("🔗 Deep link event received:", url);

      // Google callback'i handle et (중복 처리 방지)
      if (url?.includes("google-callback") && !handlingCallback.current) {
        handlingCallback.current = true;

        console.log("🎯 Processing Google callback...");
        const result = handleGoogleCallback(url, setAuth);

        // Reset flag after a short delay
        setTimeout(() => {
          handlingCallback.current = false;
        }, 1000);

        if (result.success) {
          console.log("✅ Google callback handled successfully");
        } else {
          console.error("❌ Google callback failed:", result.error);
        }
      }
    };

    // Initial URL check (app kapalıyken açıldıysa)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🔗 Initial URL detected:", url);

        if (url.includes("google-callback") && !handlingCallback.current) {
          handlingCallback.current = true;

          console.log("🎯 Processing initial Google callback...");
          const result = handleGoogleCallback(url, setAuth);

          setTimeout(() => {
            handlingCallback.current = false;
          }, 1000);

          if (result.success) {
            console.log("✅ Initial Google callback handled successfully");
          } else {
            console.error("❌ Initial Google callback failed:", result.error);
          }
        }
      }
    });

    // URL change listener (app açıkken)
    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription?.remove();
    };
  }, [setAuth]);

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <FloatingTimer />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
