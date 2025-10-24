import {View,Text,TextInput,TouchableOpacity,ScrollView,Alert,ActivityIndicator,Modal,Image,} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import api from "../API/api"; // your axios instance
import { Camera, Image as ImageIcon } from "lucide-react-native";

type RootStackParamList = {
  ConcentFill: {
    id: string;
    consultationId: number;
    appointmentType: string;
    treatmentId?: number; // 👈 added for treatment support
  };
  Startconsultation: { formData: any };
};

type ConcentFillRouteProp = RouteProp<RootStackParamList, "ConcentFill">;

interface Option {
  id: number;
  optionText: string;
}

type Question = {
  id: number;
  questionText: string;
  inputType: "text" | "radio" | "choice";
  parentQuestionId?: number | null;
  optionId?: number | null;
  options?: Option[];
};

interface ConsentForm {
  id: number;
  formName: string;
  consultationId: number;
  questions: Question[];
}

const ConcentFill = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ConcentFillRouteProp>();
  const { id, consultationId, appointmentType, treatmentId } = route.params;

  console.log("The Params:", route.params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string | string[] }>({});

  //The Modal and Image Upload States
const [uploadModalVisible, setUploadModalVisible] = useState(false);
const [selectedImages, setSelectedImages] = useState<string[]>([]);
const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchConsentForm = async () => {
      try {
        setLoading(true);
        let endpoint = "";

        if (appointmentType === "Consultation") {
          endpoint = `/ConcentForm/concent/consultation/${consultationId}`;
        } else if (appointmentType === "Treatment") {
          if (!treatmentId) {
            setError("Treatment ID is missing for treatment consent form.");
            setLoading(false);
            return;
          }
          endpoint = `/ConcentForm/concent/treatment/${treatmentId}`;
        } else {
          setError("Invalid appointment type.");
          setLoading(false);
          return;
        }

        const response = await api.get(endpoint);
        const data: ConsentForm[] = response.data;
        console.log("Consent form data:", JSON.stringify(data, null, 2));

        if (data.length > 0) {
          setForm(data[0]);
        } else {
          setError("No consent form found.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load consent form.");
      } finally {
        setLoading(false);
      }
    };

    fetchConsentForm();
  }, [appointmentType, consultationId, treatmentId]);

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const openImagePicker = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri);
      setSelectedImages((prev) => [...prev, ...uris]);
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "Failed to pick images");
  }
};

const openCamera = async () => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImages((prev) => [...prev, result.assets[0].uri]);
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "Failed to open camera");
  }
};

  const handleRadioSelect = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleChoiceToggle = (questionId: number, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] as string[] | undefined;
      if (current?.includes(option)) {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      } else {
        return {
          ...prev,
          [questionId]: current ? [...current, option] : [option],
        };
      }
    });
  };

  //To pick multiple images in the concent form
const uploadPhotos = async () => {
  if (selectedImages.length === 0) {
    Alert.alert("No photos selected", "Please choose at least one photo.");
    return;
  }

  try {
    setUploading(true);

    // Just simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    Alert.alert("Success", "Photos selected successfully!");

    setUploadModalVisible(false);
    setSelectedImages([]);

    if (appointmentType === "Treatment") {
      navigation.navigate("StartTreatment", {
        formData: { customerId: id, consultationId, treatmentId },
      });
    } else {
      navigation.navigate("Startconsultation", {
        customerId: id,
        consultationId,
      });
    }
  } catch (error) {
    console.error(error);
    Alert.alert("Error", "Something went wrong while processing photos");
  } finally {
    setUploading(false);
  }
};

  const handleDownloadPDF = async () => {
    try {
      if (!form) {
        Alert.alert("Error", "Form not loaded yet.");
        return;
      }

      const date = new Date().toLocaleDateString();

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Helvetica'; margin: 40px; color: #333; line-height: 1.6; }
              h1 { text-align: center; color: #0D6EFD; margin-bottom: 10px; }
              .question { margin-bottom: 15px; }
              .answer { margin-left: 10px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 6px; background: #fafafa; }
              .not-answered { color: #888; font-style: italic; }
            </style>
          </head>
          <body>
            <h1>${form.formName}</h1>
            <div>Customer ID: ${id}</div>
            <div>Consultation ID: ${consultationId}</div>
            ${treatmentId ? `<div>Treatment ID: ${treatmentId}</div>` : ""}
            <div>Date: ${date}</div>
            ${form.questions
              .map((q, i) => {
                const answer = answers[q.id];
                let displayAnswer = "";

                if (q.inputType === "text") {
                  displayAnswer =
                    answer && typeof answer === "string" && answer.trim() !== ""
                      ? answer
                      : "<span class='not-answered'>Not answered</span>";
                } else if (q.inputType === "radio") {
                  displayAnswer =
                    typeof answer === "string"
                      ? answer
                      : "<span class='not-answered'>Not selected</span>";
                } else if (q.inputType === "choice") {
                  const choiceAnswers = Array.isArray(answer) ? answer : [];
                  displayAnswer =
                    choiceAnswers.length > 0
                      ? choiceAnswers.join(", ")
                      : "<span class='not-answered'>None selected</span>";
                }

                return `
                  <div class="question">
                    <strong>${i + 1}. ${q.questionText}</strong>
                    <div class="answer">${displayAnswer}</div>
                  </div>
                `;
              })
              .join("")}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to generate or share PDF");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0D6EFD" />
        <Text>Loading consent form...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-5">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-5 mt-10">
        <Text className="text-center text-xl font-bold mb-6 mt-[10%]">
          {form?.formName}
        </Text>

        {form?.questions
          .filter((q) => q.parentQuestionId === null)
          .map((parent) => (
            <View key={parent.id} className="bg-gray-50 p-4 rounded-2xl shadow mb-4">
              <Text className="font-semibold mb-2">{parent.questionText}</Text>

              {parent.inputType === "text" && (
                <TextInput
                  placeholder="Type your answer..."
                  className="border rounded-lg px-3 py-2"
                  value={(answers[parent.id] as string) || ""}
                  onChangeText={(text) => handleTextChange(parent.id, text)}
                />
              )}

              {parent.inputType === "radio" &&
                parent.options?.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    className="flex-row items-center mb-2"
                    onPress={() => handleRadioSelect(parent.id, opt.optionText)}
                  >
                    <View
                      className={`w-5 h-5 border-2 rounded mr-2 ${
                        answers[parent.id] === opt.optionText ? "bg-primary" : "bg-white"
                      }`}
                    />
                    <Text>{opt.optionText}</Text>
                  </TouchableOpacity>
                ))}

              {parent.inputType === "choice" &&
                parent.options?.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    className="flex-row items-center mb-2"
                    onPress={() => handleChoiceToggle(parent.id, opt.optionText)}
                  >
                    <View
                      className={`w-5 h-5 border-2 rounded mr-2 ${
                        ((answers[parent.id] as string[]) || []).includes(opt.optionText)
                          ? "bg-primary"
                          : "bg-white"
                      }`}
                    />
                    <Text>{opt.optionText}</Text>
                  </TouchableOpacity>
                ))}

              {form.questions
                .filter((child) => child.parentQuestionId === parent.id)
                .map((child) => {
                  const parentAnswer = answers[parent.id];
                  let shouldShow = false;

                  if (child.optionId) {
                    shouldShow =
                      typeof parentAnswer === "string" &&
                      (parent.options?.some(
                        (opt) => opt.id === child.optionId && opt.optionText === parentAnswer
                      ) || false);
                  } else {
                    shouldShow = true;
                  }

                  if (!shouldShow) return null;

                  return (
                    <View
                      key={child.id}
                      className="mt-4 pl-4 border-l-2 border-gray-300"
                    >
                      <Text className="font-semibold mb-2">
                        {child.questionText}
                      </Text>

                      {child.inputType === "text" && (
                        <TextInput
                          placeholder="Type your answer..."
                          className="border rounded-lg px-3 py-2"
                          value={(answers[child.id] as string) || ""}
                          onChangeText={(text) => handleTextChange(child.id, text)}
                        />
                      )}

                      {child.inputType === "radio" &&
                        child.options?.map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            className="flex-row items-center mb-2"
                            onPress={() => handleRadioSelect(child.id, opt.optionText)}
                          >
                            <View
                              className={`w-5 h-5 border-2 rounded mr-2 ${
                                answers[child.id] === opt.optionText
                                  ? "bg-primary"
                                  : "bg-white"
                              }`}
                            />
                            <Text>{opt.optionText}</Text>
                          </TouchableOpacity>
                        ))}

                      {child.inputType === "choice" &&
                        child.options?.map((opt) => (
                          <TouchableOpacity
                            key={opt.id}
                            className="flex-row items-center mb-2"
                            onPress={() => handleChoiceToggle(child.id, opt.optionText)}
                          >
                            <View
                              className={`w-5 h-5 border-2 rounded mr-2 ${
                                ((answers[child.id] as string[]) || []).includes(opt.optionText)
                                  ? "bg-primary"
                                  : "bg-white"
                              }`}
                            />
                            <Text>{opt.optionText}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  );
                })}
            </View>
          ))}

        <View className="flex-row justify-between mb-10 mt-6">
          <TouchableOpacity
            onPress={handleDownloadPDF}
            className="flex-1 bg-gray-200 py-4 rounded-xl mr-2"
          >
            <Text className="text-center font-semibold text-gray-800 text-lg">
              📄 Download PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUploadModalVisible(true)}
            className="flex-1 bg-primary py-4 rounded-xl ml-2"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Submit →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 🟩 Upload Photo Modal */}
<Modal
  visible={uploadModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setUploadModalVisible(false)}
>
  <View className="flex-1 bg-black/50 justify-center items-center px-5">
    <View className="bg-white w-full rounded-2xl p-6 max-h-[85%]">
      <Text className="text-xl font-semibold text-center mb-4">
        Upload Consent Form
      </Text>

<View className="flex-row justify-center mb-3 gap-x-3">
  <TouchableOpacity
    onPress={openCamera}
    className="bg-gray-200 flex-row items-center px-4 py-3 rounded-lg"
  >
    <Camera size={20} color="#333" />
    <Text className="text-gray-800 ml-2">Camera</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={openImagePicker}
    className="bg-gray-200 flex-row items-center px-4 py-3 rounded-lg"
  >
    <ImageIcon size={20} color="#333" />
    <Text className="text-gray-800 ml-2">Gallery</Text>
  </TouchableOpacity>
</View>

      <ScrollView
        className="mt-3"
        contentContainerStyle={{ alignItems: "center" }}
      >
        {selectedImages.length > 0 ? (
          selectedImages.map((uri, index) => (
            <View key={index} className="relative mb-4">
              <Image
                source={{ uri }}
                className="w-72 h-64 rounded-xl"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() =>
                  setSelectedImages((prev) => prev.filter((_, i) => i !== index))
                }
                className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-full"
              >
                <Text className="text-white text-xs">✕</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 mt-4">No photos selected yet.</Text>
        )}
      </ScrollView>

      <View className="flex-row justify-between mt-4">
        <TouchableOpacity
          onPress={() => setUploadModalVisible(false)}
          className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
        >
          <Text className="text-center text-gray-700 font-semibold">
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={uploading || selectedImages.length === 0}
          onPress={uploadPhotos}
          className={`flex-1 ${
            selectedImages.length > 0 ? "bg-blue-500" : "bg-gray-300"
          } py-3 rounded-xl ml-2`}
        >
          <Text className="text-center text-white font-semibold">
            {uploading ? "Uploading..." : "Upload & Continue →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


      <Navbar />
    </View>
  );
};

export default ConcentFill;