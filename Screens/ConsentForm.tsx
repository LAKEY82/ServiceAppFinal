import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native'; // Using lucide-react-native icon
import api from '../API/api';

type RootStackParamList = {
  ConsentForm: { consultationId: number; customerId: string };
};

type ConsentFormRouteProp = RouteProp<RootStackParamList, 'ConsentForm'>;

interface ConsentAnswer {
  mainQuestionText?: string;
  subQuestionText?: string | null;
  answerDescription?: string;
}

const ConsentForm: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ConsentFormRouteProp>();
  const { consultationId, customerId } = route.params;

  const [answers, setAnswers] = useState<ConsentAnswer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConsentForm = async () => {
      try {
        setLoading(true);
        const res = await api.get<ConsentAnswer[]>(
          `/Consultation/answers/${consultationId}/${customerId}`
        );

        console.log('Consent form response:', res.data); // Log API response
        setAnswers(res.data ?? []);
      } catch (err) {
        console.error('Failed to fetch consent form:', err);
        Alert.alert('Error', 'Could not load consent form.');
      } finally {
        setLoading(false);
      }
    };

    fetchConsentForm();
  }, [consultationId, customerId]);

  if (loading)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );

  if (!answers.length)
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">No consent form found.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 16, paddingBottom: 20 }}>
        {/* Header with Back Icon */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-black">Consent Form</Text>
        </View>

        {/* Questions & Answers */}
        {answers.map((item, idx) => (
          <View
            key={idx}
            className="mb-4 p-4 bg-white rounded-xl shadow-md border border-gray-100"
          >
            {/* Main Question */}
            {item.mainQuestionText && (
              <Text className="font-bold text-black text-base mb-2">
                {item.mainQuestionText}
              </Text>
            )}

            {/* Sub Question */}
            {item.subQuestionText && (
              <Text className="font-medium text-gray-700 mb-2">
                {item.subQuestionText}
              </Text>
            )}

            {/* Answer */}
            <Text className="text-black ml-1">Answer: {item.answerDescription}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ConsentForm;
