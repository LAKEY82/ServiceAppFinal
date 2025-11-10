import {View,Text,Image,Platform, ToastAndroid,TouchableOpacity,ScrollView,Modal,KeyboardAvoidingView,TextInput,Alert,Keyboard,} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../API/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Appoinments = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { customerId, treatmentId,fromPage  } = route.params;// Cart & Treatments
  const [cartSideVisible, setCartSideVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // Check if the user navigates back aftter the treatment ended
  const [treatmentData, setTreatmentData] = useState<any[]>([]);
  const [packageTreatments, setPackageTreatments] = useState<any[]>([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([
    {
      id: 1,
      name: "Vitamin C Serum",
      price: 4500,
      qty: 1,
      img: require("../assets/pp.jpg"),
    },
  ]);

//Fetch cart items 
const fetchCartItems = async () => {
  try {
    if (!route.params?.customerId) return;
    const res = await api.get(`/Treatment/Getcart/${route.params.customerId}`);
    if (res.data.success) {
      const serverItems = res.data.data.map((item: any) => ({
        id: item.productCode?.trim() || item.id,
        name: item.productName,
        price: item.lastPurchasePrice || 0,
        volume: item.volume,
        treatmentId: item.treatmentId,
        qty: 1, // You can add quantity support later if backend supports it
      }));
      setCartItems(serverItems);
      console.log("🛒 Cart items loaded:", serverItems);
    }
  } catch (err: any) {
    console.log("❌ Error fetching cart:", err.response?.data || err.message);
  }
};


  const addToCart = async (item: any) => {
  try {
    // 1️⃣ Update local cart UI immediately
    setCartItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing)
        return prev.map((p) =>
          p.id === item.id ? { ...p, qty: p.qty + 1 } : p
        );
      return [...prev, { ...item, qty: 1 }];
    });

    // 2️⃣ Show cart sidebar
    setCartSideVisible(true);

    // 3️⃣ Prepare data for backend
    const payload = {
      customerId: route.params.customerId, // from navigation params
      productCode: item.id, // product code (trimmed if needed)
      treatmentId: savedTreatmentAppointmentId, // treatment appointment ID
    };

    console.log("📤 Sending Add to Cart Payload:", payload);

    // 4️⃣ Call the API
    const res = await api.post("/Treatment/customer/Addtocart", payload);

    console.log("✅ Product added to backend cart:", res.data);

    // 5️⃣ Optional: show toast
    if (Platform.OS === "android") {
      ToastAndroid.show("Added to cart successfully", ToastAndroid.SHORT);
    } else {
      Alert.alert("Success", "Added to cart successfully");
    }

  } catch (err: any) {
    console.log("❌ Add to Cart API Error:", err.response?.data || err.message);
    Alert.alert("Error", "Failed to add to cart. Please try again.");
  }
};

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [savedTreatmentAppointmentId, setSavedTreatmentAppointmentId] =
    useState<number | null>(null);
  // Rating Modal
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [remark, setRemark] = useState("");
  const [treatmentAppointmentData, setTreatmentAppointmentData] =
    useState<any>(null);
  // Add this below other useState declarations
  const [timerColor, setTimerColor] = useState("black");
  const [productData, setProductData] = useState<any[]>([]);

  // ⏱ Convert time string (e.g. "09:00 AM") to a Date object
  const parseTimeToSeconds = (timeStr: string) => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime() / 1000; // return seconds
  };

  useEffect(() => {
    if (
      !treatmentAppointmentData?.startTime ||
      !treatmentAppointmentData?.endTime
    )
      return;

    const startSec = parseTimeToSeconds(treatmentAppointmentData.startTime);
    const endSec = parseTimeToSeconds(treatmentAppointmentData.endTime);
    const totalDuration = (endSec as any) - (startSec as any);

    if (totalDuration > 0) {
      // Every time seconds update, change color
      if (seconds >= totalDuration) {
        setTimerColor("red"); // ⏰ Overtime
      } else if (seconds >= totalDuration / 2) {
        setTimerColor("yellow"); // ⚠️ Halfway through
      } else {
        setTimerColor("black"); // ✅ Normal
      }
    }
  }, [seconds, treatmentAppointmentData]);

  useEffect(() => {
    const loadAppointmentId = async () => {
      try {
        const id = await AsyncStorage.getItem("treatmentAppointmentId");

        console.log("✅ Loaded treatmentAppointmentId from Async:", id);

        if (id) {
          setSavedTreatmentAppointmentId(Number(id));
        } else {
          console.log("⚠️ No treatmentAppointmentId found in AsyncStorage");
        }
      } catch (error) {
        console.log("❌ Error reading treatmentAppointmentId:", error);
      }
    };

    loadAppointmentId();
  }, []);

  //Logic in changing the display accordingly
  useEffect(() => {
  if (fromPage === "TreatmentAfterPhoto") {
    setIsCompleted(true);

    // Show a toast / alert
   if (Platform.OS === "android") {
  ToastAndroid.show("Message", ToastAndroid.SHORT);
} else {
  Alert.alert("Message");
}
  }
}, [fromPage]);

  useEffect(() => {
    if (savedTreatmentAppointmentId !== null) {
      console.log(
        "📡 Calling API with loaded AppointmentId:",
        savedTreatmentAppointmentId
      );
      fetchTreatmentAppointmentData(savedTreatmentAppointmentId);
    }
  }, [savedTreatmentAppointmentId]);

  //Get the treatmentData
  const fetchTreatmentAppointmentData = async (appointmentId: number) => {
    try {
      console.log(
        "🚀 Calling API (endpoint only): /Treatment/treatmentData/" +
          appointmentId
      );

      console.log(
        "🌐 FINAL API URL:",
        `${api.defaults.baseURL}/Treatment/treatmentData/${appointmentId}`
      );

      const res = await api.get(`/Treatment/treatmentData/${appointmentId}`);

      console.log("✅ Treatment Appointment Data Response:", res.data);

      setTreatmentAppointmentData(res.data.data);
    } catch (err: any) {
      console.log(
        "❌ Error fetching treatment appointment data:",
        err.response?.data || err.message
      );
    }
  };

  // ✅ START Treatment Timer API
  const startTreatmentAppointment = async () => {
    if (!savedTreatmentAppointmentId) {
      Alert.alert("Error", "No appointment ID found.");
      return;
    }

    try {
      const res = await api.post("/Treatment/treatment-appointment/start", {
        appointmentId: savedTreatmentAppointmentId,
      });
      console.log("✅ Start API Response:", res.data);
    } catch (err: any) {
      console.log("❌ Start API Error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to start treatment appointment.");
    }
  };

  // ✅ STOP Treatment Timer API
  const stopTreatmentAppointment = async () => {
    if (!savedTreatmentAppointmentId) {
      Alert.alert("Error", "No appointment ID found.");
      return;
    }

    try {
      const res = await api.post("/Treatment/treatment-appointment/stop", {
        appointmentId: savedTreatmentAppointmentId,
      });
      console.log("✅ Stop API Response:", res.data);
    } catch (err: any) {
      console.log("❌ Stop API Error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to stop treatment appointment.");
    }
  };

  // Fetch Treatments & Packages
// ✅ Fetch Treatments & Package Treatments (Both Independent)
useEffect(() => {
  const fetchData = async () => {
    if (!route.params?.customerId) return;

    const customerId = route.params.customerId;

    // ✅ Treatments
    try {
      const treatmentRes = await api.get(`/Treatment/${customerId}`);
      setTreatmentData(treatmentRes.data?.data || []);
    } catch (error: any) {
      console.log("❌ Treatments API Error:", error.response?.data || error.message);
      setTreatmentData([]);
    }

    // ✅ Package Treatments
    try {
      const packageRes = await api.get(`/Treatment/Treatmentpackages/${customerId}`);
      const packageList = packageRes.data?.data || [];
      const flattened: any[] = [];
      if (Array.isArray(packageList)) {
        packageList.forEach((pkgObj: any) => {
          const { quotationNo, package: pkg, treatments } = pkgObj;
          if (Array.isArray(treatments)) {
            treatments.forEach((treatment: any, index: number) => {
              flattened.push({
                id: `${pkg?.id}-${treatment?.treatmentId}-${index}`,
                quotationNo,
                packageName: pkg?.packageName || "N/A",
                packageType: pkg?.packageType || "N/A",
                treatmentName: treatment?.treatment || "N/A",
                price: treatment?.discountedPrice || treatment?.price || 0,
                duration: treatment?.timeDuration || 0,
              });
            });
          }
        });
      }
      setPackageTreatments(flattened);
    } catch (error: any) {
      console.log("❌ Package Treatments API Error:", error.response?.data || error.message);
      setPackageTreatments([]);
    }

    // ✅ ✅ PRODUCTS API
    try {
      const productRes = await api.get(`/Treatment/ProductDetails/All`);
      console.log("✅ Products API Response:", productRes.data);
      const productList = productRes.data?.data || [];
      setProductData(Array.isArray(productList) ? productList : []);
    } catch (error: any) {
      console.log("❌ Products API Error:", error.response?.data || error.message);
      setProductData([]);
    }
  };

  fetchData();
}, [route.params]);

  // Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
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
        item.id === id && item.qty > 1 ? { ...item, qty: item.qty - 1 } : item
      )
    );

  const removeItem = (id: string) =>
    setCartItems((items) => items.filter((item) => item.id !== id));

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const discount = subtotal * 0.05;
  const balance = subtotal - discount;

  //Customer feedback and rating api
  // ✅ Submit Treatment Feedback API
const submitTreatmentFeedback = async () => {
  if (!savedTreatmentAppointmentId) {
    Alert.alert("Error", "No treatment appointment ID found.");
    return;
  }

  if (rating <= 0) {
    Alert.alert("Error", "Please select a rating before submitting.");
    return;
  }

  try {
    const payload = {
      treatmentAppointmentId: savedTreatmentAppointmentId, // from AsyncStorage
      maxRate: 5, // ⭐ total stars
      feedbackRate: rating, // ⭐ user's selected rating
      remark: remark || "", // optional remark
    };

    console.log("📤 Sending Feedback Payload:", payload);

    const response = await api.post(
      "/Treatment/treatment-appointment/feedback",
      payload
    );

    console.log("✅ Feedback Response:", response.data);

    Alert.alert("Thank You!", "Your feedback has been submitted.");

    // Reset modal states
    setShowRatingModal(false);
    setRating(0);
    setRemark("");

    // Navigate after feedback is sent
    navigation.navigate("TreatmentAfterPhoto", {
      formData: {
        customerId: customerId,
        treatmentId: treatmentId,
      },
    });
  } catch (error: any) {
    console.error("❌ Feedback Submission Error:", error.response?.data || error.message);
    Alert.alert("Error", "Failed to submit feedback. Please try again.");
  }
};


  return (
    <View className="flex-1 bg-white">
      {/* Top Card with Timer */}
      <View className="w-[95%] h-[25%] bg-secondary gap-x-6 p-5 mt-[15%] mx-auto flex-col items-center justify-center rounded-xl space-y-4">
        <Text style={{ color: timerColor }} className="text-[60px] font-bold">
          {formatTime(seconds)}
        </Text>
        <View className="flex-row gap-x-4 mt-[5%]">
          <TouchableOpacity
            className={`px-4 py-2 w-[30%] items-center rounded-lg ${
              isRunning ? "bg-red-500" : "bg-primary"
            }`}
            onPress={async () => {
              if (isRunning) {
                setIsRunning(false);
                await stopTreatmentAppointment(); // ✅ STOP API call
                setShowRatingModal(true);
              } else {
                await startTreatmentAppointment(); // ✅ START API call
                setIsRunning(true);
              }
            }}
          >
            <Text className="text-white font-bold text-sm">
              {isRunning ? "End" : "Start"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="px-4 py-2 w-[30%] items-center rounded-lg bg-white"
            onPress={() => {
              setIsRunning(false);
            }}
          >
            <Text className="text-black font-bold text-sm">Pause</Text>
          </TouchableOpacity>
        </View>
        {treatmentAppointmentData && (
          <View className="mt-3 flex-row items-center justify-center gap-x-6">
            <Text className="text-black text-sm">
              ⏳ {treatmentAppointmentData.startTime || "Not started"}
            </Text>
            <Text className="text-black text-sm">
              🔚 {treatmentAppointmentData.endTime || "Not ended"}
            </Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 px-4 mt-4 mb-16">
        {/* Treatments Table */}
        {/* <View className="bg-gray-50 p-3 rounded-xl mb-4 shadow-sm">
          <Text className="font-bold text-base mb-2">🩺 Treatments</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View className="flex-row bg-gray-200 p-2 rounded-md">
                <Text className="w-40 font-semibold text-xs">
                  Treatment Name
                </Text>
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
                  <Text className="w-24 text-xs">
                    {t.timeDuration || 0} min
                  </Text>
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
        </View> */}

        {/* Package Treatments Table */}
        <View className="bg-gray-50 p-3 rounded-xl mb-[12%] shadow-sm">
          <Text className="font-bold text-base mb-2">
            🎁 Package Treatments
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View className="flex-row bg-gray-200 p-2 rounded-md">
                <Text className="w-28 font-semibold text-xs">Quotation No</Text>
                <Text className="w-40 font-semibold text-xs">Package Name</Text>
                <Text className="w-32 font-semibold text-xs">Package Type</Text>
                <Text className="w-40 font-semibold text-xs">
                  Treatment Name
                </Text>
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
  <Text className="w-28 text-xs">{t.quotationNo || "N/A"}</Text>
  <Text className="w-40 text-xs">{t.packageName}</Text>
  <Text className="w-32 text-xs">{t.packageType}</Text>
  <Text className="w-40 text-xs">{t.treatmentName}</Text>
  <Text className="w-24 text-xs">{t.duration} min</Text>
  <Text className="w-24 text-xs">Rs. {t.price}</Text>

  {/* ✅ Add to Cart for every package treatment */}
<View className="w-28">
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
    <Text className="text-white text-xs text-center">Add to Cart</Text>
  </TouchableOpacity>
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
          
                {/* ✅ View Cart Button */}
      <View className="items-center self-end w-[30%] mt-[4%] ">
        <TouchableOpacity
          className="bg-primary px-2 py-1 rounded-lg shadow-md"
          onPress={() => setCartSideVisible(true)}
        >
          <Text className="text-white font-semibold text-sm">
            View Cart ({cartItems.length})
          </Text>
        </TouchableOpacity>
      </View>
        </View>
        {/* Products Table */}
<View className="bg-gray-50 p-3 rounded-xl mb-16 shadow-sm">
  <Text className="font-bold text-base mb-2">🧴 Products</Text>

  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View>
      {/* Table Header */}
      <View className="flex-row bg-gray-200 p-2 rounded-md">
        <Text className="w-32 font-semibold text-xs">Product Code</Text>
        <Text className="w-48 font-semibold text-xs">Product Name</Text>
        <Text className="w-24 font-semibold text-xs">Volume</Text>
        <Text className="w-28 font-semibold text-xs">Price (Rs.)</Text>
        <Text className="w-28 font-semibold text-xs text-center">Action</Text>
      </View>

      {/* Product Rows */}
      {productData.length > 0 ? (
        <>
          {productData
            .slice(0, showAllProducts ? productData.length : 5)
            .map((p, index) => (
              <View
                key={index}
                className="flex-row border-b border-gray-200 p-2 items-center"
              >
                {/* Remove trailing spaces from code */}
                <Text className="w-32 text-xs">{p.productCode?.trim()}</Text>

                {/* Product Name */}
                <Text className="w-48 text-xs" numberOfLines={1}>
                  {p.productName || "N/A"}
                </Text>

                {/* Volume (show N/A if blank) */}
                <Text className="w-24 text-xs">
                  {p.volume?.trim() !== "" ? p.volume : "N/A"}
                </Text>

                {/* Price with comma formatting */}
                <Text className="w-28 text-xs">
                  {p.lastPurchasePrice
                    ? p.lastPurchasePrice.toLocaleString("en-LK", {
                        minimumFractionDigits: 2,
                      })
                    : "0.00"}
                </Text>

                {/* Add to Cart Button */}
                <View className="w-28">
                  <TouchableOpacity
                    className="bg-primary px-2 py-1 rounded-lg"
                    onPress={() =>
  addToCart({
    id: p.productCode?.trim(),
    name: p.productName,
    price: p.lastPurchasePrice || 0,
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

          {/* See More / See Less Button */}
          {productData.length > 10 && (
            <TouchableOpacity
              className="p-2 mt-2 bg-gray-200 rounded-lg items-center"
              onPress={() => setShowAllProducts(!showAllProducts)}
            >
              <Text className="text-xs font-semibold text-gray-700">
                {showAllProducts ? "See Less ▲" : "See More ▼"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <Text className="text-xs p-2 text-gray-500">No products available.</Text>
      )}
    </View>
  </ScrollView>
  {/* ✅ View Products Cart Button */}
<View className="items-center self-end w-[35%] mt-[4%]">
  <TouchableOpacity
    className="bg-primary px-2 py-1 rounded-lg shadow-md"
    onPress={async () => {
      await fetchCartItems();   // ⬅️  call the function here
      setCartSideVisible(true); // show the modal afterwards
    }}
  >
    <Text className="text-white font-semibold text-sm">
      View Cart
    </Text>
  </TouchableOpacity>
</View>

</View>

      </ScrollView>


      {/* Navbar */}
      <Navbar />

      {/* Cart Modal */}
      <Modal visible={cartSideVisible} animationType="slide" transparent>
        <View className="flex-1 mt-[15%] justify-end items-end bg-black/50">
          <View className="bg-white rounded-l-2xl p-4 w-[80%] h-full">
            <Text className="text-lg font-bold mb-4">Cart</Text>
            <ScrollView>
              {cartItems.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center border-b py-2"
                >
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
                  submitTreatmentFeedback();
                  setShowRatingModal(false);
                  Keyboard.dismiss();
                  navigation.navigate("TreatmentAfterPhoto", {
                    formData: {
                      customerId: customerId, // ✅ same one from current screen
                      treatmentId: treatmentId, // ✅ include answers if any
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

export default Appoinments;
