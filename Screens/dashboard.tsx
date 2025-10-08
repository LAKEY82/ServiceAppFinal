import {View,Text,TextInput,TouchableOpacity,Platform,Image,FlatList,} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {useNavigation,useRoute,RouteProp,} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../API/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Navigation types
type RootStackParamList = {
  Dashboard: {
    branchEmployeeId: number;
    roleId: number;
    supervisorSmid: number | null;
    token: string;
    userId: number;
    userName: string;
  };
  ConcentFill: { id: string; consultationId: number };
  Profile: { id: string };
};

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;
type DashboardRouteProp = RouteProp<RootStackParamList, "Dashboard">;

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [userData, setUserData] = useState<RootStackParamList["Dashboard"] | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ search state

  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const route = useRoute<DashboardRouteProp>();

  // ✅ Fetch user data
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
            console.warn("No user data found, navigate to Login");
            navigation.navigate("Login" as never);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }
    };
    loadUserData();
  }, [route.params, navigation]);

  // ✅ Fetch appointments API
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!userData) return;
      try {
        const response = await api.get(
          `/TreatmentAppointment/consultation/${userData.branchEmployeeId}`
        );
        console.log("API Response:", response.data);
        setAppointments(response.data);
      } catch (error: any) {
        console.error("Error fetching appointments:", error.response?.data || error.message);
      }
    };
    fetchAppointments();
  }, [userData]);

  // ✅ Filter appointments by selected status
  const statusFilteredAppointments = appointments.filter((item) => {
    if (!selected) return true;
    if (selected === "Pending") return item.photoStatus === "Pending";
    if (selected === "Process") return item.photoStatus === "Processing";
    if (selected === "Complete") return item.photoStatus === "Complete";
    return true;
  });

  // ✅ Then filter again by search query (client name)
  const filteredAppointments = statusFilteredAppointments.filter((item) => {
    const fullName = `${item.customerFName ?? ""} ${item.customerLName ?? ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // ✅ Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const buttons = ["Pending", "Process", "Complete"];

  const renderCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-secondary rounded-2xl p-4 m-1"
      onPress={() =>
        navigation.navigate("ConcentFill", {
          id: item.customerId.toString(),
          consultationId: item.consultationId ?? 1,
        })
      }
      style={{
        width: "48%",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
          android: {
            elevation: 3,
          },
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

        <Text className="text-base font-bold">
          {item.customerFName ?? "Unknown"} {item.customerLName ?? ""}
        </Text>
        <Text className="text-gray-700">
          {item.appointmentType ?? "No service"}
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Profile", { id: item.customerId.toString() })
          }
          className="bg-primary px-3 py-2 rounded-lg mt-2"
        >
          <Text className="text-white text-sm">View Profile</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-center mt-3 font-semibold">
        Photo Status: {item.photoStatus ?? "--"}
      </Text>
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
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold">Hello {userData.userName} 👋</Text>
          <Text className="text-lg font-semibold text-primary">{currentTime}</Text>
        </View>

        {/* ✅ Search bar */}
        <View className="bg-gray-100 rounded-xl px-3 py-2 mb-10">
          <TextInput
            placeholder="Search by client name"
            placeholderTextColor="#888"
            className="text-base text-black"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ✅ Filter Buttons */}
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
                  android: {
                    elevation: 5,
                  },
                }),
              }}
            >
              <View className="flex-col items-center justify-center">
                <Text className="text-black text-center font-semibold">{btn}</Text>
                <Text className="text-gray-500 text-center text-sm">
                  {
                    appointments.filter((item) => {
                      if (btn === "Pending") return item.photoStatus === "Pending";
                      if (btn === "Process") return item.photoStatus === "Processing";
                      if (btn === "Complete") return item.photoStatus === "Complete";
                      return false;
                    }).length
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ✅ Filtered + Searched List */}
        <FlatList
          data={filteredAppointments}
          renderItem={renderCard}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
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
