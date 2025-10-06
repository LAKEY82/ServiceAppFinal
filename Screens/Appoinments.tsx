import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../API/api";

const Appoinments = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [cartBottomVisible, setCartBottomVisible] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!route.params?.customerId) return;
        const customerId = route.params.customerId;

        // Fetch treatments
        const treatmentRes = await api.get(`/Treatment/${customerId}`);
        setTreatmentData(treatmentRes.data);

        // Fetch packages
        const packageRes = await api.get(`/Treatment/Treatmentpackages/${customerId}`);
        console.log("API Response (Packages):", packageRes.data);

        // Flatten packages -> treatments
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

  const increaseQty = (id: string) => {
    setCartItems((items) =>
      items.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item))
    );
  };

  const decreaseQty = (id: string) => {
    setCartItems((items) =>
      items.map((item) =>
        item.id === id && item.qty > 1 ? { ...item, qty: item.qty - 1 } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const addToCart = (item: any) => {
    setCartItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...item, qty: 1 }];
    });
    setCartSideVisible(true);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discount = subtotal * 0.05;
  const balance = subtotal - discount;

  return (
    <View className="flex-1 bg-white">
      {/* Top Card */}
      <View className="w-[95%] h-[15%] bg-secondary gap-x-6 p-5 mt-[15%] mx-auto flex-row items-center rounded-xl space-x-4">
        <Image source={require("../assets/pp.jpg")} className="w-16 h-16 rounded-full" />
        <View className="flex-col flex-1">
          <Text className="text-black text-sm font-bold">Mr. Jane Cooper</Text>
          <Text className="font-medium text-xs">0772648062</Text>
          <Text className="font-medium text-xs">10:30 AM - 11:30 AM</Text>
          <Text className="font-medium text-xs">Treatment: Facial</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-4 mb-16">
        {/* Treatments Table */}
        <View className="bg-gray-50 p-3 rounded-xl mb-4 shadow-sm">
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
                <View key={t.id} className="flex-row border-b border-gray-300 p-2 items-center">
                  <Text className="w-40 text-xs">{t.tname}</Text>
                  <Text className="w-32 text-xs">{t.billingName}</Text>
                  <Text className="w-24 text-xs">{t.timeDuration || 0} min</Text>
                  <Text className="w-24 text-xs">Rs. {t.price}</Text>
                  <View className="w-28">
                    <TouchableOpacity
                      className="bg-primary px-2 py-1 rounded-lg"
                      onPress={() =>
                        addToCart({ id: t.id, name: t.tname, price: t.price, img: require("../assets/pp.jpg") })
                      }
                    >
                      <Text className="text-white text-xs text-center">Add to Cart</Text>
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
                  <View key={t.id} className="flex-row border-b border-gray-300 p-2 items-center">
                    <Text className="w-28 text-xs">{t.quotationNo || "N/A"}</Text>
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
                            addToCart({ id: t.id, name: t.treatmentName, price: t.price, img: require("../assets/pp.jpg") })
                          }
                        >
                          <Text className="text-white text-xs text-center">Add to Cart</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-xs p-2 text-gray-500">No package treatments available.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

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
                    <Text className="text-xs text-gray-600">Rs. {item.price}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => decreaseQty(item.id)} className="bg-gray-200 px-2 rounded">
                      <Text>-</Text>
                    </TouchableOpacity>
                    <Text className="px-2">{item.qty}</Text>
                    <TouchableOpacity onPress={() => increaseQty(item.id)} className="bg-gray-200 px-2 rounded">
                      <Text>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)} className="ml-2 bg-red-500 px-2 py-1 rounded">
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

            <TouchableOpacity className="bg-primary mt-4 p-3 rounded-lg" onPress={() => setCartSideVisible(false)}>
              <Text className="text-white text-center font-bold">Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Appoinments;
