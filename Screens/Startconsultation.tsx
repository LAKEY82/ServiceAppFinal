import React, { useEffect, useState } from "react";
import {
  View,
  Modal,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import Navbar from "../components/Navbar";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import api from "../API/api";
import { BlurView } from "expo-blur";
import { Pressable } from "react-native";

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

type RootStackParamList = {
  Startconsultation: {
    customerId: string;
    consultationId: number;
    consultationAppointmentId?: number;
  };
  Profile: { id: string };
};

type StartConsultationRouteProp = RouteProp<
  RootStackParamList,
  "Startconsultation"
>;

const baseUrl = "https://chrimgtapp.xenosyslab.com";

/** ---------- Photo Box ---------- **/
const PhotoBox = ({
  uri,
  onPress,
  onLongPress,
}: {
  uri?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      className="w-[30%] h-24 bg-white mb-3 rounded-md border border-gray-300 overflow-hidden"
    >
      {uri ? (
        <View className="w-full h-full">
          {/* Image */}
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* Blur overlay */}
          <BlurView
            intensity={80}
            tint="dark"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            }}
          />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Camera size={20} color="#666" />
        </View>
      )}
    </Pressable>
  );
};


/** ---------- Component ---------- **/

const Startconsultation: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<StartConsultationRouteProp>();

  const customerId = route.params?.customerId;
  const consultationAppointmentId =
    route.params?.consultationAppointmentId ??
    route.params?.consultationId;

  /** ---------- State ---------- **/
  const [photos, setPhotos] = useState<(string | null)[]>(Array(6).fill(null));
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingTreatments, setLoadingTreatments] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [oldBeforePhotos, setOldBeforePhotos] = useState<string[]>([]);
  const [loadingOldPhotos, setLoadingOldPhotos] = useState(true);

  const [showMedicalReportsModal, setShowMedicalReportsModal] = useState(false);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
const [previewImage, setPreviewImage] = useState<string | null>(null);


  /** ---------- Fetch Client ---------- **/
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await api.get(
          `/ClientProfile/clientprofile/${customerId}`
        );
        const data = res.data;

        setClient({
          id: data.id,
          fullName: `${data.salutation ?? ""} ${data.fname ?? ""} ${
            data.lname ?? ""
          }`.trim(),
          phone: data.mobileNo ?? "N/A",
          appointmentTime: data.appointmentTime,
          treatmentName: data.treatmentName,
          profilePhotoUrl: data.profilePic,
        });
      } catch {
        Alert.alert("Error", "Could not load client profile");
      } finally {
        setLoadingClient(false);
      }
    };

    if (customerId) fetchClient();
  }, [customerId]);

  /** ---------- Fetch Treatments ---------- **/
  useEffect(() => {
    if (!customerId) {
      setLoadingTreatments(false);
      return;
    }

    const fetchTreatments = async () => {
      setLoadingTreatments(true);
      try {
        const res = await api.get<TreatmentItem[]>(
          `/Treatment/${customerId}`
        );
        setTreatments(res.data ?? []);
      } catch (err) {
        console.error("Failed to fetch treatments:", err);
      } finally {
        setLoadingTreatments(false);
      }
    };

    fetchTreatments();
  }, [customerId]);

  /** ---------- Fetch Old Before Photos ---------- **/
  useEffect(() => {
    if (!consultationAppointmentId) {
      setLoadingOldPhotos(false);
      return;
    }

    const fetchOldPhotos = async () => {
      try {
        const res = await api.get(
          `/ConsultationPhoto/consultation/Before/${consultationAppointmentId}`
        );

        const list = Array.isArray(res.data) ? res.data : [];

        const urls = list.map(
          (p: any) =>
            `${baseUrl}/${p.photoLocation
              ?.replace(/\\/g, "/")
              ?.replace(/^\//, "")}`
        );

        setOldBeforePhotos(urls);
      } catch {
        setOldBeforePhotos([]);
      } finally {
        setLoadingOldPhotos(false);
      }
    };

    fetchOldPhotos();
  }, [consultationAppointmentId]);

  /** ---------- Medical Reports ---------- **/
  const fetchMedicalReports = async () => {
    setLoadingReports(true);
    try {
      const res = await api.get(
        `/PatientHistory/PatientHistory/${customerId}`
      );
      setMedicalReports(
        Array.isArray(res.data) ? res.data : [res.data]
      );
    } catch {
      Alert.alert("Error", "Failed to load medical reports");
    } finally {
      setLoadingReports(false);
    }
  };

  const openMedicalReports = async () => {
    await fetchMedicalReports();
    setShowMedicalReportsModal(true);
  };

  /** ---------- Camera ---------- **/
  const openCamera = async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const updated = [...photos];
      updated[index] = result.assets[0].uri;
      setPhotos(updated);
    }
  };

  /** ---------- Upload ---------- **/
  const handleProceedToTreatment = async () => {
    if (!customerId || !consultationAppointmentId) {
      Alert.alert("Missing Data");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("customerId", String(customerId));
      formData.append(
        "consultationId",
        String(consultationAppointmentId)
      );

      photos.forEach((photo, idx) => {
        if (photo) {
          formData.append("photos", {
            uri:
              Platform.OS === "ios"
                ? photo.replace("file://", "")
                : photo,
            name: `photo_${idx + 1}.jpg`,
            type: "image/jpeg",
          } as any);
        }
      });

      await api.post("/ConsultationPhoto/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Success", "Photos uploaded successfully");
      navigation.navigate("Dashboard");
    } catch {
      Alert.alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const AutoClosePreview: React.FC<{ duration: number; onClose: () => void }> = ({
  duration,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return null;
};
  /** ---------- Group Medical Reports by Date ---------- **/

  const groupedReports: Record<string, any[]> = medicalReports.reduce(
  (acc, report) => {
    const date = report.prescribeDate || "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(report);
    return acc;
  },
  {} as Record<string, any[]>
);

  const fullImageUrl = client?.profilePhotoUrl
    ? `${baseUrl}/${client.profilePhotoUrl
        .replace(/\\/g, "/")
        .replace(/^\//, "")}`
    : null;

  /** ---------- Header Render ---------- **/
  const renderHeaderContent = () => {
    if (loadingClient) return <ActivityIndicator />;

    return (
      <>
        <Image
          source={
            fullImageUrl
              ? { uri: fullImageUrl }
              : require("../assets/pp.jpg")
          }
          className="w-16 h-16 rounded-full"
        />
        <View className="ml-3">
          <Text className="font-bold text-sm">{client?.fullName}</Text>
          <Text className="text-xs">{client?.phone}</Text>
          <Text className="text-xs">{client?.appointmentTime}</Text>
          <Text className="text-xs">
            Treatment: {client?.treatmentName}
          </Text>
        </View>
      </>
    );
  };

  /** ---------- Render ---------- **/
  return (
    <View className="flex-1 bg-white">
      {/* Top Section */}
      <View className="w-[95%] h-[15%] bg-secondary p-5 mt-[15%] mx-auto flex-row items-center rounded-xl">
        {renderHeaderContent()}

        <View className="flex-col gap-y-2 ml-auto">
          <TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center"
            onPress={() =>
              navigation.navigate("Profile", {
                id: String(customerId),
              })
            }
          >
            <Text className="text-white text-xs font-bold">
              View Profile
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center"
            onPress={openMedicalReports}
          >
            <Text className="text-white text-xs font-bold">
              View Medical Reports
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <ScrollView
        className="px-4 mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {!loadingOldPhotos && oldBeforePhotos.length > 0 && (
          <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
            <Text className="font-bold text-sm mb-2">
              Previous Before Photos
            </Text>
            <View className="flex-row flex-wrap justify-start gap-2">
              {oldBeforePhotos.map((uri, idx) => (
  <PhotoBox
    key={idx}
    uri={uri}
    onLongPress={() => {
      setPreviewImage(uri);
      setPreviewVisible(true);
    }}
  />
))}

            </View>
          </View>
        )}

        {!loadingOldPhotos && oldBeforePhotos.length === 0 && (
          <>
            <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
              <Text className="font-bold text-sm mb-2">
                Before Photo
              </Text>
              <View className="flex-row flex-wrap justify-start gap-2">
                {photos.map((p, idx) => (
                  <PhotoBox
                    key={idx}
                    uri={p}
                    onPress={() => openCamera(idx)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              className="bg-primary rounded-full py-4 items-center"
              onPress={handleProceedToTreatment}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">
                  Upload Photos
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

<Modal
  visible={previewVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setPreviewVisible(false)}
>
  <View className="flex-1 bg-black justify-center items-center">
    
    {/* Full-size Image */}
    {previewImage && (
      <Image
        source={{ uri: previewImage }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="contain"
      />
    )}

    {/* Auto-close effect */}
    {previewVisible && (
      <AutoClosePreview duration={3000} onClose={() => setPreviewVisible(false)} />
    )}

    {/* Close button */}
    <TouchableOpacity
      onPress={() => setPreviewVisible(false)}
      className="absolute top-12 right-6 bg-black/60 px-4 py-2 rounded-full"
    >
      <Text className="text-white font-bold">Close</Text>
    </TouchableOpacity>

  </View>
</Modal>


      <Navbar />
    </View>
  );
};

export default Startconsultation;
