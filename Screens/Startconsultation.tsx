// Startconsultation.tsx
import React, { useEffect, useState } from 'react'
import {View,Text,Image,TouchableOpacity,ScrollView,Alert,ActivityIndicator,Platform,} from 'react-native'
import Navbar from '../components/Navbar'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import api from '../API/api'

/** ---------- Types ---------- **/

interface ClientApiResponse {
  salutation?: string
  fname?: string
  lname?: string
  mobileNo?: string
  appointmentTime?: string
  treatmentName?: string
  profilePhotoUrl?: string
  id?: string | number
}

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

/** RootStackParamList - include all screens & params we pass around **/
type RootStackParamList = {
  ConcentFill: { id: string; consultationId: number }
  Startconsultation: { customerId: string; consultationId: number }
  Profile: { id: string }     // ✅ Add this line
  StartTreatment: {
    customerId: string
    consultationId: number
    client: ClientProfile | null
    treatments: TreatmentItem[]
    photos: (string | null)[]
  }
  AfterConsultation: {
    photos: (string | null)[]
    client?: ClientProfile | null
    treatments?: TreatmentItem[]
    consultationId?: number
    customerId?: string
  }
  ConsentForm: { consultationId: number; customerId: string } // ✅ Add this
}

type StartConsultationRouteProp = RouteProp<RootStackParamList, 'Startconsultation'>

/** ---------- Component ---------- **/

const Startconsultation: React.FC = () => {
  const navigation = useNavigation<any>()
  const route = useRoute<StartConsultationRouteProp>()

  // Extract params safely
  const customerId = (route.params && route.params.customerId) ?? String((route.params as any)?.formData?.id ?? '')
  const consultationId = (route.params && route.params.consultationId) ?? Number((route.params as any)?.formData?.consultationId ?? 0)

  // local state
  const [photos, setPhotos] = useState<(string | null)[]>(Array(6).fill(null))
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [treatments, setTreatments] = useState<TreatmentItem[]>([])
  const [loadingClient, setLoadingClient] = useState<boolean>(true)
  const [loadingTreatments, setLoadingTreatments] = useState<boolean>(true)
  const [uploading, setUploading] = useState<boolean>(false)

  // Debug log params
  useEffect(() => {
    console.log('Startconsultation params:', route.params)
    console.log('customerId:', customerId, 'consultationId:', consultationId)
  }, [route.params])

  // Fetch client profile
  useEffect(() => {
    if (!customerId) {
      setLoadingClient(false)
      return
    }

    const fetchClient = async () => {
      setLoadingClient(true)
      try {
        // Adjust endpoint if different in your backend
        const res = await api.get<ClientApiResponse>(`/ClientProfile/clientprofile/${customerId}`)
        const data = res.data ?? {}
        const fullName = `${data.salutation ?? ''} ${data.fname ?? ''} ${data.lname ?? ''}`.trim()
        setClient({
          id: data.id,
          fullName: fullName || 'Unknown',
          phone: data.mobileNo?.trim() ?? 'N/A',
          appointmentTime: data.appointmentTime,
          treatmentName: data.treatmentName,
          profilePhotoUrl: data.profilePhotoUrl,
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

  // Fetch treatments for the customer
  useEffect(() => {
    if (!customerId) {
      setLoadingTreatments(false)
      return
    }

    const fetchTreatments = async () => {
      setLoadingTreatments(true)
      try {
        // Adjust endpoint if different in your backend
        const res = await api.get<TreatmentItem[]>(`/Treatment/${customerId}`)
        setTreatments(res.data ?? [])
      } catch (err) {
        console.error('Failed to fetch treatments:', err)
      } finally {
        setLoadingTreatments(false)
      }
    }

    fetchTreatments()
  }, [customerId])

  // Camera action
  const openCamera = async (index: number) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (permission.status !== 'granted') {
        return Alert.alert('Permission required', 'Camera permission is required to take photos.')
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = [...photos]
        newPhotos[index] = result.assets[0].uri
        setPhotos(newPhotos)
      }
    } catch (err) {
      console.error('Camera error:', err)
      Alert.alert('Error', 'Could not open camera.')
    }
  }

  // Upload photos and navigate to StartTreatment
const handleProceedToTreatment = async () => {
  if (!customerId || !consultationId) {
    Alert.alert("Missing Data", "Customer ID or Consultation ID is missing.");
    return;
  }

  setUploading(true);
  try {
    const formData = new FormData();

    // ✅ Append these EXACTLY as your backend expects
    formData.append("CustomerId", String(customerId));
    formData.append("ConsultationId", String(consultationId));

    photos.forEach((photo, idx) => {
      if (photo) {
        const uri = Platform.OS === "ios" ? photo.replace("file://", "") : photo;
        formData.append("Photos", {
          uri,
          name: `photo_${idx + 1}.jpg`,
          type: "image/jpeg",
        } as any);
      }
    });

    console.log("Uploading with:", {
      CustomerId: customerId,
      ConsultationId: consultationId,
      PhotosCount: photos.filter(Boolean).length,
    });

    const res = await api.post("/ConsultationPhoto/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Upload response:", res.data);
    Alert.alert("Success", "Photos uploaded successfully.");

    navigation.navigate("Dashboard");
  } catch (err: any) {
    console.error(
      "Upload failed:",
      err?.response?.data ?? err?.message ?? err
    );
    Alert.alert("Upload failed", "Failed to upload photos. Please try again.");
  } finally {
    setUploading(false);
  }
};


  // Quick helper UI for header content
  const renderHeaderContent = () => {
    if (loadingClient) {
      return <ActivityIndicator size="small" color="#000" />
    }
    if (!client) {
      return <Text className="text-xs text-red-500">No client data available</Text>
    }

    return (
      <>
        <Image
          source={client.profilePhotoUrl ? { uri: client.profilePhotoUrl } : require('../assets/pp.jpg')}
          className="w-16 h-16 rounded-full"
        />
        <View className="flex-col ml-2">
          <Text className="text-black text-sm font-bold ">{client.fullName}</Text>
          <Text className="font-medium text-xs">{client.phone}</Text>
          {client.appointmentTime && <Text className="font-medium text-xs">{client.appointmentTime}</Text>}
          {client.treatmentName && <Text className="font-medium text-xs">Treatment: {client.treatmentName}</Text>}
        </View>
      </>
    )
  }

  return (
    <View className="flex-1 bg-white">
      {/* Top Section */}
      <View className="w-[95%] h-[15%] bg-secondary p-5 mt-[15%] mx-auto flex-row items-center rounded-xl space-x-4">
        {renderHeaderContent()}

        {/* Buttons on the right */}
        <View className="flex-col gap-y-2 ml-auto">
            <TouchableOpacity
              className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
              onPress={() => {
                navigation.navigate('Profile', { id: String(customerId) })  // ✅ Navigate to Profile
              }}
            >
              <Text className="text-white text-xs font-bold text-center">View Profile</Text>
            </TouchableOpacity>


          <TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={() => navigation.navigate('ConsentForm', { customerId,consultationId })}
          >
            <Text className="text-white text-xs font-bold text-center">View Consent Form</Text>
          </TouchableOpacity>

<TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={() => navigation.navigate('Appoinments', { customerId })}
          >
            <Text className="text-white text-xs font-bold text-center">View Medical Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 120 }}>


        {/* Photo Grid */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <Text className="font-bold text-sm mb-2">Before Photo</Text>
          <View className="flex-row flex-wrap justify-between">
            {photos.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => openCamera(idx)}
                className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300"
              >
                {p ? (
                  <Image source={{ uri: p }} className="w-full h-full rounded-md" />
                ) : (
                  <Camera size={20} color="#666" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upload & Proceed */}
        <View className="flex-1 items-center mt-6">
          <TouchableOpacity
            className="bg-primary px-[2%] rounded-full w-[60%] py-4 items-center"
            onPress={handleProceedToTreatment}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold">Upload Photos</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Navbar />
    </View>
  )
}

export default Startconsultation
