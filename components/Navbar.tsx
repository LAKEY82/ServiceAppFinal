import { View, TouchableOpacity } from 'react-native';
import React from 'react';
import { Home, LogoutCurve, Profile } from 'iconsax-react-nativejs';
import { useNavigation, NavigationProp } from '@react-navigation/native';

// Define your app's param list (adjust routes as needed)
type RootStackParamList = {
  Dashboard: undefined;
  // Profile: undefined;
  // add other routes here if needed
};

const Navbar = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View className="flex-row justify-around items-center h-16 mb-8 bg-white">
      <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
        <Home size="32" color="#007697" variant="Bold" />
      </TouchableOpacity>

      <TouchableOpacity >
        <Profile size="32" color="#555555" variant="Bold" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => console.log('Logout clicked')}>
        <LogoutCurve size="32" color="#555555" variant="Bold" />
      </TouchableOpacity>
    </View>
  );
};

export default Navbar;
