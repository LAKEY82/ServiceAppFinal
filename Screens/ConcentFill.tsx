import {View,Text,TextInput,TouchableOpacity,ScrollView,Alert,ActivityIndicator,Modal,Image,Platform} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import api from "../API/api"; // your axios instance
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import SelectDropdown from "react-native-select-dropdown";
import CustomDropdown from "../components/CustomDropdown ";
import * as ImageManipulator from "expo-image-manipulator";

type RootStackParamList = {
  ConcentFill: {
    id: string;
    consultationId: number;
    appointmentType: string;
    treatmentId?: number; // 👈 added for treatment support
    initialStatus:string;
    treatmentAppointmentId:number;
    consultationAppointmentId:number;
    beforePhotoStatus?:string;
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
  const { id, consultationId,initialStatus,treatmentAppointmentId,consultationAppointmentId,beforePhotoStatus, appointmentType, treatmentId } = route.params;

  console.log("The Params:", route.params);
  //Logg the Async storages
  useEffect(() => {
  const loadSavedIds = async () => {
    try {
      const savedTreatmentId = await AsyncStorage.getItem("treatmentAppointmentId");
      const savedConsultationId = await AsyncStorage.getItem("consultationAppointmentId");
      const roleId = await AsyncStorage.getItem("roleId");
      console.log("The Role ID is:",roleId);
      console.log("✅ Saved TreatmentAppointmentId:", savedTreatmentId); 
      console.log("✅ Saved ConsultationAppointmentId:", savedConsultationId);
      console.log("✅ Params → TreatmentAppointmentId:", treatmentAppointmentId);
      console.log("✅ Params → ConsultationAppointmentId:", consultationAppointmentId);
      console.log("✅ Params → AppointmentType:", appointmentType);
    } catch (error) {
      console.log("⚠️ Error reading AsyncStorage:", error);
    }
  };

  loadSavedIds();
}, []);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string | string[] }>({});
  const [viewFormModalVisible, setViewFormModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  //The Modal and Image Upload States
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [accepted, setAccepted] = useState(false);
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
      // Alert.alert("Error", "Failed to load filled forms.");
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

  //get the consent form based on appointment type and initial status
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
        endpoint = `/ConcentForm/concent/consultation/${2}`;
      } 
      else if (appointmentType === "Treatment") {
        if (!treatmentId) {
          setError("Treatment ID is missing for treatment consent form.");
          setLoading(false);
          return;
        }
        endpoint = `/ConcentForm/concent/treatment/${48}`;
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
            ? { customerId: id, consultationId: consultationAppointmentId || 0 }
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

// compress the image before uploading
const compressImage = async (uri: string) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 900 } }],   // reduce resolution
      {
        compress: 0.6,               // 0–1 (lower = more compression)
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.log("Image compression error: ", error);
    return uri;
  }
};

// Consent Form submission handlers
const submitAnswers = async () => {
  try {
    if (!form) {
      Alert.alert("Error", "Form not loaded.");
      return;
    }

    // 🛡️ Guard: Only allow if AppointmentType is Consultation
    // and both ID fields are populated
    if (appointmentType !== "Consultation") {
      console.log("Blocking submission: Not a Consultation type.");
      return; 
    }

    if (!consultationId || !consultationAppointmentId) {
      Alert.alert("Missing Information", "Cannot submit: Consultation IDs are missing.");
      console.error("ID Validation Failed:", { consultationId, consultationAppointmentId });
      return;
    }

    // Proceed with submission logic
    const roleId = await AsyncStorage.getItem("roleId");
    const userId = await AsyncStorage.getItem("userId");
    const enteredBy = Number(userId || roleId || 0);

    const payload = Object.entries(answers).map(([questionId, value]) => ({
      customerId: id,
      formId: form.id,
      consultationAppoinmentId: consultationAppointmentId, // Using the validated ID
      questionId: Number(questionId),
      answers: Array.isArray(value) ? value.join(", ") : String(value),
      enteredBy,
    }));

    console.log("📤 Submitting Consultation payload:", payload);

    const response = await api.post(
      "/ConcentForm/upload/ConcentAnswers",
      payload
    );

    console.log("✅ Consultation answers submitted:", response.data);
    Alert.alert("Success", "Consultation form submitted successfully!");

  } catch (error: any) {
    console.error("❌ Error submitting consultation answers:", error);
    Alert.alert("Error", "Failed to submit answers");
  }
};

//Text Change handler
  const handleTextChange = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

const openImagePicker = async () => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
  });

  if (!result.canceled) {
    const compressedUri = await compressImage(result.assets[0].uri);
    setSelectedImages(prev => [...prev, compressedUri]);
  }
};

const openCamera = async () => {
  let result = await ImagePicker.launchCameraAsync({
    quality: 1,
  });

  if (!result.canceled) {
    const compressedUri = await compressImage(result.assets[0].uri);
    setSelectedImages(prev => [...prev, compressedUri]);
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
//To pick multiple images in the concent form
const uploadPhotos = async () => {
  if (selectedImages.length === 0) {
    Alert.alert("No photos selected", "Please choose at least one photo.");
    return;
  }

  try {
    setUploading(true);

    const roleId = await AsyncStorage.getItem("roleId");
    const parsedRoleId = Number(roleId);

    console.log("🔵 Role ID during upload:", parsedRoleId);
    console.log("📥 RAW ROUTE PARAMS:", route.params);

    const formData = new FormData();

    // ---------------- BASIC FIELDS ----------------
    console.log("📤 customerId =", id);
    formData.append("customerId", id);

    let uploadFormType = appointmentType;
    if (initialStatus === "notfilled") {
      uploadFormType = "Initial";
    }

    console.log("📤 formType =", uploadFormType);
    formData.append("formType", uploadFormType);

    // ---------------- ID MAPPING (IMPORTANT PART) ----------------
    const rawTreatmentAppointmentId = (route.params as any).TreatmentAppointmentId;

    console.log("🧩 ID SOURCE VALUES");
    console.log("   appointmentType =", appointmentType);
    console.log("   consultationId =", consultationId);
    console.log("   consultationAppointmentId =", consultationAppointmentId);
    console.log("   TreatmentAppointmentId (RAW) =", rawTreatmentAppointmentId);

    let backendConsultationId = "0";
    let backendTreatmentId = "0";

    if (appointmentType === "Treatment") {
      if (!rawTreatmentAppointmentId) {
        throw new Error("TreatmentAppointmentId is missing");
      }
      backendTreatmentId = String(rawTreatmentAppointmentId);
    } else {
      if (!consultationAppointmentId) {
        throw new Error("ConsultationAppointmentId is missing");
      }
      backendConsultationId = String(consultationAppointmentId);
    }

    console.log("📦 FINAL BACKEND IDS");
    console.log("   consultationId →", backendConsultationId);
    console.log("   treatmentId →", backendTreatmentId);

    formData.append("consultationId", backendConsultationId);
    formData.append("treatmentId", backendTreatmentId);

    // ---------------- IMAGES ----------------
    console.log("🖼️ Total images selected:", selectedImages.length);

    selectedImages.forEach((uri, index) => {
      const filename = uri.split("/").pop() || `photo_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      console.log(`📸 Image ${index + 1}`, {
        uri,
        filename,
        type,
      });

      formData.append("files", {
        uri,
        name: filename,
        type,
      } as any);
    });

    // ---------------- FINAL PAYLOAD DUMP ----------------
    console.log("🔥 --- FINAL FORM DATA SENT TO BACKEND ---");
    (formData as any)._parts?.forEach((p: any) => {
      console.log(`➡️ ${p[0]} :`, p[1]);
    });
    console.log("🔥 --- END FORM DATA ---");

    // ---------------- API CALL ----------------
    const response = await api.post(
      "/ConcentForm/upload/Concentform",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    console.log("✅ Upload successful:", response.data);

    // ---------------- UI / NAVIGATION ----------------
    setUploadModalVisible(false);
    setSelectedImages([]);

    if (parsedRoleId === 15 || parsedRoleId === 8) {
      setSuccessModalVisible(true);

    } else if (parsedRoleId === 20 || parsedRoleId === 21) {

      const cleanedStatus = beforePhotoStatus?.toString().trim().toLowerCase();

      if (cleanedStatus === "taken") {
        navigation.navigate("Appoinments");
      } else {
        if (appointmentType === "Treatment") {
          navigation.navigate("StartTreatment", {
            formData: {
              customerId: id,
              consultationId: 0,
              treatmentAppointmentId: rawTreatmentAppointmentId,
            },
          });
        } else {
          navigation.navigate("Startconsultation", {
            customerId: id,
            consultationAppointmentId,
          });
        }
      }

    } else if (parsedRoleId === 17 || parsedRoleId === 19) {

      if (appointmentType === "Treatment") {
        navigation.navigate("StartTreatment", {
          formData: {
            customerId: id,
            consultationId: 0,
            treatmentAppointmentId: rawTreatmentAppointmentId,
          },
        });
      } else {
        navigation.navigate("Startconsultation", {
          customerId: id,
          consultationAppointmentId,
        });
      }

    } else {

      if (appointmentType === "Treatment") {
        navigation.navigate("StartTreatment", {
          formData: {
            customerId: id,
            consultationId: 0,
            treatmentAppointmentId: rawTreatmentAppointmentId,
          },
        });
      } else {
        navigation.navigate("Startconsultation", {
          customerId: id,
          consultationAppointmentId,
        });
      }
    }

  } catch (error: any) {
    console.error("❌ Upload error:", error);

    if (error.response) {
      console.log("🔴 Server response:", error.response.data);
      console.log("🔴 Status code:", error.response.status);
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
  {/* Title on the Left */}
  <Text className="text-xl font-bold">{form?.formName}</Text>

  {/* Button Group on the Right */}
  <View className="flex-row items-center gap-2"> 
    {/* Download Button */}
    <TouchableOpacity
      onPress={() => handleDownloadPDF()} // Replace with your download function
      className="bg-gray-200 px-4 py-2 rounded-lg"
    >
      <Text className="text-black font-semibold">Download</Text>
    </TouchableOpacity>

    {/* View Forms Button */}
    <TouchableOpacity
      onPress={() => setViewFormModalVisible(true)}
      className="bg-primary px-4 py-2 rounded-lg"
    >
      <Text className="text-white font-semibold">View Forms</Text>
    </TouchableOpacity>
  </View>
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
  onPress={submitAnswers}
  className="flex-1 bg-gray-200 py-4 rounded-xl mr-2"
>
  <Text className="text-center font-semibold text-gray-800 text-lg">
    Submit Form
  </Text>
</TouchableOpacity>


          <TouchableOpacity
  onPress={async () => {
    try {
      const roleId = await AsyncStorage.getItem("roleId");
      const parsedRoleId = Number(roleId);

      // 🟡 If RoleId is 20 or 21 → Skip upload modal
      if (parsedRoleId === 20 || parsedRoleId === 21 || parsedRoleId === 17 || parsedRoleId === 19) {
        console.log("🚫 Role 20/21/17/19 → Skipping photo upload.");

        if (appointmentType === "Treatment") {
          navigation.navigate("StartTreatment", {
            formData: { customerId: id, consultationId: 0, treatmentAppointmentId },
          });
        } else {
          navigation.navigate("Startconsultation", {
            customerId: id,
            consultationAppointmentId,
          });
        }
      } else {
        // 🟢 For other roles → open upload modal
        setUploadModalVisible(true);
      }
    } catch (error) {
      console.error("Error checking RoleId:", error);
    }
  }}
  className="flex-1 bg-primary py-4 rounded-xl ml-2"
>
  <Text className="text-white text-center font-semibold text-lg">
    Next
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
import CustomDropdown from "../components/CustomDropdown";

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
      <View className="mb-4 flex-row justify-between">

        {/* Form Type */}
        <View className="flex-1 mr-2">
          <CustomDropdown
            data={["Consultation", "Treatment"]}
            value={formType}
            placeholder="Select Form Type"
            onSelect={(val) => {
              setFormType(val);
              fetchFilledForms(val);
            }}
          />
        </View>

        {/* Date */}
        <View className="flex-1 ml-2">
          <CustomDropdown
            data={availableForms.map((f) => f.date)}
            value={selectedDate}
            placeholder={
              availableForms.length ? "Select Date" : "No forms available"
            }
            onSelect={(date) => {
              setSelectedDate(date);
              const s = availableForms.find((f) => f.date === date);
              setFormImages(s?.pdfLocations || []);
            }}
          />
        </View>
      </View>

      {/* Images */}
      <ScrollView
        className="mt-3"
        contentContainerStyle={{ alignItems: "center" }}
      >
        {loadingForms ? (
          <ActivityIndicator size="large" />
        ) : formImages.length > 0 ? (
          formImages.map((uri, idx) => (
            <Image
              key={idx}
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

      {/* Checkbox */}
      <View className="flex-row items-center mt-2 mb-3">
        <TouchableOpacity
          onPress={() => setAccepted(!accepted)}
          className="w-6 h-6 border-2 border-gray-400 rounded-md mr-2 items-center justify-center"
        >
          {accepted && <View className="w-3.5 h-3.5 bg-primary" />}
        </TouchableOpacity>
        <Text className="flex-1 text-gray-700">
          I have read the consent form and accept it.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        disabled={!accepted}
        onPress={() => setViewFormModalVisible(false)}
        className={`py-3 rounded-xl mt-3 ${
          accepted ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <Text
          className={`text-center font-semibold ${
            accepted ? "text-white" : "text-gray-500"
          }`}
        >
          Submit
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


{/* ✅ SUCCESS MODAL FOR ROLE 24 */}
<Modal
  transparent
  visible={successModalVisible}
  animationType="fade"
  onRequestClose={() => setSuccessModalVisible(false)}
>
  <View className="flex-1 bg-black/50 justify-center items-center px-5">
    <View className="bg-white p-6 rounded-2xl w-[85%] items-center">

      {/* 😊 Success Icon */}
      <View className="w-24 h-24 rounded-full border-4 border-primary justify-center items-center mb-4">
        <Text style={{ fontSize: 50 }}>😊</Text>
      </View>

      <Text className="text-2xl font-bold text-primary mb-2">
        Success!
      </Text>

      <Text className="text-center text-gray-700 mb-6">
        Uploading complete! Your file uploaded successfully.
      </Text>

      <TouchableOpacity
        onPress={() => {
          setSuccessModalVisible(false);
          navigation.navigate("Dashboard" as never);
        }}
        className="bg-primary px-10 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-lg">Continue</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal>

      <Navbar />
    </View>
  );
};

export default ConcentFill;