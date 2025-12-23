import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";

interface CustomDropdownProps {
  data: string[];
  value: string | null | undefined;
  onSelect: (value: string) => void;
  placeholder: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  data,
  value,
  onSelect,
  placeholder,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Dropdown Button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          width: "100%",
          height: 50,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          backgroundColor: "#fff",
          justifyContent: "center",
          paddingHorizontal: 10,
        }}
      >
        <Text>{value || placeholder}</Text>
      </TouchableOpacity>

      {/* Modal List */}
      <Modal transparent animationType="fade" visible={open}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          onPress={() => setOpen(false)}
        />

        <View
          style={{
            position: "absolute",
            top: "30%",
            left: "10%",
            width: "80%",
            backgroundColor: "#fff",
            borderRadius: 12,
            paddingVertical: 10,
            maxHeight: 300,
          }}
        >
          <ScrollView>
            {data.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                }}
              >
                <Text>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default CustomDropdown;
