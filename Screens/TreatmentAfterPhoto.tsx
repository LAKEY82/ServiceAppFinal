import React, { useEffect, useState,useRef  } from 'react'
import {View,Text,Image,TextInput,TouchableOpacity,ScrollView,Modal,Platform,Alert,ActivityIndicator,} from 'react-native'
import Navbar from '../components/Navbar'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native'
import api from '../API/api'
import { BlurView } from "expo-blur";
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
    TreatmentAfterPhoto: { 
    formData: { customerId: string; consultationId: number; treatmentId: number; answers: any; photos?: (string | null)[] } 
  }
  Appointments: { customerId: string; photos?: (string | null)[] }
  ConsentForm: { consultationId: number; customerId: string }
  Profile: { id: string }
  TreatmentConcentform: { Name:string,customerId: string; treatmentId: number }
}

type TreatmentAfterPhotoRouteProp = RouteProp<RootStackParamList, 'TreatmentAfterPhoto'>

/** ---------- Component ---------- **/
const TreatmentAfterPhoto: React.FC = () => {
  const navigation = useNavigation<any>()
  const route = useRoute<TreatmentAfterPhotoRouteProp>()
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
  /** ---------- Fetch client ---------- **/
  useEffect(() => {
    const fetchClient = async () => {
      setLoadingClient(true)
      try {
        const res = await api.get(`/ClientProfile/clientprofile/${customerId}`)
        const data = res.data
        setClient({
          id: data.id,
          fullName: `${data.salutation ?? ''} ${data.fname ?? ''} ${data.lname ?? ''}`.trim() || 'Unknown',
          phone: data.mobileNo ?? 'N/A',
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
/** ---------- Upload after photos ---------- **/
const handleUploadAfterPhotos = async () => {
  setUploadingAfter(true);

  try {
    console.log('🚀 handleUploadAfterPhotos called');
    console.log('CustomerId:', customerId);
    console.log('TreatmentId:', treatmentId);
    console.log('After Photos Array:', afterPhotos);

    const formData = new FormData();
    formData.append('customerId', customerId); // ✅ backend expects lowercase
    formData.append('treatmetId', String(treatmentId)); // ✅ matches backend typo

    afterPhotos.forEach((uri, idx) => {
      if (uri) {
        const fileUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
        const fileObj = {
          uri: fileUri,
          type: 'image/jpeg',
          name: `after_${idx}.jpg`,
        };
        console.log(`📸 Adding photo #${idx + 1}:`, fileObj);
        formData.append('photos', fileObj as any);
      } else {
        console.log(`⚠️ Skipped photo #${idx + 1} because URI is invalid:`, uri);
      }
    });

    console.log('📡 Sending POST request to /Treatment/Treatmentphoto-upload');
    const response = await api.post('/Treatment/Treatmentphoto-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    console.log('✅ Upload successful:', response.data);
    Alert.alert('Success', 'After photos uploaded successfully!');

    // ✅ Navigate back to Appoinments with all required params
    navigation.navigate('Appoinments', {
      treatmentId,
      customerId,
    });

  } catch (err: any) {
    console.error('❌ Upload failed:', err.response?.data || err.message);
    Alert.alert('Upload failed', 'Failed to upload after photos.');
  } finally {
    setUploadingAfter(false);
    console.log('🔚 handleUploadAfterPhotos finished');
  }
};



  /** ---------- Header content ---------- **/
  const renderHeaderContent = () => {
    if (loadingClient) return <ActivityIndicator size="small" color="#000" />
    if (!client) return <Text className="text-xs text-red-500">No client data available</Text>

    return (
      <>
        <Image
          source={client.profilePhotoUrl ? { uri: client.profilePhotoUrl } : require('../assets/pp.jpg')}
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
                      className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
                      onPress={() => {
                        navigation.navigate('Profile', { id: String(customerId) })  // ✅ Navigate to Profile
                      }}
                    >
                      <Text className="text-white text-xs font-bold text-center">View Profile</Text>
                    </TouchableOpacity>
        
        
          <TouchableOpacity
            className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center"
            onPress={() => navigation.navigate('TreatmentConcentform', { customerId,treatmentId,Name:client.fullName })}
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
{/* Treatment Plan */}
{/* Treatment Plan */}
<View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
    <View className="flex-col">
      {/* Table Header */}
      <View className="flex-row mb-2">
        <Text className="font-bold text-sm w-40 text-center">Treatment Plan</Text>
        <Text className="font-bold text-sm w-80 text-center">Remark</Text> {/* Wider */}
        {/* <Text className="font-bold text-sm w-40 text-center">Action</Text> */}
      </View>

      {/* Table Rows */}
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
            {/* <TouchableOpacity style={{ width: 40, alignItems: 'center' }}>
              <Text className="text-primary text-xs font-bold">View Photo</Text>
            </TouchableOpacity> */}
          </View>
        ))
      ) : (
        <Text className="text-xs text-gray-500 w-60 mt-4 text-center">No treatments found</Text>
      )}
    </View>
  </ScrollView>
</View>
        {/* After Photos */}
<View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
  <Text className="font-bold text-sm mb-2">After Photos</Text>
  <View className="flex-row flex-wrap justify-between">
    {afterPhotos.map((uri, idx) => {
      const [isBlurred, setIsBlurred] = useState(true);

      return (
        <TouchableOpacity
          key={idx}
          onPress={() => pickAfterPhoto(idx)}
          onLongPress={() => {
            if (uri) {
              setIsBlurred(false);
              setTimeout(() => setIsBlurred(true), 1500);
            }
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
              {isBlurred && (
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
      );
    })}
  </View>

  <TouchableOpacity
    className="bg-primary px-6 py-3 rounded-full items-center mt-3"
    onPress={handleUploadAfterPhotos}
    disabled={uploadingAfter}
  >
    <Text className="text-white font-bold">
      {uploadingAfter ? "Uploading..." : "Upload After Photos"}
    </Text>
  </TouchableOpacity>
</View>
      </ScrollView>
      <Navbar />
    </View>
  )
}

export default TreatmentAfterPhoto;
