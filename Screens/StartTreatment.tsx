// StartTreatment.tsx
import React, { useEffect, useState,useRef  } from 'react'
import {View,Text,Image,TextInput,TouchableOpacity,ScrollView,Modal,Platform,Alert,ActivityIndicator,} from 'react-native'
import Navbar from '../components/Navbar'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native'
import api from '../API/api'
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** ---------- Types ---------- **/
interface ClientProfile {
  id?: string | number
  fullName: string
  phone: string
  appointmentTime?: string
  treatmentName?: string
  profilePhotoUrl?: string
}

interface TreatmentItem {
  id?: string | number
  tname?: string
  date?: string
  remark?: string
  [k: string]: any
}

interface RemarkItem {
  id?: number
  date: string
  doctorName: string
  remark: string
}

type RootStackParamList = {
    StartTreatment: { 
    formData: { customerId: string; consultationId: number; treatmentId: number; answers: any; photos?: (string | null)[] } 
  }
  Appointments: { customerId: string;  treatmentId:string,fromPage: "StartTreatment", }
  ConsentForm: { consultationId: number; customerId: string }
  Profile: { id: string }
  TreatmentConcentform: { Name:string,customerId: string; treatmentId: number }
}

type StartTreatmentRouteProp = RouteProp<RootStackParamList, 'StartTreatment'>

/** ---------- Component ---------- **/
const StartTreatment: React.FC = () => {
  const navigation = useNavigation<any>()
  const route = useRoute<StartTreatmentRouteProp>()
const { formData } = route.params as { formData: { customerId: string; consultationId: number; treatmentId: number; answers: any } };
const { customerId, consultationId, treatmentId, answers } = formData;
const [showRatingModal, setShowRatingModal] = useState(false)
const [rating, setRating] = useState(0)
const [remark, setRemark] = useState('')
console.log("StartTreatment screen received customerId:", customerId);
console.log("StartTreatment screen received consultationId:", consultationId);
console.log("StartTreatment screen received treatmentId:", treatmentId);
  const [afterPhotos, setAfterPhotos] = useState<(string | null)[]>(Array(6).fill(null))
  const [showTimerModal, setShowTimerModal] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [uploadingAfter, setUploadingAfter] = useState(false)
 const [beforePhotos, setBeforePhotos] = useState<(string | null)[]>(Array(6).fill(null))
  const [treatments, setTreatments] = useState<TreatmentItem[]>([])
  const [remarks, setRemarks] = useState<RemarkItem[]>([])
  const [loadingTreatments, setLoadingTreatments] = useState(true)
  const [loadingRemarks, setLoadingRemarks] = useState(true)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [loadingClient, setLoadingClient] = useState(true)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [savedTreatmentAppointmentId, setSavedTreatmentAppointmentId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
const [fetchedBeforePhotos, setFetchedBeforePhotos] = useState<(string | null)[]>([]);
const [loadingFetchedBeforePhotos, setLoadingFetchedBeforePhotos] = useState(false);
const [blurStates, setBlurStates] = useState<boolean[]>(Array(6).fill(true));
// After Photos state
const [fetchedAfterPhotos, setFetchedAfterPhotos] = useState<string[]>([]);
const [loadingFetchedAfterPhotos, setLoadingFetchedAfterPhotos] = useState(false);

const [beforeBlurStates, setBeforeBlurStates] = useState<boolean[]>(Array(6).fill(true));
const [afterBlurStates, setAfterBlurStates] = useState<boolean[]>(Array(6).fill(true));

  const pickBeforePhoto = async (index: number) => {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (permission.status !== 'granted') {
    return Alert.alert('Permission required', 'Camera permission is required!')
  }

  const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
  if (!result.canceled && result.assets && result.assets.length > 0) {
    const updated = [...beforePhotos]
    updated[index] = result.assets[0].uri
    setBeforePhotos(updated)
  }
}

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

    console.log("🟢 Using savedTreatmentAppointmentId:", savedTreatmentAppointmentId);

    // Build FormData
    const formData = new FormData();
    formData.append("customerId", String(customerId));
    formData.append("treatmetId", String(savedTreatmentAppointmentId)); // ✅ use the AsyncStorage value
    console.log("FormData:", formData);
    beforePhotos.forEach((uri, idx) => {
      if (uri) {
        const fileUri = Platform.OS === "ios" ? uri.replace("file://", "") : uri;
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

    navigation.navigate("Appoinments", { customerId, fromPage: "StartTreatment", treatmentId: savedTreatmentAppointmentId });
  } catch (err: any) {
    console.error("❌ Upload failed:", err.response?.data || err.message);
    Alert.alert("Upload failed", err.response?.data?.message || "Failed to upload before photos.");
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

/** ---------- Fetch Before Photos if role is 26 or 28 ---------- **/
/** ---------- Fetch Before Photos if role is 26 or 28 ---------- **/
useEffect(() => {
  const fetchBeforePhotos = async () => {
    if (!savedTreatmentAppointmentId || !(roleId === 26 || roleId === 28)) return;

    try {
      setLoadingFetchedBeforePhotos(true);
      console.log(`📸 Fetching before photos for treatmentId: ${savedTreatmentAppointmentId}`);
      const res = await api.get(`/ConsultationPhoto/Treatment/Before/${savedTreatmentAppointmentId}`);
      console.log("✅ Before photos response:", res.data);

      const sortedData = Array.isArray(res.data)
        ? [...res.data].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() // newest first
          )
        : [];

      const photoUrls = sortedData
        .map((p: any) =>
          p.photoLocation
            ? `${baseUrl}/${p.photoLocation.replace(/\\/g, "/").replace(/^\//, "")}`
            : null
        )
        .filter(Boolean);

      console.log("🖼️ Sorted before photo URLs:", photoUrls);
      setFetchedBeforePhotos(photoUrls);
    } catch (err: any) {
      console.error("❌ Error fetching before photos:", err.response?.data || err.message);
    } finally {
      setLoadingFetchedBeforePhotos(false);
    }
  };

  fetchBeforePhotos();
}, [roleId, savedTreatmentAppointmentId]);

/** ---------- Fetch After Photos if role is 26 or 28 ---------- **/
useEffect(() => {
  const fetchAfterPhotos = async () => {
    if (!savedTreatmentAppointmentId || !(roleId === 26 || roleId === 28)) return;

    try {
      setLoadingFetchedAfterPhotos(true);
      console.log(`📸 Fetching after photos for treatmentId: ${savedTreatmentAppointmentId}`);

      const res = await api.get(`/ConsultationPhoto/Treatment/After/${savedTreatmentAppointmentId}`);
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
      console.error("❌ Error fetching after photos:", err.response?.data || err.message);
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
      setLoadingClient(true)
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${customerId}`)
        const data = res.data
        console.log("Client Profile Response:", res.data)
        setClient({
          id: data.id,
          fullName: `${data.salutation ?? ''} ${data.fname ?? ''} ${data.lname ?? ''}`.trim() || 'Unknown',
          phone: data.mobileNo ?? 'N/A',
          appointmentTime: data.appointmentTime,
          treatmentName: data.treatmentName,
          profilePhotoUrl: data.profilePic,
        })
      } catch (err) {
        console.error('Failed to fetch client profile:', err)
        Alert.alert('Error', 'Could not load client profile.')
      } finally {
        setLoadingClient(false)
      }
    }
    fetchClient()
  }, [customerId])

  //Join the base url with the profile photo url
  const fullImageUrl = client?.profilePhotoUrl
  ? `${baseUrl}/${client.profilePhotoUrl
      .replace(/\\/g, "/")            // ✅ Convert backslashes to slashes
      .replace(/^\//, "")             // ✅ Remove leading slash
      .trim()}`                       // ✅ Remove spaces
  : null;

console.log("Full Image URL:", fullImageUrl);


  /** ---------- Fetch treatments & remarks ---------- **/
  useEffect(() => {
  const fetchTreatments = async () => {
    setLoadingTreatments(true)
    try {
      const res = await api.get(`/Treatment/${customerId}`)
      console.log('Fetched treatments response:', res.data)
      setTreatments(res.data ?? [])
    } catch (err) {
      console.error('Error fetching treatments:', err)
    } finally {
      setLoadingTreatments(false)
    }
  }

  fetchTreatments() // ✅ Call the function here
}, [consultationId])


  /** ---------- Timer logic ---------- **/
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (showTimerModal) {
      interval = setInterval(() => setSeconds(prev => prev + 1), 1000)
    } else {
      setSeconds(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [showTimerModal])
  //Timer time format for h:M:S
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /** ---------- Camera ---------- **/
  const pickAfterPhoto = async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (permission.status !== 'granted') return Alert.alert('Permission required', 'Camera permission is required!')

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const updated = [...afterPhotos]
      updated[index] = result.assets[0].uri
      setAfterPhotos(updated)
    }
  }

  /** ---------- Upload after photos ---------- **/
const handleUploadAfterPhotos = async () => {
  setUploadingAfter(true)

  try {
    console.log('🚀 handleUploadAfterPhotos called')
    console.log('CustomerId:', customerId)
    console.log('TreatmentId:', treatmentId)
    console.log('After Photos Array:', afterPhotos)

    const formData = new FormData()
    formData.append('customerId', customerId) // ✅ lowercase, matches backend
    formData.append("treatmetId", String(savedTreatmentAppointmentId)); // ✅ matches backend typo

    afterPhotos.forEach((uri, idx) => {
      if (uri) {
        const fileUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri
        const fileObj = {
          uri: fileUri,
          type: 'image/jpeg',
          name: `after_${idx}.jpg`,
        }
        console.log(`📸 Adding photo #${idx + 1}:`, fileObj)
        formData.append('photos', fileObj as any) // ✅ matches backend
      } else {
        console.log(`⚠️ Skipped photo #${idx + 1} because URI is invalid:`, uri)
      }
    })

    console.log('📡 Sending POST request to /Treatment/Treatmentphoto-upload')
    const response = await api.post('/Treatment/Treatmentphoto-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    console.log('✅ Upload successful:', response.data)
    Alert.alert('Success', 'After photos uploaded!')
  } catch (err: any) {
    console.error('❌ Upload failed:', err.response?.data || err.message)
    Alert.alert('Upload failed', 'Failed to upload after photos.')
  } finally {
    setUploadingAfter(false)
    console.log('🔚 handleUploadAfterPhotos finished')
  }
}


  /** ---------- Header content ---------- **/
  const renderHeaderContent = () => {
    if (loadingClient) return <ActivityIndicator size="small" color="#000" />
    if (!client) return <Text className="text-xs text-red-500">No client data available</Text>

    return (
      <>
<Image
  source={fullImageUrl ? { uri: fullImageUrl } : require('../assets/pp.jpg')}
  className="w-16 h-16 rounded-full"
/>
        <View className="flex-col ml-2">
          <Text className="text-black text-sm font-bold">{client.fullName}</Text>
          <Text className="font-medium text-xs">{client.phone}</Text>
          {client.appointmentTime && <Text className="font-medium text-xs">{client.appointmentTime}</Text>}
          {client.treatmentName && <Text className="font-medium text-xs">Treatment: {client.treatmentName}</Text>}
        </View>
                <View className="flex-col gap-y-2 ml-auto">
                    <TouchableOpacity
                    activeOpacity={1}
                      className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
                      onPress={() => {
                        navigation.navigate('Profile', { id: String(customerId) })  // ✅ Navigate to Profile
                      }}
                    >
                      <Text className="text-white text-xs font-bold text-center">View Profile</Text>
                    </TouchableOpacity>
        
        
          <TouchableOpacity
          activeOpacity={1}
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={() => navigation.navigate('TreatmentConcentform', { customerId,treatmentId,Name:client.fullName })}
          >
            <Text className="text-white text-xs font-bold text-center">View Consent Form</Text>
          </TouchableOpacity>
        
        </View>
      </>
    )
  }

  return (
    <View className="flex-1 bg-white">
      {/* Top Section */}
      <View className="w-[95%] h-[15%] bg-secondary p-5 mt-[15%] mx-auto flex-row items-center rounded-xl space-x-4">
        {renderHeaderContent()}
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Treatment Plan */}
<View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
  <Text className="font-bold text-sm text-center mb-2">Upload Photos Before Treatment</Text>
  {/* <ScrollView horizontal showsHorizontalScrollIndicator={true}>
    <View className="flex-col">

      <View className="flex-row mb-2">
        <Text className="font-bold text-sm w-40 text-center">Treatment Plan</Text>
        <Text className="font-bold text-sm w-80 text-center">Remark</Text>
      </View>

      {loadingTreatments ? (
        <ActivityIndicator size="small" color="#000" className="my-4" />
      ) : treatments.length > 0 ? (
        treatments.map((plan, idx) => (
          <View
            key={idx}
            className="flex-row items-center border-b border-gray-300"
            style={{ minHeight: 50 }}
          >
            <Text numberOfLines={1} ellipsizeMode="tail" className="text-xs w-[20%] ml-[5%] text-left">
              {plan.tname ?? 'N/A'}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="tail" className="text-xs ml-[35%] w-[20%] text-left">
              {plan.description ?? 'No remark'}
            </Text>
          </View>
        ))
      ) : (
        <Text className="text-xs text-gray-500 w-60 mt-4 text-center">No treatments found</Text>
      )}
    </View>
  </ScrollView> */}
</View>


        {/* Before Photos */}
<View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
  <Text className="font-bold text-sm text-center mb-2">
    {roleId === 26 || roleId === 28
      ? "Before Treatment Photos"
      : "Upload Photos Before Treatment"}
  </Text>

  {roleId === 26 || roleId === 28 ? (
    // VIEW MODE
    <View>
      {loadingFetchedBeforePhotos ? (
        <ActivityIndicator size="small" color="#000" className="my-4" />
      ) : fetchedBeforePhotos.length > 0 ? (
        <View className="flex-row flex-wrap justify-between mb-4">
          {fetchedBeforePhotos.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={1}
              onLongPress={() => {
                const updated = [...beforeBlurStates];
                updated[idx] = false;
                setBeforeBlurStates(updated);
                setTimeout(() => {
                  const reset = [...beforeBlurStates];
                  reset[idx] = true;
                  setBeforeBlurStates(reset);
                }, 1500);
              }}
              className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300 overflow-hidden"
            >
              <View className="w-full h-full">
                <Image
                  source={{ uri: uri ?? undefined }}
                  className="w-full h-full rounded-md absolute"
                  resizeMode="cover"
                />
                {beforeBlurStates[idx] && (
                  <BlurView
                    intensity={40}
                    tint="light"
                    className="absolute top-0 left-0 right-0 bottom-0 rounded-md"
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text className="text-xs text-gray-500 text-center mt-4">
          No before photos available.
        </Text>
      )}

      {/* ✅ Next Button always visible in view mode */}
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-full items-center mt-2"
        onPress={() =>
          navigation.navigate("TreatmentAfterPhoto", {
            formData: {
                      customerId: customerId, // ✅ same one from current screen
                      treatmentId: treatmentId, // ✅ include answers if any
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
            onLongPress={() => {
              const updated = [...beforeBlurStates];
              updated[idx] = false;
              setBeforeBlurStates(updated);
              setTimeout(() => {
                const reset = [...beforeBlurStates];
                reset[idx] = true;
                setBeforeBlurStates(reset);
              }, 1500);
            }}
            className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300 overflow-hidden"
          >
            {uri ? (
              <View className="w-full h-full">
                <Image
                  source={{ uri }}
                  className="w-full h-full rounded-md absolute"
                  resizeMode="cover"
                />
                {beforeBlurStates[idx] && (
                  <BlurView
                    intensity={40}
                    tint="light"
                    className="absolute top-0 left-0 right-0 bottom-0 rounded-md"
                  />
                )}
              </View>
            ) : (
              <Camera size={20} color="#666" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-full items-center mt-2"
        onPress={handleUploadBeforePhotos}
        disabled={uploadingBefore}
      >
        <Text className="text-white font-bold">
          {uploadingBefore ? "Uploading..." : "Upload Photos"}
        </Text>
      </TouchableOpacity>

      {/* ✅ Next Button also in upload mode */}
      <TouchableOpacity
        className="bg-secondary px-6 py-3 rounded-full items-center mt-2"
        onPress={() =>
          navigation.navigate("Appoinments", {
            customerId,
            fromPage: "StartTreatment",
            treatmentId: savedTreatmentAppointmentId,
          })
        }
      >
        <Text className="text-white font-bold">Next</Text>
      </TouchableOpacity>
    </View>
  )}
</View>




      </ScrollView>
      <Navbar />
    </View>
  )
}

export default StartTreatment;
