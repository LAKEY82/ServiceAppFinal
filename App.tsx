import { Text, View } from "react-native";
import './global.css';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Splash from "./Screens/Splash";
import Login from "./Screens/Login";
import dashboard from "./Screens/dashboard";
import ConcentFill from "./Screens/ConcentFill";
import Startconsultation from "./Screens/Startconsultation";
import AfterConsultation from "./Screens/AfterConsultation";
import Appoinments from "./Screens/Appoinments";
import Profile from "./Screens/Profile";
import StartTreatment from "./Screens/StartTreatment";
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Dashboard:undefined;
  ConcentFill:undefined;
  Startconsultation:undefined;
  AfterConsultation:undefined;
  Appoinments:undefined;
  Profile:undefined;
  StartTreatment:undefined;

};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Splash" options={{ headerShown: false }} component={Splash} />
        <Stack.Screen name="Login" options={{ headerShown: false }} component={Login} />
        <Stack.Screen name="Dashboard" options={{ headerShown: false }} component={dashboard} />
        <Stack.Screen name="ConcentFill" options={{ headerShown: false }} component={ConcentFill} />
        <Stack.Screen name="Startconsultation" options={{ headerShown: false }} component={Startconsultation} />
        <Stack.Screen name="StartTreatment" options={{ headerShown: false }} component={StartTreatment} />
        <Stack.Screen name="AfterConsultation" options={{ headerShown: false }} component={AfterConsultation} />
        <Stack.Screen name="Appoinments" options={{ headerShown: false }} component={Appoinments} />
        <Stack.Screen name="Profile" options={{ headerShown: false }} component={Profile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
