import { View, Text, TextInput, TouchableOpacity, ImageBackground, Alert, ActivityIndicator } from "react-native";
import React, { useState } from "react";
import { Lock, Eye, EyeOff, User } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import api from "../API/api"; // 👈 import the Axios instance
import AsyncStorage from '@react-native-async-storage/async-storage';


type RootStackParamList = {
  Login: undefined;
   Dashboard: {
    branchEmployeeId: number;
    roleId: number;
    supervisorSmid: number | null;
    token: string;
    userId: number;
    userName: string;
  };
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<LoginScreenNavigationProp>();

const handleLogin = async () => {
  if (!username || !password) {
    Alert.alert("Error", "Please enter username and password.");
    return;
  }

  setLoading(true);
  try {
    const response = await api.post("/User/login", {
      username,
      password,
    });

    setLoading(false);

    if (response.data && response.data.token) {
      console.log("Login success:", response.data);

      // Destructure the response values
      const { branchEmployeeId, roleId, supervisorSmid, token, userId, userName } =
        response.data;

      // Save login response to AsyncStorage
      await AsyncStorage.setItem(
        "userData",
        JSON.stringify({ branchEmployeeId, roleId, supervisorSmid, token, userId, userName })
      );

      // Navigate and pass params
      navigation.navigate("Dashboard", {
        branchEmployeeId,
        roleId,
        supervisorSmid,
        token,
        userId,
        userName,
      });
    } else {
      Alert.alert("Login Failed", response.data.message || "Invalid credentials");
    }
  } catch (error: any) {
    setLoading(false);
    console.error("Login error:", error.response?.data || error.message);
    Alert.alert(
      "Login Error",
      error.response?.data?.message || "Something went wrong"
    );
  }
};



  return (
    <ImageBackground
      source={require("../assets/Login.png")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View className="flex-1 px-6 justify-center bg-black/40">
        <Text className="text-white text-2xl font-bold text-center mb-8">
          Log in to your {"\n"} Account
        </Text>

        <View className="bg-white rounded-xl px-4 py-3 mb-4 flex-row items-center">
          <User size={20} color="#666" className="mr-2" />
          <TextInput
            placeholder="User Name"
            placeholderTextColor="#999"
            className="flex-1 text-base text-black"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View className="bg-white rounded-xl px-4 py-3 mb-6 flex-row items-center">
          <Lock size={20} color="#666" className="mr-2" />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#999"
            className="flex-1 text-base text-black"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-secondary rounded-xl py-4"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className="text-black text-center font-semibold text-lg">
              Log In
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

export default Login;
