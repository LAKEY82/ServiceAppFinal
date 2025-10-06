import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import api from "../API/api"; // 👈 your axios instance

// ✅ Define route params properly
type RootStackParamList = {
  Dashboard: undefined;
  ConcentFill: undefined;
  Profile: { id: string };
};

type ProfileRouteProp = RouteProp<RootStackParamList, "Profile">;

const Profile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRouteProp>();
  const { id } = route.params; // ✅ retrieve id

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Example data for expandable sections
  const productsHistory = [
    {
      name: "Spot Lightening Toner",
      date: "2024/09/30",
      doctor: "Dr. Ruwan de silva",
      status: "Not purchased",
    },
    {
      name: "24k gold blasting ampoule - 100ML",
      date: "2024/09/30",
      doctor: "Dr. Ruwan de silva",
      status: "Not purchased",
    },
  ];

  const sections = [
    "Consultation History",
    "Treatment History",
    "Packages History",
    "Referral Consultation History",
    "Medical Reports",
    "Purchase Products History",
  ];

  // ✅ Fetch profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${id}`);
        console.log("📦 Profile API response:", res.data);
        setProfileData(res.data);
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-red-500">Failed to load profile.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Profile Card */}
      <View className="w-[95%] bg-white border border-gray-200 p-5 mt-[15%] mx-auto rounded-xl">
        <View className="flex-row items-center gap-x-6">
          <Image
            source={require("../assets/pp.jpg")}
            className="w-16 h-16 rounded-full"
          />
          <View className="flex-col flex-1">
            <Text className="text-black text-sm font-bold">
              {profileData.salutation} {profileData.fname} {profileData.lname}
            </Text>
            <Text className="font-medium text-xs">
              {profileData.mobileNo || "N/A"}
            </Text>
            <Text className="font-medium text-xs">
              {profileData.customerType || "N/A"} Client
            </Text>
            <Text className="font-medium text-xs text-gray-500">
              ID: {id}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row flex-wrap gap-2 mt-4">
          <TouchableOpacity className="bg-secondary rounded-lg py-2 px-4">
            <Text className="text-black text-xs font-semibold">
              Age: {profileData.age ?? "N/A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-secondary rounded-lg py-2 px-4">
            <Text className="text-black text-xs font-semibold">
              Civil: {profileData.civilStatus ?? "N/A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-secondary rounded-lg py-2 px-4">
            <Text className="text-black text-xs font-semibold">
              Gender: {profileData.gender ?? "N/A"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-secondary rounded-lg py-2 px-4">
            <Text className="text-black text-xs font-semibold">
              Membership: {profileData.customerType ?? "N/A"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Remarks */}
        <View className="flex-col mt-4 p-2">
          <Text className="mb-2 font-semibold">Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            multiline
            placeholder="Enter remarks here..."
            className="border border-gray-300 rounded-lg p-3 h-32 text-sm"
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Main content with ScrollView */}
      <ScrollView className="flex-1 mt-4 px-4">
        {sections.map((section) => (
          <View key={section} className="mb-4 border-b border-gray-300">
            <TouchableOpacity
              onPress={() =>
                setExpandedSection(expandedSection === section ? null : section)
              }
              className="flex-row justify-between items-center py-3"
            >
              <Text className="text-black font-semibold">{section}</Text>
              <Text className="text-gray-500">
                {expandedSection === section ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {expandedSection === section &&
              section === "Purchase Products History" && (
                <ScrollView horizontal className="bg-gray-100 rounded-lg p-2">
                  <View className="flex-column">
                    {productsHistory.map((item, index) => (
                      <View
                        key={index}
                        className="flex-row items-center justify-between py-2 border-b border-gray-300 last:border-b-0 mr-4"
                      >
                        <Text className="w-40 text-sm">{item.name}</Text>
                        <Text className="w-32 text-sm">{item.date}</Text>
                        <Text className="w-40 text-sm">{item.doctor}</Text>
                        <Text className="w-36 text-sm">{item.status}</Text>
                        <TouchableOpacity className="bg-primary rounded-lg px-3 py-1 ml-2">
                          <Text className="text-xs text-white">Add to cart</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
          </View>
        ))}
      </ScrollView>

      {/* Navbar fixed at bottom */}
      <Navbar />
    </View>
  );
};

export default Profile;
