// StartTreatment.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import Navbar from "../components/Navbar";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useNavigation, RouteProp, useRoute } from "@react-navigation/native";
import api from "../API/api";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ---------- Types ---------- **/
interface ClientProfile {
  id?: string | number;
  fullName: string;
  phone: string;
  appointmentTime?: string;
  treatmentName?: string;
  profilePhotoUrl?: string;
}

interface TreatmentItem {
  id?: string | number;
  tname?: string;
  date?: string;
  remark?: string;
  [k: string]: any;
}
// Add this type for grouped photos
interface GroupedPhotos {
  date: string;
  photos: string[];
}

interface RemarkItem {
  id?: number;
  date: string;
  doctorName: string;
  remark: string;
}

type RootStackParamList = {
  StartTreatment: {
    formData: {
      customerId: string;
      consultationId: number;
      treatmentId: number;
      answers: any;
      photos?: (string | null)[];
    };
  };
  Appointments: {
    customerId: string;
    treatmentId: string;
    fromPage: "StartTreatment";
  };
  ConsentForm: { consultationId: number; customerId: string };
  Profile: { id: string };
  TreatmentConcentform: {
    Name: string;
    customerId: string;
    treatmentId: number;
  };
};

type StartTreatmentRouteProp = RouteProp<RootStackParamList, "StartTreatment">;

/** ---------- Component ---------- **/
const StartTreatment: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<StartTreatmentRouteProp>();
  const { formData } = route.params as {
    formData: {
      customerId: string;
      consultationId: number;
      treatmentId: number;
      answers: any;
    };
  };
  const { customerId, consultationId, treatmentId, answers } = formData;
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [remark, setRemark] = useState("");
  console.log("StartTreatment screen received customerId:", customerId);
  console.log("StartTreatment screen received consultationId:", consultationId);
  console.log("StartTreatment screen received treatmentId:", treatmentId);
  const [afterPhotos, setAfterPhotos] = useState<(string | null)[]>(
    Array(6).fill(null)
  );
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [beforePhotos, setBeforePhotos] = useState<(string | null)[]>(
    Array(6).fill(null)
  );
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [remarks, setRemarks] = useState<RemarkItem[]>([]);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [loadingRemarks, setLoadingRemarks] = useState(true);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [savedTreatmentAppointmentId, setSavedTreatmentAppointmentId] =
    useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [fetchedBeforePhotos, setFetchedBeforePhotos] = useState<
    (string | null)[]
  >([]);
  const [loadingFetchedBeforePhotos, setLoadingFetchedBeforePhotos] =
    useState(false);
  const [blurStates, setBlurStates] = useState<boolean[]>(Array(6).fill(true));
  // After Photos state
  const [fetchedAfterPhotos, setFetchedAfterPhotos] = useState<string[]>([]);
  const [loadingFetchedAfterPhotos, setLoadingFetchedAfterPhotos] =
    useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [beforeBlurStates, setBeforeBlurStates] = useState<boolean[]>(
    Array(6).fill(true)
  );
  const [afterBlurStates, setAfterBlurStates] = useState<boolean[]>(
    Array(6).fill(true)
  );
  const [showMedicalReportsModal, setShowMedicalReportsModal] = useState(false);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [groupedBeforePhotos, setGroupedBeforePhotos] = useState< GroupedPhotos[]>([]);
  const [groupedAfterPhotos, setGroupedAfterPhotos] = useState<GroupedPhotos[]>( []);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // Large image preview
  const pickBeforePhoto = async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      return Alert.alert(
        "Permission required",
        "Camera permission is required!"
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const updated = [...beforePhotos];
      updated[index] = result.assets[0].uri;
      setBeforePhotos(updated);
    }
  };

  //Get the Doctor name
  useEffect(() => {
    const loadDoctorName = async () => {
      try {
        const storedDoctorName = await AsyncStorage.getItem(
          "treatment_doctorName"
        );
        if (storedDoctorName) {
          setDoctorName(storedDoctorName);
          console.log(
            "✅ Loaded doctorName from AsyncStorage:",
            storedDoctorName
          );
        } else {
          console.log("⚠️ No doctorName found in AsyncStorage");
        }
      } catch (error) {
        console.log("❌ Error reading doctorName:", error);
      }
    };

    loadDoctorName();
  }, []);

  useEffect(() => {
    const loadAppointmentId = async () => {
      try {
        const id = await AsyncStorage.getItem("treatmentAppointmentId");

        console.log("✅ Loaded treatmentAppointmentId from AsyncStorage:", id);

        if (id) {
          setSavedTreatmentAppointmentId(Number(id));
        } else {
          console.log("⚠️ No treatmentAppointmentId saved in AsyncStorage");
        }
      } catch (error) {
        console.log("❌ Error reading treatmentAppointmentId:", error);
      }
    };

    loadAppointmentId();
  }, []);

  const handleUploadBeforePhotos = async () => {
    console.log("🚀 handleUploadBeforePhotos called");
    setUploadingBefore(true);

    try {
      if (!savedTreatmentAppointmentId) {
        Alert.alert("Error", "Treatment appointment ID not found.");
        setUploadingBefore(false);
        return;
      }

      console.log(
        "🟢 Using savedTreatmentAppointmentId:",
        savedTreatmentAppointmentId
      );

      // Build FormData
      const formData = new FormData();
      formData.append("customerId", String(customerId));
      formData.append("treatmetId", String(savedTreatmentAppointmentId)); // ✅ use the AsyncStorage value
      console.log("FormData:", formData);
      beforePhotos.forEach((uri, idx) => {
        if (uri) {
          const fileUri =
            Platform.OS === "ios" ? uri.replace("file://", "") : uri;
          formData.append("photos", {
            uri: fileUri,
            type: "image/jpeg",
            name: `before_${idx}.jpg`,
          } as any);
        }
      });

      // Debug
      for (let pair of formData.entries()) {
        console.log("🧩 FormData entry:", pair[0], pair[1]);
      }

      // Upload
      const response = await api.post(
        "/Treatment/Treatmentphoto/Before/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("✅ Before photo upload successful:", response.data);
      Alert.alert("Success", "Before photos uploaded!");

      navigation.navigate("Appoinments", {
        customerId,
        fromPage: "StartTreatment",
        treatmentId: savedTreatmentAppointmentId,
      });
    } catch (err: any) {
      console.error("❌ Upload failed:", err.response?.data || err.message);
      Alert.alert(
        "Upload failed",
        err.response?.data?.message || "Failed to upload before photos."
      );
    } finally {
      setUploadingBefore(false);
    }
  };

  /** ---------- Load roleId from AsyncStorage ---------- **/
  useEffect(() => {
    const loadRoleId = async () => {
      try {
        const storedRoleId = await AsyncStorage.getItem("roleId");
        if (storedRoleId) {
          setRoleId(Number(storedRoleId));
          console.log("✅ Loaded roleId:", storedRoleId);
        } else {
          console.log("⚠️ No roleId found in AsyncStorage");
        }
      } catch (error) {
        console.log("❌ Error reading roleId:", error);
      }
    };

    loadRoleId();
  }, []);

  /** ---------- Fetch Before Photos Grouped by Date ---------- **/
  useEffect(() => {
    const fetchBeforePhotos = async () => {
      if (!savedTreatmentAppointmentId || !(roleId === 17 || roleId === 19))
        return;

      try {
        setLoadingFetchedBeforePhotos(true);
        console.log(
          `📸 Fetching before photos for treatmentId: ${savedTreatmentAppointmentId}`
        );
        const res = await api.get(
          `/ConsultationPhoto/Treatment/Before/${savedTreatmentAppointmentId}`
        );
        console.log("✅ Before photos response:", res.data);

        if (!Array.isArray(res.data)) {
          setGroupedBeforePhotos([]);
          return;
        }

        // Group photos by date
        const photosByDate: { [key: string]: any[] } = {};
        res.data.forEach((photo: any) => {
          const date = photo.date || "Unknown Date";
          if (!photosByDate[date]) {
            photosByDate[date] = [];
          }
          photosByDate[date].push(photo);
        });

        // Sort dates (newest first) and create grouped array
        const grouped: GroupedPhotos[] = Object.keys(photosByDate)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          .map((date) => ({
            date,
            photos: photosByDate[date]
              .map((p: any) =>
                p.photoLocation
                  ? `${baseUrl}/${p.photoLocation.replace(/\\/g, "/").replace(/^\//, "")}`
                  : null
              )
              .filter((url): url is string => typeof url === "string"), // <-- FIX
          }));

        console.log("🗓️ Grouped before photos by date:", grouped);
        setGroupedBeforePhotos(grouped);
      } catch (err: any) {
        console.error(
          "❌ Error fetching before photos:",
          err.response?.data || err.message
        );
      } finally {
        setLoadingFetchedBeforePhotos(false);
      }
    };

    fetchBeforePhotos();
  }, [roleId, savedTreatmentAppointmentId]);

  /** ---------- Fetch After Photos if role is 17 or 19 for doctor or PA ---------- **/
  useEffect(() => {
    const fetchAfterPhotos = async () => {
      if (!savedTreatmentAppointmentId || !(roleId === 17 || roleId === 19))
        return;

      try {
        setLoadingFetchedAfterPhotos(true);
        console.log(
          `📸 Fetching after photos for treatmentId: ${savedTreatmentAppointmentId}`
        );

        const res = await api.get(
          `/ConsultationPhoto/Treatment/After/${savedTreatmentAppointmentId}`
        );
        console.log("✅ After photos response:", res.data);

        const sortedData = Array.isArray(res.data)
          ? [...res.data].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          : [];

        // Filter only valid string URLs (remove null safely)
        const photoUrls: string[] = sortedData
          .map((p: any) =>
            p.photoLocation
              ? `${baseUrl}/${p.photoLocation.replace(/\\/g, "/").replace(/^\//, "")}`
              : null
          )
          .filter((url): url is string => typeof url === "string");

        console.log("🖼️ Sorted after photo URLs:", photoUrls);
        setFetchedAfterPhotos(photoUrls);
      } catch (err: any) {
        console.error(
          "❌ Error fetching after photos:",
          err.response?.data || err.message
        );
      } finally {
        setLoadingFetchedAfterPhotos(false);
      }
    };

    fetchAfterPhotos();
  }, [roleId, savedTreatmentAppointmentId]);

  // 🖼️ Safely build the correct image URL
  const baseUrl = "https://chrimgtapp.xenosyslab.com";
  let finalUrl = null;

  /** ---------- Fetch client ---------- **/
  useEffect(() => {
    const fetchClient = async () => {
      setLoadingClient(true);
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${customerId}`);
        const data = res.data;
        console.log("Client Profile Response:", res.data);
        setClient({
          id: data.id,
          fullName:
            `${data.salutation ?? ""} ${data.fname ?? ""} ${data.lname ?? ""}`.trim() ||
            "Unknown",
          phone: data.mobileNo ?? "N/A",
          appointmentTime: data.appointmentTime,
          treatmentName: data.treatmentName,
          profilePhotoUrl: data.profilePic,
        });
      } catch (err) {
        console.error("Failed to fetch client profile:", err);
        Alert.alert("Error", "Could not load client profile.");
      } finally {
        setLoadingClient(false);
      }
    };
    fetchClient();
  }, [customerId]);

  //Join the base url with the profile photo url
  const fullImageUrl = client?.profilePhotoUrl
    ? `${baseUrl}/${client.profilePhotoUrl
        .replace(/\\/g, "/") // ✅ Convert backslashes to slashes
        .replace(/^\//, "") // ✅ Remove leading slash
        .trim()}` // ✅ Remove spaces
    : null;

  console.log("Full Image URL:", fullImageUrl);

  /** ---------- Fetch treatments & remarks ---------- **/
  useEffect(() => {
    const fetchTreatments = async () => {
      setLoadingTreatments(true);
      try {
        const res = await api.get(`/Treatment/${customerId}`);
        console.log("Fetched treatments response:", res.data);
        setTreatments(res.data ?? []);
      } catch (err) {
        console.error("Error fetching treatments:", err);
      } finally {
        setLoadingTreatments(false);
      }
    };

    fetchTreatments(); // ✅ Call the function here
  }, [consultationId]);

  /** ---------- Timer logic ---------- **/
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (showTimerModal) {
      interval = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showTimerModal]);
  //Timer time format for h:M:S
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /** ---------- Camera ---------- **/
  const pickAfterPhoto = async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted")
      return Alert.alert(
        "Permission required",
        "Camera permission is required!"
      );

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const updated = [...afterPhotos];
      updated[index] = result.assets[0].uri;
      setAfterPhotos(updated);
    }
  };

  /** ---------- Upload after photos ---------- **/
  const handleUploadAfterPhotos = async () => {
    setUploadingAfter(true);

    try {
      console.log("🚀 handleUploadAfterPhotos called");
      console.log("CustomerId:", customerId);
      console.log("TreatmentId:", treatmentId);
      console.log("After Photos Array:", afterPhotos);

      const formData = new FormData();
      formData.append("customerId", customerId); // ✅ lowercase, matches backend
      formData.append("treatmetId", String(savedTreatmentAppointmentId)); // ✅ matches backend typo

      afterPhotos.forEach((uri, idx) => {
        if (uri) {
          const fileUri =
            Platform.OS === "ios" ? uri.replace("file://", "") : uri;
          const fileObj = {
            uri: fileUri,
            type: "image/jpeg",
            name: `after_${idx}.jpg`,
          };
          console.log(`📸 Adding photo #${idx + 1}:`, fileObj);
          formData.append("photos", fileObj as any); // ✅ matches backend
        } else {
          console.log(
            `⚠️ Skipped photo #${idx + 1} because URI is invalid:`,
            uri
          );
        }
      });

      console.log(
        "📡 Sending POST request to /Treatment/Treatmentphoto-upload"
      );
      const response = await api.post(
        "/Treatment/Treatmentphoto-upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("✅ Upload successful:", response.data);
      Alert.alert("Success", "After photos uploaded!");
    } catch (err: any) {
      console.error("❌ Upload failed:", err.response?.data || err.message);
      Alert.alert("Upload failed", "Failed to upload after photos.");
    } finally {
      setUploadingAfter(false);
      console.log("🔚 handleUploadAfterPhotos finished");
    }
  };

  //Fetch and display the medical reports
  const fetchMedicalReports = async () => {
    setLoadingReports(true);
    try {
      const res = await api.get(`/PatientHistory/PatientHistory/${customerId}`);
      console.log("🧾 Medical Reports Response:", res.data);
      setMedicalReports(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error("❌ Error fetching medical reports:", err);
      Alert.alert("Error", "Failed to load medical reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  const openMedicalReports = async () => {
    await fetchMedicalReports();
    setShowMedicalReportsModal(true);
  };

  // Group medical reports by prescribeDate
  const groupedReports = medicalReports.reduce((acc, report) => {
    const date = report.prescribeDate || "Unknown";

    if (!acc[date]) acc[date] = [];
    acc[date].push(report);

    return acc;
  }, {});

  //See blured image
  const peekImage = (uri: string, idx: number) => {
    setPreviewImage(uri); // show full-size modal
    const updated = [...afterBlurStates];
    updated[idx] = false; // remove blur on grid thumbnail
    setAfterBlurStates(updated);

    // existing timer – re-blur thumbnail after 1.5 s
    setTimeout(() => {
      const reset = [...afterBlurStates];
      reset[idx] = true;
      setAfterBlurStates(reset);
      setPreviewImage(null); // hide full-size modal
    }, 1500);
  };

  /** ---------- Header content ---------- **/
  const renderHeaderContent = () => {
    if (loadingClient) return <ActivityIndicator size="small" color="#000" />;
    if (!client)
      return (
        <Text className="text-xs text-red-500">No client data available</Text>
      );

    return (
      <>
        <Image
          source={
            fullImageUrl ? { uri: fullImageUrl } : require("../assets/pp.jpg")
          }
          className="w-16 h-16 rounded-full"
        />
        <View className="flex-col ml-2">
          <Text className="text-black text-sm font-bold">
            {client.fullName}
          </Text>
          {doctorName && (
            <Text className="font-medium text-xs text-gray-700">
              Dr. {doctorName}
            </Text>
          )}
          <Text className="font-medium text-xs">{client.phone}</Text>
          {client.appointmentTime && (
            <Text className="font-medium text-xs">
              {client.appointmentTime}
            </Text>
          )}
          {client.treatmentName && (
            <Text className="font-medium text-xs">
              Treatment: {client.treatmentName}
            </Text>
          )}
        </View>
        <View className="flex-col gap-y-2 ml-auto">
          <TouchableOpacity
            activeOpacity={1}
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={() => {
              navigation.navigate("Profile", { id: String(customerId) }); // ✅ Navigate to Profile
            }}
          >
            <Text className="text-white text-xs font-bold text-center">
              View Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={openMedicalReports}
          >
            <Text className="text-white text-xs font-bold text-center">
              View Medical Reports
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Section */}
      <View className="w-[95%] h-[15%] bg-secondary p-5 mt-[15%] mx-auto flex-row items-center rounded-xl space-x-4">
        {renderHeaderContent()}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 px-4 mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Treatment Plan */}

        {/* Before Photos */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <Text className="font-bold text-sm text-center mb-2">
            {roleId === 17 || roleId === 19
              ? "Before Treatment Photos"
              : "Upload Photos Before Treatment"}
          </Text>
          {roleId === 17 || roleId === 19 ? (
            // VIEW MODE - Grouped by Date
            <View>
              <Text className="text-sm text-yellow-800 mb-[5%] text-center font-semibold">
                ⚠️ You don't have permission to upload photos
              </Text>

              {loadingFetchedBeforePhotos ? (
                <ActivityIndicator size="small" color="#000" className="my-4" />
              ) : groupedBeforePhotos.length > 0 ? (
                <ScrollView className="mb-4">
                  {groupedBeforePhotos.map((group, groupIdx) => (
                    <View key={groupIdx} className="mb-6">
                      {/* Date Header */}
                      <View className="bg-primary/10 px-3 py-2 rounded-lg mb-3">
                        <Text className="text-sm font-bold text-primary text-center">
                          📅{" "}
                          {new Date(group.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Text>
                      </View>

                      {/* Photos Grid */}
                      <View className="flex-row flex-wrap justify-between">
                        {group.photos.map((uri, photoIdx) => (
                          <TouchableOpacity
                            key={photoIdx}
                            activeOpacity={1}
                            onLongPress={() => uri && peekImage(uri, photoIdx)}
                            className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300 overflow-hidden"
                          >
                            <View className="w-full h-full">
                              <Image
                                source={{ uri }}
                                className="w-full h-full rounded-md absolute"
                                resizeMode="cover"
                              />
                              {beforeBlurStates[photoIdx] &&
                                (Platform.OS === "ios" ? (
                                  <BlurView
                                    intensity={125}
                                    tint="dark"
                                    className="absolute top-0 left-0 right-0 bottom-0 rounded-md"
                                  />
                                ) : (
                                  <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/30 rounded-md" />
                                ))}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <Text className="text-sm text-yellow-800 text-center font-medium">
                    No photos found
                  </Text>
                </View>
              )}

              {/* Next Button - ONLY in VIEW mode */}
              <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-full items-center mt-2"
                onPress={() =>
                  navigation.navigate("TreatmentAfterPhoto", {
                    formData: {
                      customerId: customerId,
                      treatmentId: savedTreatmentAppointmentId,
                    },
                  })
                }
              >
                <Text className="text-white font-bold">Next</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // UPLOAD MODE
            <View>
              <View className="flex-row flex-wrap justify-between mb-3">
                {beforePhotos.map((uri, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={1}
                    onPress={() => pickBeforePhoto(idx)}
                    onLongPress={() => uri && peekImage(uri, idx)}
                    className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300 overflow-hidden"
                  >
                    {uri ? (
                      <View className="w-full h-full">
                        <Image
                          source={{ uri }}
                          className="w-full h-full rounded-md absolute"
                          resizeMode="cover"
                        />
                        {Platform.OS === "ios" ? (
                          <BlurView
                            intensity={125}
                            tint="dark"
                            className="absolute top-0 left-0 right-0 bottom-0 rounded-md"
                          />
                        ) : (
                          <View className="absolute top-0 left-0 right-0 bottom-0 bg-black/30 rounded-md" />
                        )}
                      </View>
                    ) : (
                      <Camera size={20} color="#666" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Upload Button - ONLY in UPLOAD mode */}
              <TouchableOpacity
                className="bg-primary px-6 py-3 rounded-full items-center mt-2"
                onPress={handleUploadBeforePhotos}
                disabled={uploadingBefore}
              >
                <Text className="text-white font-bold">
                  {uploadingBefore ? "Uploading..." : "Upload Photos"}
                </Text>
              </TouchableOpacity>

              {/* ❌ REMOVED - Next Button should NOT be in upload mode */}
            </View>
          )}
        </View>
        {/* ---------- Medical Reports Modal ---------- */}
        <Modal
          visible={showMedicalReportsModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowMedicalReportsModal(false)}
        >
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="bg-white w-[90%] max-h-[85%] rounded-2xl p-5">
              {/* Title */}
              <Text className="text-2xl font-bold text-center mb-5">
                Prescriptions
              </Text>

              {loadingReports ? (
                <ActivityIndicator size="large" color="#000" />
              ) : medicalReports.length > 0 ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.keys(groupedReports).map((date, index) => (
                    <View key={index} className="mb-6">
                      {/* DATE PILL */}
                      <View className="bg-[#DFF6FF] self-start px-5 py-1 rounded-full mb-2">
                        <Text className="text-[#2C73A7] font-semibold">
                          {date}
                        </Text>
                      </View>

                      {/* TABLE HEADER */}
                      <View className="bg-gray-200 flex-row justify-between px-3 py-3 rounded-t-lg">
                        <Text className="font-semibold w-[24%]">Product</Text>
                        <Text className="font-semibold w-[24%]">
                          How to use
                        </Text>
                        <Text className="font-semibold w-[20%]">Duration</Text>
                        <Text className="font-semibold w-[16%]">Code</Text>
                        <Text className="font-semibold w-[16%] text-right">
                          Status
                        </Text>
                      </View>

                      {/* TABLE ROWS — MULTIPLE IF SAME DATE */}
                      {groupedReports[date].map((item: any, i: any) => (
                        <View
                          key={i}
                          className={`bg-gray-100 flex-row justify-between gap-x-[5%] px-3 py-3 
        ${i === groupedReports[date].length - 1 ? "rounded-b-lg" : ""}`}
                        >
                          <Text className="w-[24%]">{item.productName}</Text>
                          <Text className="w-[24%]">{item.howToUse}</Text>
                          <Text className="w-[20%]">{item.duration} days</Text>
                          <Text className="w-[16%]">{item.productCode}</Text>
                          <Text className="w-[16%] text-right">
                            {item.entryStatus}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text className="text-sm text-gray-500 text-center mt-4">
                  No medical reports found.
                </Text>
              )}

              {/* CLOSE BUTTON */}
              <TouchableOpacity
                className="bg-[#006D8F] py-3 rounded-full mt-6 items-center"
                onPress={() => setShowMedicalReportsModal(false)}
              >
                <Text className="text-white text-lg font-bold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* ----------------- Full-size preview modal ----------------- */}
        <Modal
          visible={!!previewImage}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View className="flex-1 bg-black/90 justify-center items-center">
            <Image
              source={{ uri: previewImage! }}
              className="w-[90%] h-[70%] rounded-lg"
              resizeMode="contain"
            />
          </View>
        </Modal>
      </ScrollView>
      <Navbar />
    </View>
  );
};

export default StartTreatment;
