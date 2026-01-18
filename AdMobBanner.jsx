import { useEffect, useState } from "react";
import { View, Platform } from "react-native";
import { AD_UNIT_IDS } from "@/utils/useAdMob";

export default function AdMobBanner({ style }) {
  const [BannerAd, setBannerAd] = useState(null);
  const [BannerAdSize, setBannerAdSize] = useState(null);

  useEffect(() => {
    const loadBanner = async () => {
      try {
        const { BannerAd: BannerAdComponent, BannerAdSize: BannerAdSizeEnum } =
          await import("react-native-google-mobile-ads");
        setBannerAd(() => BannerAdComponent);
        setBannerAdSize(BannerAdSizeEnum);
      } catch (error) {
        console.error("Failed to load banner ad:", error);
      }
    };

    loadBanner();
  }, []);

  if (!BannerAd || !BannerAdSize) {
    return null;
  }

  return (
    <View
      style={[{ alignItems: "center", backgroundColor: "transparent" }, style]}
    >
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}
