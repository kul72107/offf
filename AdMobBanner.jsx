import { View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { AD_UNIT_IDS } from "@/utils/useAdMob";

export default function AdMobBanner({ style }) {
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
        onAdLoaded={() => {
          console.log("✅ Banner ad loaded");
        }}
        onAdFailedToLoad={(error) => {
          console.error("❌ Banner ad failed to load:", error);
        }}
      />
    </View>
  );
}
