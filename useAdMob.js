import { useState, useEffect } from "react";
import { Platform } from "react-native";
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
} from "react-native-google-mobile-ads";

// Google AdMob Test IDs - Production'da bunları değiştir!
export const AD_UNIT_IDS = {
  REWARDED: Platform.select({
    ios: "ca-app-pub-3940256099942544/1712485313", // Test ID
    android: "ca-app-pub-3940256099942544/5224354917", // Test ID
  }),
  BANNER: Platform.select({
    ios: "ca-app-pub-3940256099942544/2934735716", // Test ID
    android: "ca-app-pub-3940256099942544/6300978111", // Test ID
  }),
};

export const useRewardedAd = (adUnitId) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rewardedAd, setRewardedAd] = useState(null);

  useEffect(() => {
    let rewarded = null;
    let unsubscribeLoaded = null;
    let unsubscribeEarned = null;

    const loadAd = () => {
      try {
        // Create rewarded ad instance
        rewarded = RewardedAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // Listen for loaded event
        unsubscribeLoaded = rewarded.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            console.log("✅ Rewarded ad loaded");
            setIsLoaded(true);
            setIsLoading(false);
          }
        );

        // Listen for earned reward
        unsubscribeEarned = rewarded.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            console.log("🎁 User earned reward:", reward);
          }
        );

        setRewardedAd(rewarded);
        setIsLoading(true);
        rewarded.load();
      } catch (err) {
        console.error("❌ Error loading rewarded ad:", err);
        setError(err);
        setIsLoading(false);
      }
    };

    loadAd();

    // Cleanup
    return () => {
      if (unsubscribeLoaded) {
        unsubscribeLoaded();
      }
      if (unsubscribeEarned) {
        unsubscribeEarned();
      }
    };
  }, [adUnitId]);

  const show = async () => {
    return new Promise((resolve, reject) => {
      if (!rewardedAd || !isLoaded) {
        reject(new Error("Ad not loaded yet"));
        return;
      }

      let unsubscribeEarnedShow = null;
      let unsubscribeDismissed = null;

      try {
        // Listen for reward earned during show
        unsubscribeEarnedShow = rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            console.log("🎁 Reward earned during show:", reward);
            if (unsubscribeEarnedShow) unsubscribeEarnedShow();
            resolve(reward);
          }
        );

        // Listen for ad dismissed
        unsubscribeDismissed = rewardedAd.addAdEventListener(
          RewardedAdEventType.DISMISSED,
          () => {
            console.log("👋 Ad dismissed");
            if (unsubscribeDismissed) unsubscribeDismissed();
            setIsLoaded(false);
            setIsLoading(true);
            rewardedAd.load(); // Reload for next time
          }
        );

        rewardedAd.show();
      } catch (err) {
        console.error("❌ Error showing ad:", err);
        if (unsubscribeEarnedShow) unsubscribeEarnedShow();
        if (unsubscribeDismissed) unsubscribeDismissed();
        reject(err);
      }
    });
  };

  const reload = () => {
    if (rewardedAd && !isLoaded && !isLoading) {
      setIsLoading(true);
      rewardedAd.load();
    }
  };

  return { isLoaded, isLoading, error, show, reload };
};

export const useBannerAd = () => {
  return {
    adUnitId: AD_UNIT_IDS.BANNER,
  };
};

// Initialize AdMob
export const initializeAdMob = async () => {
  try {
    const adapterStatuses = await mobileAds().initialize();
    console.log("✅ AdMob initialized successfully:", adapterStatuses);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize AdMob:", error);
    return false;
  }
};
