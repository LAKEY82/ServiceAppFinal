import {View,Text,TouchableOpacity,Image,TextInput,ScrollView,ActivityIndicator,Alert,} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import api from "../API/api"; // 👈 axios instance
import { Modal } from "react-native";
import * as ImagePicker from "expo-image-picker";

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

  const [consultationHistory, setConsultationHistory] = useState<any[]>([]);
  const [loadingConsultation, setLoadingConsultation] = useState(false);

  const [treatmentHistory, setTreatmentHistory] = useState<any[]>([]);
  const [loadingTreatment, setLoadingTreatment] = useState(false);

  // We'll store formatted package history so rendering is simpler:
  const [packageHistory, setPackageHistory] = useState<any[]>([]);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [showModal, setShowModal] = useState(false);
const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
const [uploading, setUploading] = useState(false);

  useEffect(() => {
    console.log("🟢 Profile screen received params:", route.params);
    console.log("🟢 Extracted customer ID:", id);
  }, [route.params, id]);

  const sections = [
    "Consultation History",
    "Treatment History",
    "Packages History",
  ];

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${id}`);
        console.log("📦 Profile API response:", res.data);
        setProfileData(res.data);
        setEditableData(res.data);
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  // Fetch consultation history
  useEffect(() => {
    const fetchConsultationHistory = async () => {
      try {
        setLoadingConsultation(true);
        const res = await api.get(`/Consultation/ConsultationHistory/${id}`);
        console.log("📦 Consultation History:", res.data);
        setConsultationHistory(res.data);
      } catch (error) {
        console.error("❌ Error fetching consultation history:", error);
      } finally {
        setLoadingConsultation(false);
      }
    };
    fetchConsultationHistory();
  }, [id]);

  // Fetch treatment history
  useEffect(() => {
    const fetchTreatmentHistory = async () => {
      try {
        setLoadingTreatment(true);
        const res = await api.get(`/TreatmentAppointment/treatmenthistory/${id}`);
        console.log("📦 Treatment History:", res.data);
        setTreatmentHistory(res.data);
      } catch (error) {
        console.error("❌ Error fetching treatment history:", error);
      } finally {
        setLoadingTreatment(false);
      }
    };
    fetchTreatmentHistory();
  }, [id]);

  const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    setSelectedPhoto(result.assets[0]);
  }
};

const uploadProfilePhoto = async () => {
  if (!selectedPhoto) {
    Alert.alert("Please select a photo first.");
    return;
  }

  const formData = new FormData();
  formData.append("photo", {
    uri: selectedPhoto.uri,
    type: "image/jpeg",
    name: "profile.jpg",
  } as any);

  try {
    setUploading(true);
    await api.post(`/ClientProfile/uploadphoto/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    Alert.alert("✅ Success", "Profile photo updated!");
    setShowModal(false);
    setSelectedPhoto(null);
    // You can trigger a re-fetch if API returns photo URL
    // fetchProfile();
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    Alert.alert("Error", "Failed to upload profile photo.");
  } finally {
    setUploading(false);
  }
};

  // Fetch package history and format treatments
  useEffect(() => {
    const fetchPackageHistory = async () => {
      try {
        setLoadingPackage(true);
        const res = await api.get(`/Treatment/Treatmentpackages/${id}`);
        console.log("📦 Package History (raw):", JSON.stringify(res.data, null, 2));

        // Format packages: ensure each treatment has a name and a display price
        const formatted = (res.data || []).map((pkg: any) => ({
          ...pkg,
          treatments: (pkg.treatments || []).map((t: any) => ({
            // name fallback to "Treatment #<id>" when 'treatment' is null
            name: t.treatment ?? `Treatment #${t.treatmentId}`,
            // prefer discountedPrice, then price, then regularPrice
            displayPrice:
              t.discountedPrice ?? t.price ?? t.regularPrice ?? null,
            treatmentId: t.treatmentId,
            raw: t, // keep raw if you need other fields later
          })),
        }));

        console.log("📦 Package History (formatted):", JSON.stringify(formatted, null, 2));
        setPackageHistory(formatted);
      } catch (error) {
        console.error("❌ Error fetching package history:", error);
      } finally {
        setLoadingPackage(false);
      }
    };
    fetchPackageHistory();
  }, [id]);

  const handleChange = (key: string, value: string) => {
    setEditableData({ ...editableData, [key]: value });
  };

  //insert data to be sent
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

    try {
      setSaving(true);
      await api.post(`/ClientProfile/clientprofile/update/${customerId}`, payload);
      Alert.alert("✅ Success", "Profile updated successfully!");
      setProfileData(editableData);
      setIsEditing(false);
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      Alert.alert(
        "Error",
        `Failed to update profile: ${error?.response?.data?.message || error.message}`
      );
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
      <View className="w-[95%] bg-white border border-gray-200 p-5 mt-[15%] mx-auto rounded-xl">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-x-4 flex-1">
<TouchableOpacity onPress={() => setShowModal(true)}>
  <Image
    source={
      selectedPhoto
        ? { uri: selectedPhoto.uri }
        : require("../assets/pp.jpg")
    }
    className="w-16 h-16 rounded-full"
  />
</TouchableOpacity>

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

            {/* Consultation History */}
            {expandedSection === section && section === "Consultation History" && (
              <View className="bg-gray-100 rounded-lg p-2">
                {loadingConsultation ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : consultationHistory.length === 0 ? (
                  <Text className="text-gray-500 text-sm">
                    No consultation history found.
                  </Text>
                ) : (
                  <ScrollView horizontal>
                    <View className="flex-col">
                      <View className="flex-row border-b border-gray-400 pb-1 mb-1">
                        <Text className="w-40 font-bold text-sm">Treatment</Text>
                        <Text className="w-32 font-bold text-sm">Payment Status</Text>
                        <Text className="w-40 font-bold text-sm">Transaction Ref</Text>
                        <Text className="w-36 font-bold text-sm">Bill Status</Text>
                        <Text className="w-36 font-bold text-sm">Payment Method</Text>
                      </View>
                      {consultationHistory.map((item) => (
                        <View
                          key={item.id}
                          className="flex-row items-center justify-between py-2 border-b border-gray-300 last:border-b-0 mr-4"
                        >
                          <Text className="w-40 text-sm">{item.departmentName}</Text>
                          <Text className="w-32 text-sm">
                            {item.paymentStatus?.trim() ?? ""}
                          </Text>
                          <Text className="w-40 text-sm">{item.transactionReference}</Text>
                          <Text className="w-36 text-sm">{item.billPaymentStatus}</Text>
                          <Text className="w-36 text-sm">{item.paymentMethod}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Treatment History */}
            {expandedSection === section && section === "Treatment History" && (
              <View className="bg-gray-100 rounded-lg p-2">
                {loadingTreatment ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : treatmentHistory.length === 0 ? (
                  <Text className="text-gray-500 text-sm">
                    No treatment history found.
                  </Text>
                ) : (
                  <ScrollView horizontal>
                    <View className="flex-col">
                      <View className="flex-row border-b border-gray-400 pb-1 mb-1">
                        <Text className="w-40 font-bold text-sm">Treatment</Text>
                        <Text className="w-32 font-bold text-sm">Start Time</Text>
                        <Text className="w-32 font-bold text-sm">End Time</Text>
                        <Text className="w-36 font-bold text-sm">Schedule Status</Text>
                        <Text className="w-36 font-bold text-sm">Payment Method</Text>
                        <Text className="w-36 font-bold text-sm">Payment Status</Text>
                      </View>
                      {treatmentHistory.map((item) => (
                        <View
                          key={item.id}
                          className="flex-row items-center justify-between py-2 border-b border-gray-300 last:border-b-0 mr-4"
                        >
                          <Text className="w-40 text-sm">
                            {item.treatmentName || "Unknown"}
                          </Text>
                          <Text className="w-32 text-sm">{item.startTime}</Text>
                          <Text className="w-32 text-sm">{item.endTime}</Text>
                          <Text className="w-36 text-sm">{item.sheduleStatus}</Text>
                          <Text className="w-36 text-sm">{item.paymentMethod}</Text>
                          <Text className="w-36 text-sm">{item.paymentStatus}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            )}

            {/* Packages History */}
{/* Packages History */}
{/* Packages History */}
{expandedSection === section && section === "Packages History" && (
  <View className="bg-gray-100 rounded-lg p-2">
    {loadingPackage ? (
      <ActivityIndicator size="small" color="#000" />
    ) : packageHistory.length === 0 ? (
      <Text className="text-gray-500 text-sm">
        No package history found.
      </Text>
    ) : (
      <ScrollView horizontal>
        <View className="flex-col">
          {/* Table Header */}
          <View className="flex-row border-b border-gray-400 pb-1 mb-1 bg-gray-200 rounded-md px-1">
            <Text className="w-52 font-bold text-sm text-black">
              Package Name
            </Text>
            <Text className="w-52 font-bold text-sm text-black">
              Treatment
            </Text>
            <Text className="w-28 font-bold text-sm text-black text-center">
              Price (LKR)
            </Text>
            <Text className="w-36 font-bold text-sm text-black text-center">
              Time Duration (min)
            </Text>
            <Text className="w-36 font-bold text-sm text-black text-center">
              Regular Price (LKR)
            </Text>
            <Text className="w-36 font-bold text-sm text-black text-center">
              Discount (%)
            </Text>
            <Text className="w-40 font-bold text-sm text-black text-center">
              Discounted Price (LKR)
            </Text>
          </View>

          {/* Table Body */}
          {packageHistory.map((pkg, pkgIdx) => (
            <View key={pkgIdx}>
              {/* Package Name Row */}
              <View className="flex-row bg-gray-200 rounded-md py-1 px-2 mb-1">
                <Text className="font-semibold text-sm text-black">
                  {pkg.package?.packageName ?? "Unnamed Package"}
                </Text>
              </View>

              {/* Treatment Rows */}
              {pkg.treatments && pkg.treatments.length > 0 ? (
                pkg.treatments.map((t: any, idx: number) => (
                  <View
                    key={idx}
                    className="flex-row items-center border-b border-gray-300 py-2"
                  >
                    <Text className="w-52" />
                    <Text className="w-52 text-sm text-gray-700">
                      {t.raw?.treatment ?? "N/A"}
                    </Text>
                    <Text className="w-28 text-sm text-gray-700 text-center">
                      {t.raw?.price ?? "-"}
                    </Text>
                    <Text className="w-36 text-sm text-gray-700 text-center">
                      {t.raw?.timeDuration ?? "-"}
                    </Text>
                    <Text className="w-36 text-sm text-gray-700 text-center">
                      {t.raw?.regularPrice ?? "-"}
                    </Text>
                    <Text className="w-36 text-sm text-gray-700 text-center">
                      {t.raw?.discountPrecentage ?? "-"}
                    </Text>
                    <Text className="w-40 text-sm text-gray-700 text-center">
                      {t.raw?.discountedPrice ?? "-"}
                    </Text>
                  </View>
                ))
              ) : (
                <View className="flex-row py-1">
                  <Text className="w-full text-sm text-gray-500">
                    No treatments found for this package.
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    )}
  </View>
)}


          </View>
        ))}
      </ScrollView>
      {/* Upload Photo Modal */}
<Modal
  visible={showModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowModal(false)}
>
  <View className="flex-1 justify-center items-center w-[100%] bg-black/50">
    <View className="bg-white rounded-xl w-[90%] h-[50%] p-6">
      <Text className="text-lg text-center font-bold mb-3">Change Profile Picture</Text>

      <TouchableOpacity
  onPress={pickImage}
  activeOpacity={0.7}
  className="self-center mt-10 mb-4"
>
  {selectedPhoto ? (
    <Image
      source={{ uri: selectedPhoto.uri }}
      className="w-[200px] h-[200px] rounded-full"
    />
  ) : (
    <View className="w-[200px] h-[200px] bg-gray-200 rounded-full items-center justify-center">
      <Text className="text-gray-500 text-sm">Tap to choose photo</Text>
    </View>
  )}
</TouchableOpacity>

<View className="flex-row items-center justify-center mt-10">
      <TouchableOpacity
        onPress={uploadProfilePhoto}
        disabled={uploading}
        className="bg-primary rounded-lg px-[10%] py-[3%] mb-2"
      >
        {uploading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-center font-semibold text-white">
            Upload
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setShowModal(false);
          setSelectedPhoto(null);
        }}
        className="bg-secondary rounded-lg px-[10%] py-[3%] mb-2 ml-4"
      >
        <Text className="text-center font-semibold text-black">Cancel</Text>
      </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


      <Navbar />
    </View>
  );
};

export default Profile;
