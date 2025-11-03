import {View,Text,TextInput,TouchableOpacity,ScrollView,Alert,ActivityIndicator,Modal,Image,Platform} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import api from "../API/api"; // your axios instance
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';
type RootStackParamList = {
  ConcentFill: {
    id: string;
    consultationId: number;
    appointmentType: string;
    treatmentId?: number; // 👈 added for treatment support
    initialStatus:string;
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
  const { id, consultationId,initialStatus, appointmentType, treatmentId } = route.params;

  console.log("The Params:", route.params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string | string[] }>({});
  const [viewFormModalVisible, setViewFormModalVisible] = useState(false);

  //The Modal and Image Upload States
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  //Thisis for the picker
  // NOTE: we're replacing native Picker with react-native-dropdown-picker
  // const [formValue, setFormValue] = useState<string | null>("Consultation"); // default
  // const [formOpen, setFormOpen] = useState(false);
  // const [formItems, setFormItems] = useState([
  //   { label: 'Consultation', value: 'Consultation' },
  //   { label: 'Treatment', value: 'Treatment' },
  // ]);

  const [availableForms, setAvailableForms] = useState<
    { date: string; pdfLocations: string[] }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Dropdown state for dates
  const [dateOpen, setDateOpen] = useState(false);
  const [dateItems, setDateItems] = useState<Array<{label:string;value:string}>>([]);

  const [formImages, setFormImages] = useState<string[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
    const [formValue, setFormValue] = useState<string | null>("Consultation"); // default
  const [formOpen, setFormOpen] = useState(false);
  const [formItems, setFormItems] = useState([
    { label: 'Consultation', value: 'Consultation' },
    { label: 'Treatment', value: 'Treatment' },
  ]);
  const [formType, setFormType] = useState<string>("Consultation");
  // Sync date items whenever availableForms changes
  useEffect(() => {
    setDateItems(availableForms.map((f) => ({ label: f.date, value: f.date })));
  }, [availableForms]);

  //This onne for fetch old forms
  const fetchFilledForms = async (type: string) => {
    try {
      setLoadingForms(true);
      setAvailableForms([]);
      setFormImages([]);
      setSelectedDate("");

      let params: any = {
        customerId: id,
        formType: type,
      };

      if (type === "Treatment") {
        params.consultationId = 0;
        params.treatmentId = treatmentId || 0;
      } else if (type === "Consultation") {
        params.consultationId = consultationId || 0;
        params.treatmentId = 0;
      }

      const response = await api.get("/ConcentForm/concent/FilledForm", {
        params,
      });

      console.log("🟢 Filled form response:", response.data);

      if (Array.isArray(response.data)) {
        setAvailableForms(response.data);
      } else {
        setAvailableForms([]);
      }
    } catch (error) {
      console.error("❌ Error fetching filled forms:", error);
      Alert.alert("Error", "Failed to load filled forms.");
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    if (viewFormModalVisible) {
      // ensure dropdown default value is used to fetch
      fetchFilledForms(formValue || 'Consultation');
    }
  }, [viewFormModalVisible]);

useEffect(() => {
  const fetchConsentForm = async () => {
    try {
      setLoading(true);
      let endpoint = "";

      // 🟢 If initialStatus is "notfilled", use InitialConcent API
      if (initialStatus === "notfilled") {
        endpoint = `/ConcentForm/concent/InitialConcent`;
      } 
      // 🟡 Otherwise, use the appropriate endpoint
      else if (appointmentType === "Consultation") {
        endpoint = `/ConcentForm/concent/consultation/${consultationId}`;
      } 
      else if (appointmentType === "Treatment") {
        if (!treatmentId) {
          setError("Treatment ID is missing for treatment consent form.");
          setLoading(false);
          return;
        }
        endpoint = `/ConcentForm/concent/treatment/${treatmentId}`;
      } 
      else {
        setError("Invalid appointment type.");
        setLoading(false);
        return;
      }

      console.log("📡 Fetching consent form from:", endpoint);

      // 🧠 Fetch data via your configured base URL
      const response = await api.get(endpoint, {
        params:
          initialStatus === "notfilled"
            ? { customerId: id, consultationId: consultationId || 0 }
            : {},
      });

      const data = response.data;
      console.log("🟢 Consent form API response:", JSON.stringify(data, null, 2));

      let formData: ConsentForm | null = null;

      // ✅ Handle three cases:
      // 1. Array of questions
      // 2. Array of form objects
      // 3. Single form object
      if (Array.isArray(data)) {
        if (data.length > 0 && data[0].questionText) {
          // Case 1: response is directly a list of questions
          formData  = { id: 0, formName: "Auto Form",  consultationId: consultationId || 0,  questions: data };
        } else {
          // Case 2: response is an array of form objects
          formData = data[0];
        }
      } else if (typeof data === "object" && data !== null) {
        // Case 3: single form object
        formData = data;
      }

      if (formData && Array.isArray(formData.questions)) {
        setForm(formData);
      } else {
        setError("No consent form questions found.");
      }
    } catch (err: any) {
      console.error("❌ Error fetching consent form:", err);
      setError("Failed to load consent form.");
    } finally {
      setLoading(false);
    }
  };

  fetchConsentForm();
}, [appointmentType, consultationId, treatmentId, initialStatus]);



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

      console.log("🟡 Starting upload...");
      console.log("Customer ID:", id);
      console.log("Consultation ID:", consultationId);
      console.log("Treatment ID:", treatmentId);
      console.log("Appointment Type:", appointmentType);
      console.log("Selected Images:", selectedImages);

      const formData = new FormData();

      // ✅ Append required fields
      formData.append("customerId", id);
      formData.append("formType", appointmentType); // 🔥 Required field (Consultation/Treatment)

      if (appointmentType === "Treatment") {
        // 👇 Treatment mode — send consultationId as 0
        formData.append("consultationId", "0");
        formData.append("treatmentId", treatmentId?.toString() || "0");
      } else if (appointmentType === "Consultation") {
        // 👇 Consultation mode — send treatmentId as 0
        formData.append("consultationId", consultationId?.toString() || "0");
        formData.append("treatmentId", "0");
      } else {
        console.warn("⚠️ Unknown appointmentType:", appointmentType);
        formData.append("consultationId", "0");
        formData.append("treatmentId", "0");
      }

      // ✅ Append files (field name should be "files")
      selectedImages.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `photo_${index}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        console.log(`🖼️ Adding file #${index + 1}:`, {
          uri,
          name: filename,
          type,
        });

        formData.append("files", {
          uri,
          name: filename,
          type,
        } as any);
      });

      // 🧾 Log full FormData content (debug)
      console.log("🧾 FormData contents:");
      (formData as any)._parts?.forEach((p: any) => console.log("👉", p[0], "=", p[1]));

      // ✅ Upload to API
      const response = await api.post("/ConcentForm/upload/Concentform", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("✅ Upload successful:", response.data);
      Alert.alert("Success", "Photos uploaded successfully!");

      setUploadModalVisible(false);
      setSelectedImages([]);

      // ✅ Navigate next
      if (appointmentType === "Treatment") {
        navigation.navigate("StartTreatment", {
          formData: { customerId: id, consultationId: 0, treatmentId },
        });
      } else {
        navigation.navigate("Startconsultation", {
          customerId: id,
          consultationId,
        });
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      if (error.response) {
        console.log("🔴 Server responded with:", error.response.data);
        console.log("🔴 Status code:", error.response.status);
        console.log("🔴 Headers:", error.response.headers);
      } else if (error.request) {
        console.log("⚠️ No response received:", error.request);
      } else {
        console.log("💥 Error creating request:", error.message);
      }
      Alert.alert("Error", "Failed to upload photos");
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
        <View className="flex-row items-center justify-between mb-6 mt-[10%]">
          <Text className="text-xl font-bold">{form?.formName}</Text>
          <TouchableOpacity
            onPress={() => setViewFormModalVisible(true)}
            className="bg-primary px-4 py-2 rounded-lg"
          >
            <Text className="text-white font-semibold">View Forms</Text>
          </TouchableOpacity>
        </View>

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
              Download PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUploadModalVisible(true)}
            className="flex-1 bg-primary py-4 rounded-xl ml-2"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Submit
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
                  {uploading ? "Uploading..." : "Upload"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------ View Form Images Modal (UPDATED) ------------------ */}
{/* ------------------ View Form Images Modal (UPDATED) ------------------ */}
<Modal
  visible={viewFormModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setViewFormModalVisible(false)}
>
  <View className="flex-1 bg-black/60 justify-center items-center px-5">
    <View className="bg-white w-full rounded-2xl p-6 max-h-[85%]">

      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-semibold">View Form Images</Text>
        <TouchableOpacity
          onPress={() => setViewFormModalVisible(false)}
          className="p-2"
        >
          <X size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Dropdowns */}
<View className="mb-4">
  <Text className="text-gray-700 mb-1 font-medium">View Form Images</Text>

  {/* Two side-by-side dropdowns */}
  <View className="flex-row justify-between">
    {/* Form Type Picker */}
    <View className="flex-1 border border-gray-300 rounded-lg mr-2">
      <Picker
        mode="dropdown"
        selectedValue={formType}
        onValueChange={(value) => {
          setFormType(value);
          fetchFilledForms(value);
        }}
      >
        <Picker.Item label="Form Type" value="" />
        <Picker.Item label="Consultation" value="Consultation" />
        <Picker.Item label="Treatment" value="Treatment" />
      </Picker>
    </View>

    {/* Date Picker */}
    <View className="flex-1 border border-gray-300 rounded-lg ml-2">
      <Picker
        mode="dropdown"
        selectedValue={selectedDate}
        enabled={availableForms.length > 0}
        onValueChange={(value) => {
          setSelectedDate(value);
          const selected = availableForms.find((f) => f.date === value);
          setFormImages(selected?.pdfLocations || []);
        }}
      >
        <Picker.Item
          label={
            availableForms.length > 0
              ? "Select Date"
              : "No forms available"
          }
          value=""
        />
        {availableForms.map((f, idx) => (
          <Picker.Item key={idx} label={f.date} value={f.date} />
        ))}
      </Picker>
    </View>
  </View>
</View>


      {/* Images Scroll */}
      <ScrollView
        className="mt-3"
        contentContainerStyle={{ alignItems: "center" }}
      >
        {loadingForms ? (
          <ActivityIndicator size="large" color="#0D6EFD" />
        ) : formImages.length > 0 ? (
          formImages.map((uri, index) => (
            <Image
              key={index}
              source={{ uri }}
              className="w-72 h-96 rounded-xl mb-4"
              resizeMode="contain"
            />
          ))
        ) : (
          <Text className="text-gray-500 mt-4">
            No images available for selected date.
          </Text>
        )}
      </ScrollView>

      {/* Acceptance Checkbox */}
      <View className="flex-row items-center mt-2 mb-3">
        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          className="w-6 h-6 border-2 border-gray-400 rounded-md mr-2 items-center justify-center"
        >
          {accepted && <View className="w-3.5 h-3.5 bg-primary rounded-sm" />}
        </TouchableOpacity>
        <Text className="flex-1 text-gray-700">
          I have read the consent form and accept it.
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        disabled={!accepted}
        onPress={() => setViewFormModalVisible(false)}
        className={`py-3 rounded-xl mt-3 ${accepted ? "bg-primary" : "bg-gray-300"}`}
      >
        <Text className={`text-center font-semibold ${accepted ? "text-white" : "text-gray-500"}`}>
          Submit
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


      <Navbar />
    </View>
  );
};

export default ConcentFill;
