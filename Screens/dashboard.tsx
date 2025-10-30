import {View,Text,TextInput,TouchableOpacity,Platform,Image,FlatList,Modal,} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../API/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RootStackParamList = {
  Dashboard: {
    branchEmployeeId: number;
    roleId: number;
    supervisorSmid: number | null;
    token: string;
    userId: number;
    userName: string;
    doctorId: string;
  };
  ConcentFill: {
    id: string;
    consultationId: number;
    appointmentType: string;
    treatmentId: string;
  };
  Profile: { id: string };
  StartTreatment: { customerId: string; consultationId: number };
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;
type DashboardRouteProp = RouteProp<RootStackParamList, "Dashboard">;

const Dashboard = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [userData, setUserData] = useState<
    RootStackParamList["Dashboard"] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"consultation" | "treatment">(
    "consultation"
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const route = useRoute<DashboardRouteProp>();

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (route.params) {
        setUserData(route.params);
      } else {
        try {
          const storedData = await AsyncStorage.getItem("userData");
          if (storedData) {
            setUserData(JSON.parse(storedData));
          } else {
            navigation.navigate("Login" as never);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };
    loadUserData();
  }, [route.params, navigation]);

  // Fetch consultations + treatments independently
  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return;

      try {
        const consultationRes = await api.get(
          `/TreatmentAppointment/consultation/${userData.branchEmployeeId}`
        );
        setConsultations(consultationRes.data || []);
         console.log("🟢 Consultation API Response:", consultationRes.data); // ✅ Added log
      } catch (err: any) {
        console.warn(
          "No consultations found or error:",
          err?.response?.data || err?.message || err
        );
        setConsultations([]);
      }

      try {
        const treatmentRes = await api.get(
          `/TreatmentAppointment/treatment/All`
        );
        setTreatments(treatmentRes.data || []);
      } catch (err: any) {
        console.error(
          "Error fetching treatments:",
          err?.response?.data || err?.message || err
        );
        setTreatments([]);
      }
    };
    fetchData();
  }, [userData]);

  const visibleList = viewType === "consultation" ? consultations : treatments;

  // Filter by status
  const statusFilteredAppointments = visibleList.filter((item) => {
    if (!selected) return true;

    if (selected === "Pending") {
      return (
        item.photoStatus === "Pending" || item.afterPhotoStatus === "Pending"
      );
    }
    if (selected === "Process") {
      return (
        item.photoStatus === "Processing" ||
        item.afterPhotoStatus === "Processing"
      );
    }
    if (selected === "Taken") {
      return (
        item.photoStatus?.toLowerCase() === "taken" ||
        item.afterPhotoStatus?.toLowerCase() === "taken"
      );
    }
    return true;
  });

  // Filter by search
  const filteredAppointments = statusFilteredAppointments.filter((item) => {
    const fullName = `${item.customerFName ?? ""} ${
      item.customerLName ?? ""
    }`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const buttons = ["Pending", "Process", "Taken"];

  // 🟡 Define VIP badge colors
  const getBadgeStyle = (type: string | null | undefined) => {
    switch (type?.toUpperCase()) {
      case "VVIP":
        return { backgroundColor: "#FFD700" }; // Gold
      case "VIP":
        return { backgroundColor: "#FF3B30" }; // Red
      case "TOP-SPENDER":
        return { backgroundColor: "#C0C0C0" }; // Silver
      case "LOYAL":
        return { backgroundColor: "#0077A8" }; // Primary blue
      default:
        return null; // No badge for Non-VIP
    }
  };
  
  const getFullImageUrl = (path?: string) => {
  const BASE_URL = "https://chrimgtapp.xenosyslab.com/"; // update this
  if (!path) {
    console.log("🟠 No image path found, using default placeholder");
    return "https://i.sstatic.net/l60Hf.png";
  }

  const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  console.log("🟢 Full Image URL:", fullUrl); // ✅ Added log
  return fullUrl;
};
  // 🟣 Handle card press
  const handleCardPress = (item: any) => {
  // Check for null or undefined profile picture
  const profilePic = item.profilePicture ?? item.ProfilePicture ?? null;

  if (profilePic === null || profilePic === undefined) {
    setSelectedCustomer(item);
    setModalVisible(true);
  } else {
    navigateToConcentFill(item);
  }
};


  const navigateToConcentFill = (item: any) => {
    navigation.navigate("ConcentFill", {
      id: item.customerId?.toString() ?? "",
      consultationId: item.departmentId ?? 1,
      treatmentId: item.treatmentId ?? 24,
      appointmentType: item.appointmentType ?? "Consultation",
    });
  };

  const renderCard = ({ item }: { item: any }) => {
    const hasInitialForm =
      item.initialStatus === true ||
      item.initialStatus === "filled";
    const hasBeforePhoto =
      item.photoStatus?.toLowerCase() === "taken" ||
      item.beforePhotoStatus === "Taken";
    const hasAfterPhoto = item.afterPhotoStatus?.toLowerCase() === "taken";
    const hasTreatmentForm =
      item.isConcentFormFilled === true || item.treatmentStatus === "Completed";

    const badgeStyle = getBadgeStyle(item.customerType);

    return (
      <TouchableOpacity
        className="bg-secondary rounded-2xl p-4 m-1"
        onPress={() => handleCardPress(item)}
        style={{
          width: "48%",
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            },
            android: { elevation: 3 },
          }),
        }}
      >
        <View className="items-center">
<Image
  source={{ uri: getFullImageUrl(item.profilePicture) }} // ✅ Fixed property name
  className="w-16 h-16 rounded-full mb-2"
/>
          {badgeStyle && (
            <View
              className="absolute top-2 right-2 px-2 py-1 rounded-full"
              style={badgeStyle}
            >
              <Text className="text-white text-xs font-bold uppercase">
                {item.customerType}
              </Text>
            </View>
          )}
          <Text className="text-base font-bold text-center">
            {item.customerFName ?? "Unknown"} {item.customerLName ?? ""}
          </Text>
          <Text className="text-gray-700 text-center">
            {item.appointmentType ?? viewType}
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Profile", {
                id: item.customerId?.toString() ?? "",
              })
            }
            className="bg-primary px-3 py-2 rounded-lg mt-2"
          >
            <Text className="text-white text-sm">View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View className="mt-3">
          <View className="flex-row justify-between mt-2">
            {[0, 1, 2].map((level) => {
              let filled = false;
              if (level === 0) filled = hasInitialForm;
              else if (level === 1) filled = hasBeforePhoto || hasAfterPhoto;
              else if (level === 2) filled = hasTreatmentForm;

              return (
                <View
                  key={level}
                  style={{
                    flex: 1,
                    height: 6,
                    marginHorizontal: 2,
                    borderRadius: 10,
                    backgroundColor: filled ? "#00853E" : "#E0E0E0",
                  }}
                />
              );
            })}
          </View>
          <View className="flex-row justify-between mt-1">
            <Text className="text-[10px] text-gray-600">Initial</Text>
            <Text className="text-[10px] text-gray-600">Photos</Text>
            <Text className="text-[10px] text-gray-600">Daily</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!userData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500 text-lg">Loading user data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* 🟣 Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40">
          <View className="bg-white rounded-2xl p-6 w-[80%] items-center">
            <Text className="text-lg font-bold mb-4 text-center text-black">
              You haven’t updated your profile pic
            </Text>
            <View className="flex-row justify-between w-full">
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Profile", {
                    id: selectedCustomer?.customerId?.toString() ?? "",
                  });
                }}
                className="bg-[#0077A8] flex-1 mr-2 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">
                  Change
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  if (selectedCustomer) navigateToConcentFill(selectedCustomer);
                }}
                className="bg-gray-300 flex-1 ml-2 py-3 rounded-xl"
              >
                <Text className="text-black text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-1 mt-[20%] mx-[5%]">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold">
            Hi, {userData?.userName?.length > 10 
              ? `${userData.userName.substring(0, 10)}...` 
              : userData?.userName} 👋
          </Text>

          <View className="flex-row bg-[#E0F7FF] rounded-full p-1 w-[220px] h-[46px]">
            <TouchableOpacity
              onPress={() => setViewType("consultation")}
              className={`flex-1 justify-center items-center rounded-full ${
                viewType === "consultation" ? "bg-[#0077A8]" : ""
              }`}
            >
              <Text
                style={{
                  color: viewType === "consultation" ? "#DBF7FF" : "#007697",
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Consultation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewType("treatment")}
              className={`flex-1 justify-center items-center rounded-full ${
                viewType === "treatment" ? "bg-[#0077A8]" : ""
              }`}
            >
              <Text
                style={{
                  color: viewType === "treatment" ? "#fff" : "#007697",
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Treatment
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View className="bg-gray-100 rounded-xl px-3 py-2 mb-10">
          <TextInput
            placeholder="Search by client name"
            placeholderTextColor="#888"
            className="text-base text-black"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Status Buttons */}
        <View className="flex-row justify-between mb-4">
          {buttons.map((btn, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelected(selected === btn ? null : btn)}
              className={`px-4 py-4 rounded-lg w-[32%] bg-white h-20`}
              style={{
                borderWidth: selected === btn ? 2 : 0,
                borderColor: selected === btn ? "#0D6EFD" : "transparent",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                  },
                  android: { elevation: 5 },
                }),
              }}
            >
              <View className="flex-col items-center justify-center">
                <Text className="text-black text-center font-semibold">
                  {btn}
                </Text>
                <Text className="text-gray-500 text-center text-sm">
                  {
                    visibleList.filter((item) => {
                      if (btn === "Pending")
                        return (
                          item.photoStatus === "Pending" ||
                          item.afterPhotoStatus === "Pending"
                        );
                      if (btn === "Process")
                        return (
                          item.photoStatus === "Processing" ||
                          item.afterPhotoStatus === "Processing"
                        );
                      if (btn === "Taken")
                        return (
                          item.photoStatus?.toLowerCase() === "taken" ||
                          item.afterPhotoStatus?.toLowerCase() === "taken"
                        );
                      return false;
                    }).length
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filteredAppointments}
          renderItem={renderCard}
          keyExtractor={(item, index) =>
            `${item.customerId ?? item.id ?? index}-${index}`
          }
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              No appointments found
            </Text>
          }
        />
      </View>

      <Navbar />
    </View>
  );
};

export default Dashboard;
