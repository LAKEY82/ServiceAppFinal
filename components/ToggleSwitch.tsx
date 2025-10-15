import React, { useState, useRef, useEffect } from "react";
import { TouchableOpacity, Animated, View, Text } from "react-native";

const ToggleSwitch = () => {
  const [viewType, setViewType] = useState<"consultation" | "treatment">("consultation");
  const toggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(toggleAnim, {
      toValue: viewType === "consultation" ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [viewType]);

  const handleToggle = () => {
    setViewType(viewType === "consultation" ? "treatment" : "consultation");
  };

  const bgColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#C8E6FA", "#0077A8"], // light blue to primary
  });

  const circleTranslate = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 102],
  });

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.9}>
      <Animated.View
        style={{
          width: 200,
          height: 46,
          borderRadius: 30,
          backgroundColor: bgColor,
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        {/* Sliding Circle */}
        <Animated.View
          style={{
            position: "absolute",
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "#fff",
            transform: [{ translateX: circleTranslate }],
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
          }}
        />

        {/* Labels */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: viewType === "consultation" ? "#fff" : "#333",
            }}
          >
            Consultation
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: viewType === "treatment" ? "#fff" : "#333",
            }}
          >
            Treatment
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ToggleSwitch;
