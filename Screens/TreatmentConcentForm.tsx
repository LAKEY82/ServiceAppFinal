import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import api from '../API/api';

type RootStackParamList = {
  TreatmentConcentForm: { Name:string,treatmentId: number; customerId: string };
};

type TreatmentConcentFormRouteProp = RouteProp<
  RootStackParamList,
  'TreatmentConcentForm'
>;

interface ConsentAnswer {
  mainQuestionId: number;
  subQuestionId: number;
  answerDescription: string;
  appointmentId: number;
  questionText: string;
}

const TreatmentConcentForm: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<TreatmentConcentFormRouteProp>();
  const { Name,treatmentId, customerId } = route.params;

  const [answers, setAnswers] = useState<ConsentAnswer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchConsentForm = async () => {
      try {
        setLoading(true);
        const res = await api.get<ConsentAnswer[]>(
          `/ConcentForm/treatment/answers/${treatmentId}/${customerId}`
        );

        console.log('Consent form response:', res.data);
        setAnswers(res.data ?? []);
      } catch (err) {
        console.error('Failed to fetch consent form:', err);
        Alert.alert('Error', 'Could not load consent form.');
      } finally {
        setLoading(false);
      }
    };

    fetchConsentForm();
  }, [treatmentId, customerId]);

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
          <Text className="text-2xl font-bold text-black">Treatment Conscent Form - {Name}</Text>
        </View>

        {/* Questions & Answers */}
        {answers.map((item, idx) => (
          <View
            key={idx}
            className="mb-4 p-4 bg-white rounded-xl shadow-md border border-gray-100"
          >
            {/* Question */}
            <Text className="font-bold text-black text-base mb-2">
              {item.questionText}
            </Text>

            {/* Answer */}
            <Text className="text-black ml-1">
              Answer: {item.answerDescription || 'N/A'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TreatmentConcentForm;
