import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  FlatList,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../API/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RootStackParamList = {
  Dashboard: {
    branchEmployeeId: number;
    roleId: number;
    supervisorSmid: number | null;
    token: string;
    userId: number;
    fullName: string;
    doctorId: string;
    beforePhotoStatus?: string;
  };
  ConcentFill: {
    id: string;
    consultationId: number;
    appointmentType: string;
    treatmentId: string;
    initialStatus: string;
    TreatmentAppointmentId: number;
    consultationAppointmentId: number;
    beforePhotoStatus?: string;
  };
  Profile: { id: string };
  StartTreatment: { customerId: string; consultationId: number };
  Appoinments: {
  customerId: string;
  treatmentId: string;
  fromPage: string;
};

};

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Dashboard"
>;
type DashboardRouteProp = RouteProp<RootStackParamList, "Dashboard">;

const Dashboard = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [userData, setUserData] = useState<
    RootStackParamList["Dashboard"] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewType, setViewType] = useState<"consultation" | "treatment">(
    "consultation"
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const route = useRoute<DashboardRouteProp>();
  const [roleId, setRoleId] = useState<number | null>(null);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      // await AsyncStorage.removeItem("treatmentAppointmentId");
      // await AsyncStorage.removeItem("consultationAppointmentId");

      if (route.params) {
        setUserData(route.params);
      } else {
        try {
          const storedData = await AsyncStorage.getItem("userData");
          if (storedData) {
            setUserData(JSON.parse(storedData));
          } else {
            navigation.navigate("Login" as never);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      }

      // ✅ Load the saved roleId
      const storedRoleId = await AsyncStorage.getItem("roleId");
      if (storedRoleId) {
        setRoleId(Number(storedRoleId));
        console.log("✅ Loaded roleId:", storedRoleId);
      }
    };
    loadUserData();
  }, [route.params, navigation]);

  //Set default treatment for roles 20 and 21 therapist and nurse
//Set default view for specific roles
useEffect(() => {
  if (roleId === 20 || roleId === 21) {
    setViewType("treatment"); // therapist/nurse → Treatment
  } else if (roleId === 19) {
    setViewType("consultation"); // supervisor → Consultation only
  }
}, [roleId]);


// Fetch consultations + treatments independently
useEffect(() => {
  const fetchData = async () => {
    // 🚫 Do not fetch until BOTH are ready
    if (!userData || roleId === null) {
      console.log("⏳ Waiting for userData and roleId...");
      return;
    }

    const numericRoleId = Number(roleId);
    const supervisorSmidNum = Number(userData.supervisorSmid);
    const branchEmployeeIdNum = Number(userData.branchEmployeeId);

    try {
      // ================== LOAD REQUIRED STORAGE VALUES ==================
      const storedBranchId = await AsyncStorage.getItem("branchId");
      console.log("🔹 Stored branchId:", storedBranchId);

      const branchIdNum = storedBranchId ? Number(storedBranchId) : null;

      if (!branchIdNum) {
        console.warn("🚫 branchId missing — skipping fetch");
        return;
      }

      // ================== CONSULTATION FETCH ==================
try {
  let consultationEndpoint: string;

  // ✅ Admin roles → fetch ALL consultations
  if (numericRoleId === 8 || numericRoleId === 15) {
    consultationEndpoint = "/TreatmentAppointment/consultation/All";
  } else {
    // 👤 Other roles → fetch by branch employee
    consultationEndpoint = `/TreatmentAppointment/consultation/${branchEmployeeIdNum}`;
  }

  console.log("📡 Fetching Consultations:", consultationEndpoint);

  const consultationRes = await api.get(consultationEndpoint);

  const consultationsWithId = (consultationRes.data || []).map(
    (item: any) => ({
      ...item,
      consultationAppointmentId: item.id,
    })
  );

  const filteredConsultations = [17,19, 20, 21].includes(numericRoleId)
    ? consultationsWithId.filter(
        (item: any) =>
          (item.initialStatus === true ||
            item.initialStatus === "filled") &&
          item.consentStatus?.toLowerCase() === "complete"
      )
    : consultationsWithId;

  setConsultations(filteredConsultations);
  console.log("🟢 Consultations loaded:", filteredConsultations.length);
} catch (err: any) {
  console.warn(
    "⚠️ Consultation fetch failed:",
    err?.response?.data || err
  );
  setConsultations([]);
}

      // ================== TREATMENT FETCH ==================
      let treatmentEndpoint: string | null = null;

      if (numericRoleId === 8 || numericRoleId === 15) {
        // Admin
        treatmentEndpoint = "/TreatmentAppointment/treatment/All";

      } else if (numericRoleId === 17) {
        // Branch Employee
        treatmentEndpoint = `/TreatmentAppointment/treatment/${branchEmployeeIdNum}`;

      } else if (numericRoleId === 21) {
        // ✅ Therapist
        treatmentEndpoint = `/TreatmentAppointment/treatment/therapist/${branchEmployeeIdNum}`;

      } else if ([19, 20].includes(numericRoleId)) {
        // Supervisor / Nurse
        treatmentEndpoint = `/TreatmentAppointment/treatment/${supervisorSmidNum}`;
      }

      if (!treatmentEndpoint) {
        console.warn("🚫 Treatment endpoint not resolved for role:", numericRoleId);
        return;
      }

      try {
        console.log("📡 Fetching Treatments:", treatmentEndpoint);

        const treatmentRes = await api.get(treatmentEndpoint);

        const treatmentsWithId = (treatmentRes.data || []).map(
          (item: any) => ({
            ...item,
            treatmentAppointmentId: item.id,
          })
        );

        console.log("📊 Treatments fetched:", treatmentsWithId.length);

        // ✅ Branch filter (SKIP for role 17 & 21)
        const roleAwareTreatments =
          numericRoleId === 17 || numericRoleId === 21
            ? treatmentsWithId
            : treatmentsWithId.filter(
                (t: any) => Number(t.branchId) === branchIdNum
              );

        console.log(
          "📌 After role-based branch filter:",
          roleAwareTreatments.length
        );

        // ✅ Status / consent filter (SKIP for role 21)
        // ✅ Status / consent filter for Nurse (20) & Therapist (21)
const filteredTreatments =
  [17,19,20, 21].includes(numericRoleId)
    ? roleAwareTreatments.filter(
        (item: any) =>
          (item.initialStatus === true ||
            String(item.initialStatus).toLowerCase() === "filled") &&
          String(item.consentStatus).toLowerCase() === "complete"
      )
    : roleAwareTreatments;


        setTreatments(filteredTreatments);
        console.log("🎯 FINAL TREATMENTS:", filteredTreatments.length);
      } catch (err: any) {
        console.error(
          "❌ Treatment fetch failed:",
          err?.response?.data || err
        );
        setTreatments([]);
      }
    } catch (err) {
      console.error("❌ Unexpected fetch error:", err);
    }
  };

  fetchData();
}, [userData, roleId]);




  const visibleList = viewType === "consultation" ? consultations : treatments;

  // Filter by status
  // 🟢 Normalize the entryStatus before comparing
  const normalizeStatus = (status?: string) =>
    status ? status.trim().toLowerCase().replace(/\s+/g, "") : "";

  // 🟡 Filter list by normalized entryStatus
  const statusFilteredAppointments = visibleList.filter((item) => {
    if (!selected) return true;

    const status = normalizeStatus(item.entryStatus);

    if (selected === "Active") return status === "active";
    if (selected === "Ongoing")
      return status === "ongoing" || status === "ongoing";
    if (selected === "Completed") return status === "completed";

    return true;
  });

  // Filter by search
  const filteredAppointments = statusFilteredAppointments.filter((item) => {
    const fullName = `${item.customerFName ?? ""} ${
      item.customerLName ?? ""
    }`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const buttons = ["Active", "Ongoing", "Completed"];

  // 🟡 Define VIP badge colors
  const getBadgeStyle = (type: string | null | undefined) => {
    switch (type?.toUpperCase()) {
      case "VVIP":
        return { backgroundColor: "#ffbb00" }; // Gold
      case "VIP":
        return { backgroundColor: "#00bd1c" }; // Green
      case "TOP-SPENDER":
        return { backgroundColor: "#C0C0C0" }; // Silver
      case "LOYAL":
        return { backgroundColor: "#0077A8" }; // Primary blue
      default:
        return null; // No badge for Non-VIP
    }
  };

  //Save the appoinmentIds into the async storage
  const saveAppointmentId = async (
    type: "treatment" | "consultation",
    id: number
  ) => {
    try {
      if (type === "treatment") {
        await AsyncStorage.setItem("treatmentAppointmentId", id.toString());
        await AsyncStorage.removeItem("consultationAppointmentId"); // remove the other type
      } else {
        await AsyncStorage.setItem("consultationAppointmentId", id.toString());
        await AsyncStorage.removeItem("treatmentAppointmentId"); // remove the other type
      }
    } catch (err) {
      console.log("Error saving appointment ID:", err);
    }
  };

  const saveDoctorName = async (type: string, name: string) => {
    await AsyncStorage.setItem(`${type}_doctorName`, name);
  };
  const getFullImageUrl = (path?: string) => {
    const BASE_URL = "https://chrimgtapp.xenosyslab.com/"; // update this
    if (!path) {
      console.log("🟠 No image path found, using default placeholder");
      return "https://i.sstatic.net/l60Hf.png";
    }

    const fullUrl = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    console.log("🟢 Full Image URL:", fullUrl); // ✅ Added log
    return fullUrl;
  };
  // 🟣 Handle card press
const handleCardPress = async (item: any) => {
  // 🟢 Role 20 & 21 → Treatment → beforePhotoStatus = taken → Go to Appointments only for therapist and Nuse
  if (
    viewType === "treatment" &&
    (roleId === 20 || roleId === 21) &&
    (item.beforePhotoStatus?.toLowerCase() === "taken" ||
      item.photoStatus?.toLowerCase() === "taken")
  ) {
    // 🔵 Save the ID BEFORE navigating
await saveAppointmentId("treatment", item.treatmentAppointmentId);
    navigation.navigate("Appoinments", {
      customerId: item.customerId?.toString() ?? "",
      treatmentId: item.treatmentId?.toString() ?? "",
      fromPage: "Dashboard",
    });
    return;
  }

  // Save IDs
  if (item.treatmentAppointmentId) {
    await saveAppointmentId("treatment", item.treatmentAppointmentId);
    await saveDoctorName("treatment", item.doctorName);
  } else if (item.consultationAppointmentId) {
    await saveAppointmentId("consultation", item.consultationAppointmentId);
  }

  const profilePic = item.profilePicture ?? item.ProfilePicture ?? null;

  if (!profilePic) {
    setSelectedCustomer(item);
    setModalVisible(true);
  } else {
    navigateToConcentFill(item);
  }
};


  const navigateToConcentFill = (item: any) => {
    navigation.navigate("ConcentFill", {
      id: item.customerId?.toString() ?? "",
      consultationId: item.departmentId ?? 2,
      treatmentId: item.treatmentId ?? 24,
      appointmentType: item.appointmentType ?? "Consultation",
      initialStatus: item.initialStatus,
      TreatmentAppointmentId: item.treatmentAppointmentId,
      beforePhotoStatus:item.beforePhotoStatus,
      consultationAppointmentId: item.consultationAppointmentId, // ✅ pass new key
    });
  };

  //Treatment or Consultation card values render definition
const renderCard = ({ item }: { item: any }) => {
  // 🔹 Initial
const hasInitialForm =
  item.initialStatus === true ||
  String(item.initialStatus).toLowerCase() === "filled";
  // 🔹 Daily (Consent complete – case insensitive)
const hasDailyForm =
  String(item.consentStatus).toLowerCase() === "complete";

// 🔹 Photos (any photo taken)
const hasPhotos =
  String(item.photoStatus).toLowerCase() === "taken" ||
  String(item.beforePhotoStatus).toLowerCase() === "taken" ||
  String(item.afterPhotoStatus).toLowerCase() === "taken";

  const hasBeforePhoto =
    item.photoStatus?.toLowerCase() === "taken" ||
    item.beforePhotoStatus === "taken";
  const hasAfterPhoto = item.afterPhotoStatus?.toLowerCase() === "taken";

  // ✅ Fill Daily if consentStatus is complete
  const hasTreatmentForm =
    item.consentStatus?.toLowerCase() === "complete";

  const badgeStyle = getBadgeStyle(item.customerType);

  return (
    <TouchableOpacity
      className="bg-secondary rounded-2xl p-4 m-1"
      onPress={() => handleCardPress(item)}
      style={{
        width: "48%",
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
          android: { elevation: 3 },
        }),
      }}
    >
      <View className="items-center">
        <Image
          source={{ uri: getFullImageUrl(item.profilePicture) }}
          className="w-16 h-16 rounded-full mb-2"
        />
        {badgeStyle && (
          <View
            className="absolute top-2 right-2 px-2 py-1 rounded-full"
            style={badgeStyle}
          >
            <Text className="text-white text-xs font-bold uppercase">
              {item.customerType}
            </Text>
          </View>
        )}
        <Text className="text-base font-bold text-center">
          {item.customerFName ?? "Unknown"} {item.customerLName ?? ""}
        </Text>
        <Text className="text-gray-700 text-center">
          {item.appointmentType ?? viewType}
        </Text>
        <Text
          className="text-gray-700 text-center"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {/* Dr. {item.doctorName ?? viewType} */}
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("Profile", {
              id: item.customerId?.toString() ?? "",
            })
          }
          className="bg-primary px-3 py-2 rounded-lg mt-2"
        >
          <Text className="text-white text-sm">View Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View className="mt-3">
        <View className="flex-row justify-between mt-2">
          {[0, 1, 2].map((level) => {
  let filled = false;

  if (level === 0) filled = hasInitialForm;   // Initial
  else if (level === 1) filled = hasDailyForm; // Daily
  else if (level === 2) filled = hasPhotos;    // Photos

            return (
              <View
                key={level}
                style={{
                  flex: 1,
                  height: 6,
                  marginHorizontal: 2,
                  borderRadius: 10,
                  backgroundColor: filled ? "#00853E" : "#E0E0E0",
                }}
              />
            );
          })}
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-[10px] text-gray-600">Initial</Text>
          <Text className="text-[10px] text-gray-600">Daily</Text>
          <Text className="text-[10px] text-gray-600">Photos</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};


  if (!userData) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500 text-lg">Loading user data...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* 🟣 Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40">
          <View className="bg-white rounded-2xl p-6 w-[80%] items-center">
            <Text className="text-lg font-bold mb-4 text-center text-black">
              You haven’t updated your profile pic
            </Text>
            <View className="flex-row justify-between w-full">
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Profile", {
                    id: selectedCustomer?.customerId?.toString() ?? "",
                  });
                }}
                className="bg-[#0077A8] flex-1 mr-2 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">
                  Change
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  if (selectedCustomer) navigateToConcentFill(selectedCustomer);
                }}
                className="bg-gray-300 flex-1 ml-2 py-3 rounded-xl"
              >
                <Text className="text-black text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-1 mt-[20%] mx-[5%]">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold">
            Hi,{" "}
            {userData?.fullName?.length > 10
              ? `${userData.fullName.substring(0, 10)}...`
              : userData?.fullName}{" "}
            👋
          </Text>

          <View className="flex-row bg-[#E0F7FF] rounded-full p-1 w-[220px] h-[46px]">
            {/* 🟣 Consultation toggle — disabled for Role 20 & 21 for therapist and nurse */}
            {/* Consultation toggle */}
<TouchableOpacity
  onPress={() => {
    // ✅ Disable for role 20, 21 → locked to Treatment
    // ✅ Disable for role 19 → locked to Consultation
    if (roleId !== 20 && roleId !== 21 && roleId !== 19) {
      setViewType("consultation");
    }
  }}
  disabled={roleId === 20 || roleId === 21 || roleId === 19}
  activeOpacity={roleId === 20 || roleId === 21 || roleId === 19 ? 1 : 0.7}
  className={`flex-1 justify-center items-center rounded-full ${
    viewType === "consultation" ? "bg-[#0077A8]" : ""
  } ${roleId === 20 || roleId === 21 || roleId === 19 ? "opacity-50" : ""}`}
>
  <Text
    style={{
      color: viewType === "consultation" ? "#DBF7FF" : "#007697",
      fontWeight: "700",
      fontSize: 14,
    }}
  >
    Consultation
  </Text>
</TouchableOpacity>

{/* Treatment toggle */}
{/* Treatment toggle */}
<TouchableOpacity
  onPress={() => {
    if (roleId !== 19) setViewType("treatment"); // role 19 cannot access treatment
  }}
  activeOpacity={roleId === 19 ? 1 : 0.7}
  className={`flex-1 justify-center items-center rounded-full ${
    viewType === "treatment" ? "bg-[#0077A8]" : ""
  } ${roleId === 19 ? "opacity-50" : ""}`} // visually disabled
>
  <Text
    style={{
      color: viewType === "treatment" ? "#fff" : "#007697",
      fontWeight: "700",
      fontSize: 14,
    }}
  >
    Treatment
  </Text>
</TouchableOpacity>


          </View>
        </View>

        {/* Search */}
        <View className="bg-gray-100 rounded-xl px-3 py-2 mb-10">
          <TextInput
            placeholder="Search by client name"
            placeholderTextColor="#888"
            className="text-base text-black"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Status Buttons */}
        <View className="flex-row justify-between mb-4">
          {buttons.map((btn, index) => (
            <TouchableOpacity
              activeOpacity={1}
              key={index}
              onPress={() => setSelected(selected === btn ? null : btn)}
              className={`px-4 py-4 rounded-lg w-[32%] bg-white h-20`}
              style={{
                borderWidth: selected === btn ? 2 : 0,
                borderColor: selected === btn ? "#0D6EFD" : "transparent",
                ...Platform.select({
                  ios: {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                  },
                  android: { elevation: 5 },
                }),
              }}
            >
              <View className="flex-col items-center justify-center">
                <Text className="text-black text-center font-semibold">
                  {btn}
                </Text>
                <Text className="text-gray-500 text-center text-sm">
                  {
                    visibleList.filter((item) => {
                      const status = normalizeStatus(item.entryStatus);

                      if (btn === "Active") return status === "active";
                      if (btn === "Ongoing")
                        return status === "ongoing" || status === "ongoing";
                      if (btn === "Completed") return status === "completed";

                      return false;
                    }).length
                  }
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filteredAppointments}
          renderItem={renderCard}
          keyExtractor={(item, index) =>
            `${item.customerId ?? item.id ?? index}-${index}`
          }
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text className="text-center text-gray-500 mt-10">
              No appointments found
            </Text>
          }
        />
      </View>

      <Navbar />
    </View>
  );
};

export default Dashboard;
