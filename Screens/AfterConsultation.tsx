import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native'
import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import * as ImagePicker from 'expo-image-picker'
import { Camera } from "lucide-react-native"
import { useNavigation, useRoute } from '@react-navigation/native'

const AfterConsultation = () => {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()

  // Photos passed from Startconsultation
  const beforePhotos: (string | null)[] = route.params?.photos || []

  // After photos (user can take new ones)
  const [afterPhotos, setAfterPhotos] = useState<(string | null)[]>(Array(6).fill(null))

  // Open camera for After Photos
  const openCamera = async (index: number) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (permission.status !== 'granted') {
      alert('Camera permission is required!')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    })

    if (!result.canceled) {
      const updated = [...afterPhotos]
      updated[index] = result.assets[0].uri
      setAfterPhotos(updated)
    }
  }

  return (
    <View className="flex-1 bg-white">
      {/* Blue top section */}
      <View className="w-[95%] h-[15%] bg-secondary gap-x-6 p-5 mt-[15%] mx-auto flex-row items-center rounded-xl space-x-4">
        <Image source={require('../assets/pp.jpg')} className="w-16 h-16 rounded-full" />

        <View className="flex-col">
          <Text className="text-black text-sm font-bold">Mr. Jane Cooper</Text>
          <Text className="font-medium text-xs">0772648062</Text>
          <Text className="font-medium text-xs">10:30 AM - 11:30 AM</Text>
          <Text className="font-medium text-xs">Treatment: Facial</Text>
        </View>

        <View className="flex-col gap-y-2">
          <TouchableOpacity className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center">
            <Text className="text-white text-xs font-bold text-center">View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center">
            <Text className="text-white text-xs font-bold text-center">View Consent Form</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-primary p-1 rounded-lg w-[130px] items-center justify-center">
            <Text className="text-white text-xs font-bold text-center">View Medical Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Treatment Plan Table */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="font-bold text-sm">Treatment Plan</Text>
            <Text className="font-bold text-sm">Date</Text>
            <Text className="font-bold text-sm">Remark</Text>
            <Text className="font-bold text-sm">Action</Text>
          </View>

          {['A', 'B', 'C'].map((plan, idx) => (
            <View key={idx} className="flex-row justify-between py-1 border-b border-gray-300">
              <Text className="text-xs">Facial plan - {plan}</Text>
              <Text className="text-xs">2024/09/30</Text>
              <Text className="text-xs">Remark</Text>
              <TouchableOpacity>
                <Text className="text-primary text-xs font-bold">View Photo</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Before Photo Grid */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <Text className="font-bold text-sm mb-2">Before Photo</Text>
          <View className="flex-row flex-wrap justify-between">
            {beforePhotos.map((photo: string | null, index: number) => (
              <View
                key={index}
                className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300"
              >
                {photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full rounded-md" />
                ) : (
                  <Text className="text-xs text-gray-500">No Photo</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* After Photo Grid (user can take photos) */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <Text className="font-bold text-sm mb-2">After Photo</Text>
          <View className="flex-row flex-wrap justify-between">
            {afterPhotos.map((photo: string | null, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => openCamera(index)}
                className="w-[30%] h-24 bg-white mb-3 rounded-md items-center justify-center border border-gray-300"
              >
                {photo ? (
                  <Image source={{ uri: photo }} className="w-full h-full rounded-md" />
                ) : (
                  <Camera size={20} color="#666" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Remark Table */}
        <View className="bg-[#F6F6F6] rounded-xl p-3 mb-4">
          <View className="flex-row justify-self-center gap-x-[15%] mb-2">
            <Text className="font-bold text-sm">Date</Text>
            <Text className="font-bold text-sm">Dr. Name</Text>
            <Text className="font-bold text-sm">Remark</Text>
          </View>

          {[1, 2, 3].map((item: number, idx: number) => (
            <View key={idx} className="flex-row justify-between py-1 border-b border-gray-300">
              <Text className="text-xs">2024/09/16</Text>
              <Text className="text-xs">Dr. Shanika Silva</Text>
              <Text className="text-xs w-[50%]">
                This is to acknowledge that I have read and understood the
              </Text>
            </View>
          ))}
        </View>
         {/* Start Button */}
                <View className='flex-1 items-center mt-[10%]'>
                  <TouchableOpacity
                    className='bg-primary px-[2%] rounded-full w-[40%] py-4 items-center'
                    onPress={() => navigation.navigate('Appoinments')}
                  >
                    <Text className='text-white font-bold'>Next</Text>
                  </TouchableOpacity>
                </View>
      </ScrollView>

      <Navbar />
    </View>
  )
}

export default AfterConsultation
