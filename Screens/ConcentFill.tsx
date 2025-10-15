import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import api from "../API/api"; // your axios instance

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

//Define the data received from the api
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

  // Store user responses dynamically
  const [answers, setAnswers] = useState<{ [questionId: number]: string | string[] }>({});

  // ✅ Dynamically load form based on appointmentType
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
          setForm(data[0]); // take the first form
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

const handleNext = async () => {
  const hasAtLeastOneAnswer = Object.values(answers).some(
    (answer) =>
      (typeof answer === "string" && answer.trim() !== "") ||
      (Array.isArray(answer) && answer.length > 0)
  );

  if (!hasAtLeastOneAnswer) {
    Alert.alert("Incomplete Form", "Please fill in at least one question before submitting.");
    return;
  }

Alert.alert("Download PDF?", "Do you want to download the PDF before proceeding?", [
  {
    text: "No",
    onPress: async () => {
      try {
        const payload = Object.entries(answers)
          .map(([questionId, answer]) => {
            const question = form?.questions.find((q) => q.id === Number(questionId));
            if (!question) return null;

            const isChild = question.parentQuestionId != null;

            if (appointmentType === "Consultation") {
              return {
                mainQuestionId: isChild ? (question.parentQuestionId as number) : question.id,
                subQuestionId: isChild ? question.id : 0,
                customerId: id,
                answerDescription: Array.isArray(answer) ? answer.join(", ") : answer,
                consultationId,
                enteredBy: 0,
              };
            } else if (appointmentType === "Treatment") {
              return {
                mainQuestionId: isChild ? (question.parentQuestionId as number) : question.id,
                subQuestionId: isChild ? question.id : 0,
                customerId: id,
                answerDescription: Array.isArray(answer) ? answer.join(", ") : answer,
                treatmentId,
                enteredBy: 0,
              };
            }

            return null;
          })
          .filter(Boolean);

        const endpoint =
          appointmentType === "Treatment"
            ? "/ConcentForm/Treatment/Answers"
            : "/Consultation/Consultation/Answers";

        await api.post(endpoint, payload);

        // ✅ Correct navigation for consultation vs treatment
        if (appointmentType === "Treatment") {
          navigation.navigate("StartTreatment", { formData: { customerId: id, consultationId, treatmentId, answers } });
        } else {
          navigation.navigate("Startconsultation", { customerId: id, consultationId });
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to submit answers");
      }
    },
    style: "cancel",
  },
  {
    text: "Yes",
    onPress: async () => {
      try {
        // Generate and share PDF
        const htmlContent = `
          <h2 style="text-align:center;">${form?.formName}</h2>
          ${form?.questions
            .map((q) => {
              const answer = answers[q.id] || "";
              if (q.inputType === "text" || q.inputType === "radio") {
                return `<p><strong>${q.questionText}</strong>: ${answer}</p>`;
              } else if (q.inputType === "choice") {
                const choiceAnswers = Array.isArray(answer) ? answer : [answer].filter(Boolean);
                return `<p><strong>${q.questionText}</strong>: ${choiceAnswers.join(", ")}</p>`;
              }
              return "";
            })
            .join("")}
        `;

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);

        // Build payload again
        const payload = Object.entries(answers)
          .map(([questionId, answer]) => {
            const question = form?.questions.find((q) => q.id === Number(questionId));
            if (!question) return null;

            const isChild = question.parentQuestionId != null;

            if (appointmentType === "Consultation") {
              return {
                mainQuestionId: isChild ? (question.parentQuestionId as number) : question.id,
                subQuestionId: isChild ? question.id : 0,
                customerId: id,
                answerDescription: Array.isArray(answer) ? answer.join(", ") : answer,
                consultationId,
                enteredBy: 1,
              };
            } else if (appointmentType === "Treatment") {
              return {
                mainQuestionId: isChild ? (question.parentQuestionId as number) : question.id,
                subQuestionId: isChild ? question.id : 0,
                customerId: id,
                answerDescription: Array.isArray(answer) ? answer.join(", ") : answer,
                treatmentId,
                enteredBy: 1,
              };
            }

            return null;
          })
          .filter(Boolean);

        const endpoint =
          appointmentType === "Treatment"
            ? "/ConcentForm/Treatment/Answers"
            : "/Consultation/Consultation/Answers";

        await api.post(endpoint, payload);

        // ✅ Correct navigation after PDF
        if (appointmentType === "Treatment") {
          navigation.navigate("StartTreatment", { formData: { customerId: id, consultationId, treatmentId, answers } });
        } else {
          navigation.navigate("Startconsultation", { customerId: id, consultationId });
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to generate PDF or submit answers");
      }
    },
  },
]);

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

              {/* Render child questions */}
{form.questions
  .filter((child) => child.parentQuestionId === parent.id)
  .map((child) => {
    const parentAnswer = answers[parent.id];

    // ✅ Show logic:
    // - If child.optionId exists → show only if user selected that specific option.
    // - If child.optionId is null → show always.
    let shouldShow = false;

    if (child.optionId) {
shouldShow =
  typeof parentAnswer === "string" &&
  (parent.options?.some(
    (opt) =>
      opt.id === child.optionId &&
      opt.optionText === parentAnswer
  ) || false);
    } else {
      shouldShow = true; // no specific option required → show always
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
            onChangeText={(text) =>
              handleTextChange(child.id, text)
            }
          />
        )}

        {child.inputType === "radio" &&
          child.options?.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              className="flex-row items-center mb-2"
              onPress={() =>
                handleRadioSelect(child.id, opt.optionText)
              }
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
              onPress={() =>
                handleChoiceToggle(child.id, opt.optionText)
              }
            >
              <View
                className={`w-5 h-5 border-2 rounded mr-2 ${
                  ((answers[child.id] as string[]) || []).includes(
                    opt.optionText
                  )
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

        <TouchableOpacity onPress={handleNext} className="bg-primary rounded-xl py-4 mb-10">
          <Text className="text-white text-center font-semibold text-lg">Submit →</Text>
        </TouchableOpacity>
      </ScrollView>

      <Navbar />
    </View>
  );
};

export default ConcentFill;
