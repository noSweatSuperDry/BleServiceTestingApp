// Session.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BleManager from 'react-native-ble-manager';
import Target from './Target/target.png';

export default function Session({ route, navigation }) {
  const { peripheralData } = route.params;

  const handleDisconnect = () => {
    // Disconnect from the device
    BleManager.disconnect(peripheralData.id);
    console.log('Disconnecting from the device');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.targetImage}>
        <Image
          style={styles.imageDim}
          resizeMode="contain"
          source={Target}
        />

        <View style={styles.greenRedCircle1}></View>
        <View style={styles.greenRedCircle2}></View>
        <View style={styles.greenRedCircle3}></View>
        <View style={styles.greenRedCircle4}></View>
        <View style={styles.greenRedCircle5}></View>
      </View>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => {
          handleDisconnect();
          navigation.navigate('Device List');
        }}>
        <Text style={styles.buttonText}>
          Disconnect and Look for new device
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
  },
  targetImage: {
    width: '80%',
    height: windowHeight * 0.6, // Adjust this as needed
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageDim: {
    width: '100%',
    height: '100%',
  },
  greenRedCircle1: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'green',
    position: 'absolute',
    top: 229,
    left: 47,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    zIndex:10,
  },
  greenRedCircle2: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'green',
    position: 'absolute',
    top: 229,
    left: 96,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    zIndex:20,
  },
  greenRedCircle3: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'green',
    position: 'absolute',
    top: 229,
    left: 145,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    zIndex:20,
  },
  greenRedCircle4: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'green',
    position: 'absolute',
    top: 229,
    left: 193,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    zIndex:20,
  },
  greenRedCircle5: {
    width: 36,
    height: 36,
    borderRadius: 50,
    backgroundColor: 'green',
    position: 'absolute',
    top: 229,
    left: 243,
    transform: [{ translateX: -10 }, { translateY: -10 }],
    zIndex:20,
  },
});
