import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../API/api";

const MedicalReports = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { customerId,treatmentId} = route.params;
  // Cart & Treatments
  const [cartSideVisible, setCartSideVisible] = useState(false);
  const [treatmentData, setTreatmentData] = useState<any[]>([]);
  const [packageTreatments, setPackageTreatments] = useState<any[]>([]);

  const [cartItems, setCartItems] = useState<any[]>([
    {
      id: 1,
      name: "Vitamin C Serum",
      price: 4500,
      qty: 1,
      img: require("../assets/pp.jpg"),
    },
  ]);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [remark, setRemark] = useState("");

  // Fetch Treatments & Packages
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!route.params?.customerId) return;
        const customerId = route.params.customerId;

        const treatmentRes = await api.get(`/Treatment/${customerId}`);
        setTreatmentData(treatmentRes.data);

        const packageRes = await api.get(`/Treatment/Treatmentpackages/${customerId}`);
        const flattened: any[] = [];
        packageRes.data.forEach((pkgObj: any) => {
          const { quotationNo, package: pkg, treatments } = pkgObj;
          treatments.forEach((treatment: any, index: number) => {
            flattened.push({
              id: `${pkg.id}-${treatment.treatmentId}-${index}`,
              quotationNo,
              packageName: pkg.packageName,
              packageType: pkg.packageType,
              treatmentName: treatment.treatment || "N/A",
              price: treatment.discountedPrice || treatment.price || 0,
              duration: treatment.timeDuration || 0,
            });
          });
        });
        setPackageTreatments(flattened);
      } catch (error: any) {
        console.error("Error fetching data:", error.message);
      }
    };

    fetchData();
  }, [route.params]);

  // Cart Functions
  const addToCart = (item: any) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing)
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + 1 } : p
        );
      return [...prev, { ...item, qty: 1 }];
    });
    setCartSideVisible(true);
  };

  const increaseQty = (id: string) =>
    setCartItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, qty: item.qty + 1 } : item
      )
    );

  const decreaseQty = (id: string) =>
    setCartItems((items) =>
      items.map((item) =>
        item.id === id && item.qty > 1
          ? { ...item, qty: item.qty - 1 }
          : item
      )
    );

  const removeItem = (id: string) =>
    setCartItems((items) => items.filter((item) => item.id !== id));

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discount = subtotal * 0.05;
  const balance = subtotal - discount;

  return (
    <View className="flex-1 bg-white">
      {/* Top Card with Timer */}

      <ScrollView className="flex-1 px-4 mt-4 mb-16">
        {/* Treatments Table */}
        <View className="bg-gray-50 p-3 rounded-xl mt-[10%] mb-4 shadow-sm">
          <Text className="font-bold text-base mb-2">🩺 Treatments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View className="flex-row bg-gray-200 p-2 rounded-md">
                <Text className="w-40 font-semibold text-xs">Treatment Name</Text>
                <Text className="w-32 font-semibold text-xs">Billing Name</Text>
                <Text className="w-24 font-semibold text-xs">Duration</Text>
                <Text className="w-24 font-semibold text-xs">Price</Text>
                <Text className="w-28 font-semibold text-xs">Action</Text>
              </View>
              {treatmentData.map((t) => (
                <View
                  key={t.id}
                  className="flex-row border-b border-gray-300 p-2 items-center"
                >
                  <Text className="w-40 text-xs">{t.tname}</Text>
                  <Text className="w-32 text-xs">{t.billingName}</Text>
                  <Text className="w-24 text-xs">{t.timeDuration || 0} min</Text>
                  <Text className="w-24 text-xs">Rs. {t.price}</Text>
                  <View className="w-28">
                    <TouchableOpacity
                      className="bg-primary px-2 py-1 rounded-lg"
                      onPress={() =>
                        addToCart({
                          id: t.id,
                          name: t.tname,
                          price: t.price,
                          img: require("../assets/pp.jpg"),
                        })
                      }
                    >
                      <Text className="text-white text-xs text-center">
                        Add to Cart
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Package Treatments Table */}
        <View className="bg-gray-50 p-3 rounded-xl mb-16 shadow-sm">
          <Text className="font-bold text-base mb-2">🎁 Package Treatments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View className="flex-row bg-gray-200 p-2 rounded-md">
                <Text className="w-28 font-semibold text-xs">Quotation No</Text>
                <Text className="w-40 font-semibold text-xs">Package Name</Text>
                <Text className="w-32 font-semibold text-xs">Package Type</Text>
                <Text className="w-40 font-semibold text-xs">Treatment Name</Text>
                <Text className="w-24 font-semibold text-xs">Duration</Text>
                <Text className="w-24 font-semibold text-xs">Price</Text>
                <Text className="w-28 font-semibold text-xs">Action</Text>
              </View>
              {packageTreatments.length > 0 ? (
                packageTreatments.map((t) => (
                  <View
                    key={t.id}
                    className="flex-row border-b border-gray-300 p-2 items-center"
                  >
                    <Text className="w-28 text-xs">
                      {t.quotationNo || "N/A"}
                    </Text>
                    <Text className="w-40 text-xs">{t.packageName}</Text>
                    <Text className="w-32 text-xs">{t.packageType}</Text>
                    <Text className="w-40 text-xs">{t.treatmentName}</Text>
                    <Text className="w-24 text-xs">{t.duration} min</Text>
                    <Text className="w-24 text-xs">Rs. {t.price}</Text>
                    <View className="w-28">
                      {(!t.quotationNo || t.quotationNo.trim() === "") && (
                        <TouchableOpacity
                          className="bg-primary px-2 py-1 rounded-lg"
                          onPress={() =>
                            addToCart({
                              id: t.id,
                              name: t.treatmentName,
                              price: t.price,
                              img: require("../assets/pp.jpg"),
                            })
                          }
                        >
                          <Text className="text-white text-xs text-center">
                            Add to Cart
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-xs p-2 text-gray-500">
                  No package treatments available.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Navbar */}
      <Navbar />

      {/* Cart Modal */}
      <Modal visible={cartSideVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end items-end bg-black/50">
          <View className="bg-white rounded-l-2xl p-4 w-[80%] h-full">
            <Text className="text-lg font-bold mb-4">Cart</Text>
            <ScrollView>
              {cartItems.map((item) => (
                <View key={item.id} className="flex-row items-center border-b py-2">
                  <Image source={item.img} className="w-12 h-12 rounded mr-2" />
                  <View className="flex-1">
                    <Text className="font-semibold text-sm">{item.name}</Text>
                    <Text className="text-xs text-gray-600">
                      Rs. {item.price}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => decreaseQty(item.id)}
                      className="bg-gray-200 px-2 rounded"
                    >
                      <Text>-</Text>
                    </TouchableOpacity>
                    <Text className="px-2">{item.qty}</Text>
                    <TouchableOpacity
                      onPress={() => increaseQty(item.id)}
                      className="bg-gray-200 px-2 rounded"
                    >
                      <Text>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    className="ml-2 bg-red-500 px-2 py-1 rounded"
                  >
                    <Text className="text-white text-xs">Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View className="mt-4">
              <Text className="text-sm">Subtotal: Rs. {subtotal}</Text>
              <Text className="text-sm">Discount: Rs. {discount}</Text>
              <Text className="font-bold text-sm">Balance: Rs. {balance}</Text>
            </View>

            <TouchableOpacity
              className="bg-primary mt-4 p-3 rounded-lg"
              onPress={() => setCartSideVisible(false)}
            >
              <Text className="text-white text-center font-bold">Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ⭐ Rate Us Modal */}
      <Modal visible={showRatingModal} transparent animationType="slide">
        <View className="flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white p-6 rounded-xl w-[85%]">
            <Text className="text-lg font-bold text-center mb-4">Rate Us</Text>

            {/* Star Rating */}
            <View className="flex-row justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text
                    style={{
                      fontSize: 32,
                      marginHorizontal: 5,
                      color: star <= rating ? "#FFD700" : "#CCCCCC",
                    }}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Remark Input */}
            <View className="bg-[#F6F6F6] rounded-lg p-2 mb-4">
              <TextInput
                className="text-black"
                placeholder="Add your remark..."
                placeholderTextColor="#999"
                value={remark}
                onChangeText={setRemark}
                multiline
                style={{ height: 100, textAlignVertical: "top" }}
              />
            </View>

            {/* Buttons */}
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                className="bg-gray-300 px-6 py-3 rounded-full w-[45%] items-center"
                onPress={() => {
                  setShowRatingModal(false);
                  setRating(0);
                  setRemark("");
                }}
              >
                <Text className="text-black font-bold">Cancel</Text>
              </TouchableOpacity>

<TouchableOpacity
  className="bg-primary px-6 py-3 rounded-full w-[45%] items-center"
  onPress={() => {
    console.log("⭐ Rating:", rating);
    console.log("📝 Remark:", remark);
    Alert.alert("Thank You!", "Your feedback has been submitted.");
    setShowRatingModal(false);
    setRating(0);
    setRemark("");

    navigation.navigate("TreatmentAfterPhoto", {
      formData: {
        customerId: customerId,       // ✅ same one from current screen
        treatmentId: treatmentId,    // ✅ include answers if any
      },
    });
  }}
>
  <Text className="text-white font-bold">Submit</Text>
</TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MedicalReports;
