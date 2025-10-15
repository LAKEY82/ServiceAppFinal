import { View, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import React, { useState } from 'react';
import { Home, LogoutCurve } from 'iconsax-react-nativejs';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../API/api'; // Your Axios instance

type RootStackParamList = {
  Dashboard: undefined;
  Login: undefined;
};

const Navbar = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false); // loader state

  const handleLogout = async () => {
    setLoading(true); // show full-page loader
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('Error', 'No user data found');
        setLoading(false);
        return;
      }

      const { token } = JSON.parse(userData);
      if (!token) {
        Alert.alert('Error', 'No token found');
        setLoading(false);
        return;
      }

      // Call logout API
      await api.post(
        '/User/logout',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Clear AsyncStorage
      await AsyncStorage.removeItem('userData');

      // Navigate to Login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error: any) {
      console.log('Logout error:', error.response || error.message);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false); // hide loader
    }
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={{
        backgroundColor: 'white',
        paddingBottom: insets.bottom,
      }}
    >
      <View className="flex-row justify-around items-center h-16 bg-white">
        <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
          <Home size="32" color="#007697" variant="Bold" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} disabled={loading}>
          <LogoutCurve size="32" color="#555555" variant="Bold" />
        </TouchableOpacity>
      </View>

      {/* Full-page loader */}
      {loading && (
        <Modal transparent animationType="fade" visible={loading}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007697" />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Navbar;
