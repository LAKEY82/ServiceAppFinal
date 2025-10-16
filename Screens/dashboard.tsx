import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  FlatList,
} from "react-native";
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
    doctorId:string;
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
  const [userData, setUserData] = useState<RootStackParamList["Dashboard"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"consultation" | "treatment">("consultation");

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

      // Fetch consultations
      try {
        const consultationRes = await api.get(`/TreatmentAppointment/consultation/${userData.branchEmployeeId}`);
        setConsultations(consultationRes.data || []);
      } catch (err: any) {
        console.warn("No consultations found or error:", err?.response?.data || err?.message || err);
        setConsultations([]);
      }

      // Fetch treatments
      try {
        const treatmentRes = await api.get(`/TreatmentAppointment/treatment/All`);
        setTreatments(treatmentRes.data || []);
      } catch (err: any) {
        console.error("Error fetching treatments:", err?.response?.data || err?.message || err);
        setTreatments([]);
      }
    };
    fetchData();
  }, [userData]);

  // Select list strictly based on toggle
  const visibleList = viewType === "consultation" ? consultations : treatments;

  // Filter by status
  const statusFilteredAppointments = visibleList.filter((item) => {
    if (!selected) return true;

    if (selected === "Pending") {
      return item.photoStatus === "Pending" || item.afterPhotoStatus === "Pending";
    }
    if (selected === "Process") {
      return item.photoStatus === "Processing" || item.afterPhotoStatus === "Processing";
    }
    if (selected === "Taken") {
      return item.photoStatus?.toLowerCase() === "taken" || item.afterPhotoStatus?.toLowerCase() === "taken";
    }
    return true;
  });

  // Filter by search query
  const filteredAppointments = statusFilteredAppointments.filter((item) => {
    const fullName = `${item.customerFName ?? ""} ${item.customerLName ?? ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const buttons = ["Pending", "Process", "Taken"];

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-secondary rounded-2xl p-4 m-1"
      onPress={() => {
        navigation.navigate("ConcentFill", {
          id: item.customerId?.toString() ?? "",
          consultationId: item.departmentId ?? 1,
          treatmentId: item.treatmentId ?? 24,
          appointmentType: item.appointmentType ?? "Consultation",
        });
      }}
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
          source={{ uri: item.photo ?? "https://i.sstatic.net/l60Hf.png" }}
          className="w-16 h-16 rounded-full mb-2"
        />
        {item.customerType === "VIP" && (
          <View className="absolute top-2 right-2 bg-red-500 px-2 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">VIP</Text>
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
            navigation.navigate("Profile", { id: item.customerId?.toString() ?? "" })
          }
          className="bg-primary px-3 py-2 rounded-lg mt-2"
        >
          <Text className="text-white text-sm">View Profile</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-3">
        <Text className="text-center font-semibold">
          Status: {item.photoStatus ?? item.afterPhotoStatus ?? "--"}
        </Text>
        {item.treatmentAmount && (
          <Text className="text-center text-sm text-gray-700">
            Amount: Rs. {item.treatmentAmount}
          </Text>
        )}
        {item.startTime && item.endTime && (
          <Text className="text-center text-sm text-gray-500">
            {item.startTime} - {item.endTime}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!userData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500 text-lg">Loading user data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 mt-[20%] mx-[5%]">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold">Hello {userData.userName} 👋</Text>

          <View className="flex-row bg-[#E0F7FF] rounded-full p-1 w-[120px] h-[46px]">
            <TouchableOpacity
              onPress={() => setViewType("consultation")}
              className={`flex-1 justify-center items-center rounded-full ${viewType === "consultation" ? "bg-[#0077A8]" : ""}`}
            >
              <Text
                style={{
                  color: viewType === "consultation" ? "#fff" : "#002131",
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                C
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewType("treatment")}
              className={`flex-1 justify-center items-center rounded-full ${viewType === "treatment" ? "bg-[#0077A8]" : ""}`}
            >
              <Text
                style={{
                  color: viewType === "treatment" ? "#fff" : "#002131",
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                T
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
                <Text className="text-black text-center font-semibold">{btn}</Text>
                <Text className="text-gray-500 text-center text-sm">
                  {visibleList.filter((item) => {
                    if (btn === "Pending")
                      return item.photoStatus === "Pending" || item.afterPhotoStatus === "Pending";
                    if (btn === "Process")
                      return item.photoStatus === "Processing" || item.afterPhotoStatus === "Processing";
                    if (btn === "Taken")
                      return item.photoStatus?.toLowerCase() === "taken" || item.afterPhotoStatus?.toLowerCase() === "taken";
                    return false;
                  }).length}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filteredAppointments}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.customerId ?? item.id ?? index}-${index}`}
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
