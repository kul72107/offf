import { useState, useEffect } from "react";
import { Platform } from "react-native";

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

    const loadAd = async () => {
      try {
        // Import AdMob modules
        const { RewardedAd, RewardedAdEventType, TestIds } = await import(
          "react-native-google-mobile-ads"
        );

        // Create rewarded ad instance
        rewarded = RewardedAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        // Set up event listeners
        const loadedListener = rewarded.addAdEventListener(
          RewardedAdEventType.LOADED,
          () => {
            setIsLoaded(true);
            setIsLoading(false);
          },
        );

        const earnedRewardListener = rewarded.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            console.log("User earned reward:", reward);
          },
        );

        setRewardedAd(rewarded);

        // Load the ad
        setIsLoading(true);
        rewarded.load();

        // Cleanup
        return () => {
          loadedListener();
          earnedRewardListener();
        };
      } catch (err) {
        console.error("Error loading rewarded ad:", err);
        setError(err);
        setIsLoading(false);
      }
    };

    loadAd();

    return () => {
      if (rewarded) {
        rewarded = null;
      }
    };
  }, [adUnitId]);

  const show = async () => {
    return new Promise((resolve, reject) => {
      if (!rewardedAd || !isLoaded) {
        reject(new Error("Ad not loaded yet"));
        return;
      }

      try {
        // Set up one-time listeners for this show
        const {
          RewardedAdEventType,
        } = require("react-native-google-mobile-ads");

        const earnedListener = rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          (reward) => {
            console.log("Reward earned:", reward);
            earnedListener();
            resolve(reward);
          },
        );

        const dismissedListener = rewardedAd.addAdEventListener(
          RewardedAdEventType.DISMISSED,
          () => {
            dismissedListener();
            setIsLoaded(false);
            // Reload ad for next time
            rewardedAd.load();
          },
        );

        rewardedAd.show();
      } catch (err) {
        console.error("Error showing rewarded ad:", err);
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
    const { default: mobileAds } = await import(
      "react-native-google-mobile-ads"
    );
    await mobileAds().initialize();
    console.log("AdMob initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize AdMob:", error);
    return false;
  }
};
