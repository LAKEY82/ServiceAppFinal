import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import api from "../API/api"; // 👈 axios instance

type RootStackParamList = {
  Dashboard: undefined;
  ConcentFill: undefined;
  Profile: { id: string };
};

type ProfileRouteProp = RouteProp<RootStackParamList, "Profile">;

const Profile = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRouteProp>();
  const { id } = route.params;
   const customerId = id;
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<any>({});

  useEffect(() => {
    console.log("🟢 Profile screen received params:", route.params);
    console.log("🟢 Extracted customer ID:", id);
  }, [route.params, id]);

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

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${id}`);
        console.log("📦 Profile API response:", res.data);
        setProfileData(res.data);
        setEditableData(res.data); // initialize editable data
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleChange = (key: string, value: string) => {
    setEditableData({ ...editableData, [key]: value });
  };

  // Handle Save (PUT request)
const handleSave = async () => {
  const payload = {
    salutation: editableData.salutation ?? "",
    fname: editableData.fname ?? "",
    lname: editableData.lname ?? "",
    address: editableData.address ?? "",
    mobileNo: editableData.mobileNo?.trim() ?? "",
    email: editableData.email ?? "",
    age: editableData.age ? Number(editableData.age) : 0,
    civilStatus: editableData.civilStatus ?? "",
  };

  console.log("🟠 Attempting to update profile...");
  console.log("🔗 API URL:", `/ClientProfile/clientprofile/update/${customerId}`);
  console.log("📦 Payload being sent:", payload);

  try {
    setSaving(true);
    // ✅ FIXED: Remove the extra /api prefix
    const res = await api.post(`/ClientProfile/clientprofile/update/${customerId}`, payload);
    
    Alert.alert("✅ Success", "Profile updated successfully!");
    setProfileData(editableData);
    setIsEditing(false);
  } catch (error: any) {
    console.error("❌ Error updating profile:", error);
    console.error("Error response:", error.response?.data);
    Alert.alert("Error", `Failed to update profile: ${error?.response?.data?.message || error.message}`);
  } finally {
    setSaving(false);
  }
};



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
{/* Profile Card */}
<View className="w-[95%] bg-white border border-gray-200 p-5 mt-[15%] mx-auto rounded-xl">
  <View className="flex-row items-center justify-between mb-3">
    {/* Left: Profile Info */}
    <View className="flex-row items-center gap-x-4 flex-1">
      <Image
        source={require("../assets/pp.jpg")}
        className="w-16 h-16 rounded-full"
      />
      <View className="flex-col flex-1">
        {isEditing ? (
          <>
            <TextInput
              value={editableData.salutation ?? ""}
              onChangeText={(text) => handleChange("salutation", text)}
              placeholder="Salutation"
              className="border border-gray-300 rounded p-2 mb-1 text-sm"
            />
            <TextInput
              value={editableData.fname ?? ""}
              onChangeText={(text) => handleChange("fname", text)}
              placeholder="First Name"
              className="border border-gray-300 rounded p-2 mb-1 text-sm"
            />
            <TextInput
              value={editableData.lname ?? ""}
              onChangeText={(text) => handleChange("lname", text)}
              placeholder="Last Name"
              className="border border-gray-300 rounded p-2 mb-1 text-sm"
            />
            <TextInput
              value={editableData.mobileNo ?? ""}
              onChangeText={(text) => handleChange("mobileNo", text)}
              placeholder="Mobile Number"
              className="border border-gray-300 rounded p-2 mb-1 text-sm"
            />
          </>
        ) : (
          <>
            <Text className="text-black text-sm font-bold">
              {profileData.salutation} {profileData.fname} {profileData.lname}
            </Text>
            <Text className="font-medium text-xs">
              {profileData.mobileNo || "N/A"}
            </Text>
          </>
        )}
        <Text className="font-medium text-xs">
          {profileData.customerType || "N/A"} Client
        </Text>
        <Text className="font-medium text-xs text-gray-500">ID: {id}</Text>
      </View>
    </View>

    {/* Right: Edit/Save Button */}
    <TouchableOpacity
      onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
      className="bg-secondary px-4 py-2 rounded-lg ml-2"
    >
      {saving ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text className="text-black font-semibold">
          {isEditing ? "Save" : "Edit"}
        </Text>
      )}
    </TouchableOpacity>
  </View>

  {/* Stats Row */}
  <View className="flex-row flex-wrap gap-2 mt-4">
    <View className="bg-secondary rounded-lg py-2 px-4">
      {isEditing ? (
        <TextInput
          value={editableData.age?.toString() ?? ""}
          onChangeText={(text) => handleChange("age", text)}
          placeholder="Age"
          className="text-xs text-black"
        />
      ) : (
        <Text className="text-black text-xs font-semibold">
          Age: {profileData.age ?? "N/A"}
        </Text>
      )}
    </View>

    <View className="bg-secondary rounded-lg py-2 px-4">
      {isEditing ? (
        <TextInput
          value={editableData.civilStatus ?? ""}
          onChangeText={(text) => handleChange("civilStatus", text)}
          placeholder="Civil Status"
          className="text-xs text-black"
        />
      ) : (
        <Text className="text-black text-xs font-semibold">
          Civil: {profileData.civilStatus ?? "N/A"}
        </Text>
      )}
    </View>

    <View className="bg-secondary rounded-lg py-2 px-4">
      {isEditing ? (
        <TextInput
          value={editableData.gender ?? ""}
          onChangeText={(text) => handleChange("gender", text)}
          placeholder="Gender"
          className="text-xs text-black"
        />
      ) : (
        <Text className="text-black text-xs font-semibold">
          Gender: {profileData.gender ?? "N/A"}
        </Text>
      )}
    </View>

    <View className="bg-secondary rounded-lg py-2 px-4">
      <Text className="text-black text-xs font-semibold">
        Membership: {profileData.customerType ?? "N/A"}
      </Text>
    </View>
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


      {/* Expandable Sections */}
      <ScrollView className="flex-1 mt-4 px-4 mb-10">
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
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
          </View>
        ))}
      </ScrollView>

      <Navbar />
    </View>
  );
};

export default Profile;
